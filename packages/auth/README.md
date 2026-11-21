# @usemeshly/auth

Storage-free authentication for usemeshly integrations and any HTTP API you call yourself:

- **`@usemeshly/auth/oauth`**: OAuth 2.0 authorization code flow with PKCE (S256), built on [`oauth4webapi`](https://github.com/panva/oauth4webapi). It includes a token manager that refreshes tokens and saves rotated ones through your own storage.
- **`@usemeshly/auth/basic`**: `Authorization: Basic`, `Authorization: Bearer` and API key headers.
- **`@usemeshly/auth`**: `MeshlyError` and `isMeshlyError`, the error type every usemeshly package throws.

> **Server-side only.** Use it from a backend, a serverless function, a CLI or a desktop app's main process. Never ship it, your client secret or your users' tokens to a browser or mobile bundle. Every function that takes credentials throws `unsupported_environment` in a browser-like runtime. Importing the package for its types doesn't.

The package stores nothing. Tokens go wherever your `save` puts them, and credentials come from you on every call.

## Install

Install the package once. Then import only the subpath for the auth method you need.

| You need | Install | Import from |
| --- | --- | --- |
| OAuth 2.0 (sign in with a provider) | `pnpm add -E @usemeshly/auth` | `@usemeshly/auth/oauth` |
| Basic, Bearer or API key headers | `pnpm add -E @usemeshly/auth` | `@usemeshly/auth/basic` |
| A usemeshly integration (e.g. Google Calendar) | `pnpm add -E @usemeshly/auth @usemeshly/<integration>` | the integration, plus `@usemeshly/auth/oauth` for the token manager |

The package works with `import` and `require`, and requires Node.js 20.3+ (or any runtime with `fetch`, Web Crypto and `AbortSignal.any`).

## OAuth 2.0

### 1. Describe the provider

Integrations export a ready-made descriptor (e.g. `googleOAuthProvider` from `@usemeshly/google-calendar`). For any other provider, write your own:

```ts
import { defineOAuthProvider } from "@usemeshly/auth/oauth";

export const acme = defineOAuthProvider({
  id: "acme",
  issuer: "https://auth.acme.com",
  clientAuth: "client_secret_basic", // or "client_secret_post", or "none" for public clients
  endpoints: {
    authorization: "https://auth.acme.com/oauth/authorize",
    token: "https://auth.acme.com/oauth/token",
  },
  rotatesRefreshToken: true,
});
```

Leave `endpoints` out to read them from the issuer's OIDC discovery document. Call `discoverOAuthProvider(provider)` once and keep the result to skip discovery on later calls. `defineOAuthProvider` validates the descriptor: endpoints must be HTTPS, and `extraAuthParams` can't set parameters the flow controls (`state`, `code_challenge`, `redirect_uri`, …).

### 2. Send the user to the provider

```ts
import { createAuthorizationRequest } from "@usemeshly/auth/oauth";

const client = { clientId: process.env.ACME_CLIENT_ID!, clientSecret: process.env.ACME_CLIENT_SECRET! };
const redirectUri = "https://app.example.com/oauth/acme/callback";

const request = await createAuthorizationRequest(acme, client, {
  scopes: ["openid", "email", "calendar.read"],
  redirectUri,
});

// Keep these server-side (e.g. in the session) until the callback.
session.oauth = { state: request.state, codeVerifier: request.codeVerifier, nonce: request.nonce };
redirect(request.url);
```

`redirectUri` must be HTTPS. Native apps can use `http://127.0.0.1:<port>` or `http://[::1]:<port>` instead (RFC 8252).

### 3. Handle the callback

```ts
import { exchangeCode } from "@usemeshly/auth/oauth";

const tokens = await exchangeCode(acme, client, {
  callbackUrl: incoming.url, // the full URL the provider redirected to (your framework's request URL)
  expectedState: session.oauth.state,
  codeVerifier: session.oauth.codeVerifier,
  expectedNonce: session.oauth.nonce,
  redirectUri,
});
delete session.oauth;

await tokenStore.write(userId, tokens);
```

`exchangeCode` checks `state` before anything is sent, and rejects a mismatch with `invalid_state`. When `openid` was requested, it also validates the ID token's issuer, audience, expiry and nonce.

### 4. Get access tokens

`createTokenManager` reads tokens with your `load` on every call. When the access token is about to expire, it refreshes it and calls your `save` **before** handing out the new access token. That matters for providers that rotate refresh tokens, because the old refresh token stops working. Concurrent calls share a single refresh.

```ts
import { createTokenManager } from "@usemeshly/auth/oauth";

const tokens = createTokenManager({
  provider: acme,
  client,
  load: () => tokenStore.read(userId),
  save: (next) => tokenStore.write(userId, next),
  requiredScopes: ["calendar.read"], // optional: reject with missing_scopes when the grant lacks them
});

const accessToken = await tokens.getAccessToken();
```

If an API rejects the token with a 401, ask for a new one with `getAccessToken({ forceRefresh: true, rejectedToken })`. If another call already replaced that token, the manager returns the replacement instead of refreshing again.

### Storage examples

You decide where tokens live. `load` returns `null` when the user hasn't connected yet.

**A database, encrypted at rest** (recommended for multi-user servers):

```ts
import type { OAuthTokens } from "@usemeshly/auth/oauth";

const tokenStore = {
  read: async (userId: string): Promise<OAuthTokens | null> => {
    const row = await db.query("select data from oauth_tokens where user_id = $1", [userId]);
    return row === undefined ? null : JSON.parse(await decrypt(row.data));
  },
  write: async (userId: string, tokens: OAuthTokens): Promise<void> => {
    await db.query(
      "insert into oauth_tokens (user_id, data) values ($1, $2) on conflict (user_id) do update set data = $2",
      [userId, await encrypt(JSON.stringify(tokens))],
    );
  },
};
```

**A file, for a single-user CLI** (keep it out of version control and readable only by the user):

```ts
import { readFile, writeFile } from "node:fs/promises";

const path = `${process.env.HOME}/.config/my-cli/tokens.json`;

const tokens = createTokenManager({
  provider: acme,
  client,
  load: () => readFile(path, "utf8").then(JSON.parse, () => null),
  save: (next) => writeFile(path, JSON.stringify(next), { mode: 0o600 }),
});
```

### Revoke

```ts
import { revoke } from "@usemeshly/auth/oauth";

await revoke(acme, client, storedTokens.refreshToken!, { tokenTypeHint: "refresh_token" });
```

A token the provider no longer recognizes counts as revoked. Providers without a revocation endpoint reject with `unsupported_operation`.

## Basic, Bearer and API key headers

```ts
import { apiKeyHeader, basicAuthHeader, bearerAuthHeader } from "@usemeshly/auth/basic";

await fetch(url, { headers: basicAuthHeader({ username, password }) });
await fetch(url, { headers: bearerAuthHeader(accessToken) });
await fetch(url, { headers: apiKeyHeader(key) }); // X-API-Key: <key>
await fetch(url, { headers: apiKeyHeader(key, { header: "Authorization", prefix: "Token" }) });
```

Values with control characters (which could inject headers) or whitespace in a token are rejected with `invalid_argument`. The value itself is never included in the error.

## Errors

Every failure is a `MeshlyError` with a typed `code`. Use `isMeshlyError(error, ...codes)` to narrow it. It works across the ESM and CJS copies of the package, which `instanceof` doesn't.

```ts
import { isMeshlyError } from "@usemeshly/auth";

try {
  await tokens.getAccessToken();
} catch (error) {
  if (isMeshlyError(error, "invalid_grant", "not_signed_in")) {
    // The user revoked access or never connected: ask them to connect again.
  } else if (isMeshlyError(error, "network_error", "timeout")) {
    // Transient: retry later.
  } else {
    throw error;
  }
}
```

| Code | Meaning |
| --- | --- |
| `invalid_argument` | A parameter or descriptor is invalid. Nothing was sent. |
| `invalid_state` | The callback `state` doesn't match (possible CSRF). Restart the flow. |
| `authorization_denied` | The user declined consent. |
| `authorization_error` | The provider returned another error to the callback. |
| `invalid_grant` | The code or refresh token is invalid, expired or revoked. The user must sign in again. |
| `invalid_client` | The provider rejected the client credentials. |
| `oauth_error` | Any other OAuth error response. |
| `not_signed_in` | No stored tokens, or the access token expired and there is no refresh token. |
| `missing_scopes` | The stored grant lacks a scope listed in `requiredScopes`. |
| `unsupported_operation` | The provider doesn't support the operation (e.g. revocation). |
| `unsupported_environment` | Called in a browser-like runtime (both `window` and `document` exist). Move the call server-side. |
| `invalid_response` | The provider's response failed validation. |
| `network_error`, `timeout`, `aborted` | The request couldn't complete. |

Error messages are redacted. A `MeshlyError` never contains access tokens, refresh tokens, authorization codes, PKCE verifiers or client secrets, so it's safe to log or serialize (`JSON.stringify(error)` gives `code`, `message`, `status`, `provider` and `providerCode`).

## Transport options

Every network call accepts `fetch` (defaults to the global one; inject your own for proxies, instrumentation or tests), `signal` (an `AbortSignal`) and `timeoutMs` (defaults to 30 seconds).

## Using it with NestJS

The package exposes factory functions, not classes. Register them as custom providers:

```ts
{
  provide: ACME_TOKENS,
  useFactory: (store: TokenStore) =>
    createTokenManager({ provider: acme, client, load: () => store.read(), save: (t) => store.write(t) }),
  inject: [TokenStore],
}
```

## License

ISC
