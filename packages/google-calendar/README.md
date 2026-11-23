# @usemeshly/google-calendar

Typed Google Calendar API v3 client:

- **Incremental sync** with sync tokens. Expiry is reported as its own error code.
- **Every page followed** for you.
- **Every response validated** with zod.
- **Google OAuth descriptor** for [`@usemeshly/auth/oauth`](../auth).

It never stores tokens: they go wherever your own `save` puts them.

> **Server-side only.** Google requires your OAuth client secret, so run this from a backend, a serverless function, a CLI or a desktop app. Never ship it, the client secret or users' tokens to a browser or mobile bundle. `createGoogleCalendarClient` throws `unsupported_environment` in a browser-like runtime.

## Install

`@usemeshly/auth` is a peer dependency: install both.

```bash
pnpm add -E @usemeshly/auth @usemeshly/google-calendar
```

Requires Node.js 20.3+ (or any runtime with `fetch`, Web Crypto and `AbortSignal.any`). Works with `import` and `require`.

## Google Cloud setup

1. In the [Google Cloud console](https://console.cloud.google.com/), enable the **Google Calendar API**.
2. Configure the OAuth consent screen and add the scopes you'll request.
3. Create an **OAuth client ID**:
   - **Web application** for a server, with your callback URL as an authorized redirect URI.
   - **Desktop app** for a CLI or desktop app, which redirects to `http://127.0.0.1:<port>`.
4. Keep the client ID and secret in your own configuration. None ship with this package.

## Connect a Google account

`googleOAuthProvider` already sets what Google needs: `access_type=offline` and `prompt=consent` (so you get a refresh token, also on repeat sign-ins), `include_granted_scopes=true`, and `client_secret_post`.

```ts
import { createAuthorizationRequest, exchangeCode } from "@usemeshly/auth/oauth";
import { GOOGLE_CALENDAR_SCOPES, googleOAuthProvider, missingScopes } from "@usemeshly/google-calendar";

const client = { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! };
const redirectUri = "https://app.example.com/oauth/google/callback";
const scopes = [GOOGLE_CALENDAR_SCOPES.events];

// 1. Start: keep state and codeVerifier server-side, then redirect.
const request = await createAuthorizationRequest(googleOAuthProvider, client, { scopes, redirectUri });
session.oauth = { state: request.state, codeVerifier: request.codeVerifier };
redirect(request.url);

// 2. Callback: exchange the code, check what the user actually granted, store the tokens.
const tokens = await exchangeCode(googleOAuthProvider, client, {
  callbackUrl: incoming.url,
  expectedState: session.oauth.state,
  codeVerifier: session.oauth.codeVerifier,
  redirectUri,
});
if (missingScopes(tokens.scopes, scopes).length > 0) {
  // Google lets users untick scopes on the consent screen: ask again or degrade gracefully.
}
await tokenStore.write(userId, tokens);
```

`GOOGLE_CALENDAR_SCOPES` lists `calendar`, `calendarReadonly`, `events`, `eventsReadonly` and `calendarListReadonly`. Request the narrowest set your app needs. `hasScopes(granted, required)` is the boolean form of `missingScopes`.

## Create the client

```ts
import { createTokenManager } from "@usemeshly/auth/oauth";
import { createGoogleCalendarClient, googleOAuthProvider } from "@usemeshly/google-calendar";

const tokens = createTokenManager({
  provider: googleOAuthProvider,
  client,
  load: () => tokenStore.read(userId), // null when the user hasn't connected
  save: (next) => tokenStore.write(userId, next),
});

const calendar = createGoogleCalendarClient({ getAccessToken: tokens.getAccessToken });
```

The client asks `getAccessToken` for a token before every request. If Google answers 401, it requests a forced refresh once (passing the rejected token) and retries. `tokenStore` is your own storage: see the [storage examples](../auth#storage-examples) in `@usemeshly/auth`.

Options: `fetch` (defaults to the global one), `timeoutMs` per request (defaults to 30 seconds) and `signal` to abort every request. Every method also takes a per-call `signal`.

## Calendars

```ts
const { items: calendars } = await calendar.calendarList.list({ minAccessRole: "writer" });
```

## Events

```ts
const event = await calendar.events.insert(
  "primary",
  {
    summary: "Design review",
    start: { dateTime: "2026-12-01T15:00:00-05:00" },
    end: { dateTime: "2026-12-01T16:00:00-05:00" },
    attendees: [{ email: "ana@example.com" }],
  },
  { sendUpdates: "all" },
);

await calendar.events.patch("primary", event.id, { location: "Room 4" }); // fields left out stay as they are
const current = await calendar.events.get("primary", event.id); // null when Google has no such event
await calendar.events.delete("primary", event.id); // an event that's already gone counts as deleted
```

## Google Meet

Add a Meet with `conferenceData.createRequest`, on `insert` or `patch`. `requestId` is yours to generate and must be unique per creation request. No extra scope is needed: the events scope is enough.

```ts
const event = await calendar.events.insert("primary", {
  summary: "Design review",
  start: { dateTime: "2026-12-01T15:00:00-05:00" },
  end: { dateTime: "2026-12-01T16:00:00-05:00" },
  conferenceData: {
    createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
  },
});

if (event.conferenceData?.createRequest?.status?.statusCode === "pending") {
  // Google is still creating the Meet: read the event again with `get`, or pick it up on the next sync.
}
const link = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri;

await calendar.events.patch("primary", event.id, { conferenceData: null }); // removes the Meet from the event
```

Google ignores `conferenceData` unless the write sends `conferenceDataVersion=1`. The client sends it whenever the input has `conferenceData` (including `null`); pass `{ conferenceDataVersion }` in the options to override it. A patch without `conferenceData` leaves the conference as it is.

Deleting the event (or removing its conference) doesn't delete the Meet space itself: the link just stops being associated with the event.

## Incremental sync

The first `list` returns every event and a `nextSyncToken`. Store it, and pass it next time to get only what changed since then. That includes deletions, which arrive with `status: "cancelled"`. When Google expires the token, the call rejects with `sync_token_expired`: drop the token and do a full list again.

```ts
import { isMeshlyError } from "@usemeshly/auth";

const sync = async (userId: string) => {
  const syncToken = await syncStore.read(userId); // your storage, null on the first run
  try {
    const { items, nextSyncToken } = await calendar.events.list(
      "primary",
      syncToken === null ? {} : { syncToken },
    );
    await applyChanges(items);
    await syncStore.write(userId, nextSyncToken);
  } catch (error) {
    if (isMeshlyError(error, "sync_token_expired")) {
      await syncStore.write(userId, null);
      return sync(userId); // full re-sync
    }
    throw error;
  }
};
```

The types don't allow filters (`timeMin`, `timeMax`, `q`, `orderBy`, `updatedMin`) together with a `syncToken`, because Google rejects that combination.

## Errors

Every failure is a `MeshlyError` from `@usemeshly/auth`. Narrow it with `isMeshlyError(error, ...codes)`.

| Code | Meaning |
| --- | --- |
| `sync_token_expired` | The sync token is no longer valid (410). Drop it and list again without it. |
| `unauthorized` | Google refused the access token, also after a forced refresh. Reconnect the account. |
| `insufficient_scope` | The grant lacks a scope this call needs. Ask the user to grant it. |
| `rate_limited` | Quota or rate limit (403/429). Retry later with backoff. |
| `not_found`, `conflict`, `precondition_failed` | 404, 409, 412. |
| `api_error` | Any other error status from Google. |
| `invalid_response` | Google's response failed validation. |
| `unsupported_environment` | `createGoogleCalendarClient` was called in a browser-like runtime. |
| `network_error`, `timeout`, `aborted`, `invalid_argument` | Shared with every usemeshly package. |

Token errors from the token manager (`invalid_grant`, `not_signed_in`, …) pass through unchanged: see [`@usemeshly/auth`](../auth#errors). Messages never contain access tokens, sync tokens or page tokens.

## Using it with NestJS

```ts
{
  provide: GOOGLE_CALENDAR,
  useFactory: (tokens: TokenManager) => createGoogleCalendarClient({ getAccessToken: tokens.getAccessToken }),
  inject: [GOOGLE_TOKENS],
}
```

## License

ISC
