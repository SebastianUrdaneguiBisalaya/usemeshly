import * as oauth from "oauth4webapi";
import { z } from "zod";
import { assertServerRuntime } from "../shared/environment";
import type { MeshlyError } from "../shared/errors";
import type { RequestOptions } from "../shared/http";
import { callSignal, timingSafeEqual } from "../shared/http";
import { oauthError, toOAuthError } from "./errors";
import {
  assertNoReservedParams,
  assertProvider,
  resolveServer,
  transport,
} from "./provider";
import { idTokenClaimsSchema, tokenResponseSchema } from "./schemas";
import type {
  AuthorizationRequest,
  CreateAuthorizationRequestParams,
  ExchangeCodeParams,
  OAuthClient,
  OAuthErrorCode,
  OAuthProvider,
  OAuthTokens,
  RevokeParams,
} from "./types";

const LOOPBACK_HOSTS = new Set([
  "127.0.0.1",
  "[::1]",
]);

const assertClient = (provider: OAuthProvider, client: OAuthClient): void => {
  if (typeof client?.clientId !== "string" || client.clientId === "") {
    throw oauthError(provider, "invalid_argument", "clientId is required");
  }
};

/** HTTPS, or HTTP on a loopback IP for native apps (RFC 8252). The URI itself is never rewritten. */
const assertRedirectUri = (provider: OAuthProvider, redirectUri: string) => {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw oauthError(
      provider,
      "invalid_argument",
      "redirectUri is not a valid URL",
    );
  }
  const allowed =
    url.protocol === "https:" ||
    (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname));
  if (!allowed || redirectUri.includes("#")) {
    throw oauthError(
      provider,
      "invalid_argument",
      "redirectUri must be HTTPS (or http://127.0.0.1 / http://[::1]) without a fragment",
    );
  }
};

const assertScopes = (provider: OAuthProvider, scopes: readonly string[]) => {
  if (
    !Array.isArray(scopes) ||
    scopes.some((scope) => typeof scope !== "string" || !/^\S+$/.test(scope))
  ) {
    throw oauthError(
      provider,
      "invalid_argument",
      "scopes must be non-empty strings without whitespace",
    );
  }
};

const clientAuthentication = (
  provider: OAuthProvider,
  client: OAuthClient,
): oauth.ClientAuth => {
  if (provider.clientAuth === "none") {
    return oauth.None();
  }
  if (client.clientSecret === undefined || client.clientSecret === "") {
    throw oauthError(
      provider,
      "invalid_argument",
      `${provider.id} uses ${provider.clientAuth}: clientSecret is required`,
    );
  }
  return provider.clientAuth === "client_secret_post"
    ? oauth.ClientSecretPost(client.clientSecret)
    : oauth.ClientSecretBasic(client.clientSecret);
};

const toClient = (client: OAuthClient): oauth.Client => ({
  client_id: client.clientId,
});

const splitScopes = (provider: OAuthProvider, scope: string): string[] =>
  scope
    .split(provider.scopeSeparator ?? " ")
    .map((value) => value.trim())
    .filter((value) => value !== "");

/** oauth4webapi's validated response, checked again with zod and mapped to `OAuthTokens`. */
const toTokens = (
  provider: OAuthProvider,
  response: oauth.TokenEndpointResponse,
): OAuthTokens => {
  const parsed = tokenResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw oauthError(
      provider,
      "invalid_response",
      `${provider.id} sent an invalid token response: ${z.prettifyError(parsed.error)}`,
    );
  }
  const claims = oauth.getValidatedIdTokenClaims(response);
  const parsedClaims =
    claims === undefined ? undefined : idTokenClaimsSchema.safeParse(claims);
  if (parsedClaims !== undefined && !parsedClaims.success) {
    throw oauthError(
      provider,
      "invalid_response",
      `${provider.id} sent an ID token without the expected claims`,
    );
  }
  const tokens = parsed.data;
  return {
    accessToken: tokens.access_token,
    expiresAt:
      tokens.expires_in === undefined
        ? null
        : Date.now() + tokens.expires_in * 1000,
    idToken: tokens.id_token ?? null,
    idTokenClaims: parsedClaims?.data ?? null,
    refreshToken: tokens.refresh_token ?? null,
    scopes:
      tokens.scope === undefined ? null : splitScopes(provider, tokens.scope),
    tokenType: tokens.token_type.toLowerCase(),
  };
};

/**
 * Starts an authorization code flow with PKCE (S256). Redirect the user to `url` and keep `state`, `codeVerifier`
 * and `nonce` (server-side, e.g. in the session) until the callback.
 *
 * @example
 * ```ts
 * const request = await createAuthorizationRequest(provider, client, {
 *   scopes: ["openid", "email"],
 *   redirectUri: "https://app.example.com/oauth/callback",
 * });
 * session.oauth = { state: request.state, codeVerifier: request.codeVerifier, nonce: request.nonce };
 * redirect(request.url);
 * ```
 */
export const createAuthorizationRequest = async (
  provider: OAuthProvider,
  client: OAuthClient,
  params: CreateAuthorizationRequestParams,
): Promise<AuthorizationRequest> => {
  assertServerRuntime();
  assertProvider(provider);
  assertClient(provider, client);
  assertRedirectUri(provider, params.redirectUri);
  assertScopes(provider, params.scopes);
  assertNoReservedParams(provider, params.extraParams);

  const server = await resolveServer(provider, params, callSignal(params));
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const state = oauth.generateRandomState();
  const nonce = params.scopes.includes("openid")
    ? oauth.generateRandomNonce()
    : null;

  const url = new URL(server.authorization_endpoint as string);
  for (const [key, value] of Object.entries({
    ...provider.extraAuthParams,
    ...params.extraParams,
  })) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set(
    "scope",
    params.scopes.join(provider.scopeSeparator ?? " "),
  );
  url.searchParams.set("state", state);
  url.searchParams.set(
    "code_challenge",
    await oauth.calculatePKCECodeChallenge(codeVerifier),
  );
  url.searchParams.set("code_challenge_method", "S256");
  if (nonce !== null) {
    url.searchParams.set("nonce", nonce);
  }

  return {
    codeVerifier,
    nonce,
    state,
    url: url.toString(),
  };
};

/**
 * Completes the flow: checks `state` (rejecting with `invalid_state` before anything is sent), then trades the code
 * and PKCE verifier for tokens. With `openid`, the ID token's issuer, audience, expiry and nonce are validated.
 */
export const exchangeCode = async (
  provider: OAuthProvider,
  client: OAuthClient,
  params: ExchangeCodeParams,
): Promise<OAuthTokens> => {
  assertServerRuntime();
  assertProvider(provider);
  assertClient(provider, client);
  assertRedirectUri(provider, params.redirectUri);

  let callback: URL;
  try {
    callback = new URL(params.callbackUrl);
  } catch {
    throw oauthError(
      provider,
      "invalid_argument",
      "callbackUrl is not a valid URL",
    );
  }
  const code = callback.searchParams.get("code");
  const secrets = [
    client.clientSecret,
    code,
    params.codeVerifier,
  ];
  const receivedState = callback.searchParams.get("state");
  if (
    receivedState === null ||
    params.expectedState === "" ||
    !timingSafeEqual(receivedState, params.expectedState)
  ) {
    throw oauthError(
      provider,
      "invalid_state",
      "The callback state does not match the authorization request",
    );
  }

  const authentication = clientAuthentication(provider, client);
  const oauthClient = toClient(client);
  const signal = callSignal(params);
  try {
    const server = await resolveServer(provider, params, signal);
    const callbackParams = oauth.validateAuthResponse(
      server,
      oauthClient,
      callback.searchParams,
      params.expectedState,
    );
    const response = await oauth.authorizationCodeGrantRequest(
      server,
      oauthClient,
      authentication,
      callbackParams,
      params.redirectUri,
      params.codeVerifier,
      transport(params, signal),
    );
    const hasNonce =
      params.expectedNonce !== undefined && params.expectedNonce !== null;
    const result = await oauth.processAuthorizationCodeResponse(
      server,
      oauthClient,
      response,
      {
        expectedNonce: hasNonce
          ? (params.expectedNonce as string)
          : oauth.expectNoNonce,
        requireIdToken: hasNonce,
      },
    );
    return toTokens(provider, result);
  } catch (error) {
    throw toOAuthError(error, provider, secrets);
  }
};

/**
 * A new access token from `refreshToken`. The result always carries the refresh token to keep: the rotated one when
 * the provider issued it, otherwise the one passed in. Save it before using the access token.
 */
export const refresh = async (
  provider: OAuthProvider,
  client: OAuthClient,
  refreshToken: string,
  options: RequestOptions = {},
): Promise<OAuthTokens> => {
  assertServerRuntime();
  assertProvider(provider);
  assertClient(provider, client);
  if (typeof refreshToken !== "string" || refreshToken === "") {
    throw oauthError(provider, "invalid_argument", "refreshToken is required");
  }
  const authentication = clientAuthentication(provider, client);
  const oauthClient = toClient(client);
  const signal = callSignal(options);
  let tokens: OAuthTokens;
  try {
    const server = await resolveServer(provider, options, signal);
    const response = await oauth.refreshTokenGrantRequest(
      server,
      oauthClient,
      authentication,
      refreshToken,
      transport(options, signal),
    );
    tokens = toTokens(
      provider,
      await oauth.processRefreshTokenResponse(server, oauthClient, response),
    );
  } catch (error) {
    throw toOAuthError(error, provider, [
      client.clientSecret,
      refreshToken,
    ]);
  }
  if (tokens.refreshToken !== null) {
    return tokens;
  }
  if (provider.rotatesRefreshToken === true) {
    throw oauthError(
      provider,
      "invalid_response",
      `${provider.id} rotates refresh tokens but sent none`,
    );
  }
  return {
    ...tokens,
    refreshToken,
  };
};

/**
 * Revokes `token` at the provider (revoking a refresh token usually ends its access tokens too). A token the provider
 * no longer knows counts as revoked. Rejects with `unsupported_operation` when the provider has no revocation endpoint.
 */
export const revoke = async (
  provider: OAuthProvider,
  client: OAuthClient,
  token: string,
  params: RevokeParams = {},
): Promise<void> => {
  assertServerRuntime();
  assertProvider(provider);
  assertClient(provider, client);
  const authentication = clientAuthentication(provider, client);
  const oauthClient = toClient(client);
  const signal = callSignal(params);
  const secrets = [
    client.clientSecret,
    token,
  ];
  let error: MeshlyError<OAuthErrorCode> | undefined;
  try {
    const server = await resolveServer(provider, params, signal);
    if (server.revocation_endpoint === undefined) {
      throw oauthError(
        provider,
        "unsupported_operation",
        `${provider.id} has no revocation endpoint`,
      );
    }
    const response = await oauth.revocationRequest(
      server,
      oauthClient,
      authentication,
      token,
      {
        ...transport(params, signal),
        ...(params.tokenTypeHint === undefined
          ? {}
          : {
              additionalParameters: {
                token_type_hint: params.tokenTypeHint,
              },
            }),
      },
    );
    await oauth.processRevocationResponse(response);
  } catch (caught) {
    if (
      caught instanceof oauth.ResponseBodyError &&
      caught.error === "invalid_token"
    ) {
      return;
    }
    error = toOAuthError(caught, provider, secrets);
  }
  if (error !== undefined) {
    throw error;
  }
};
