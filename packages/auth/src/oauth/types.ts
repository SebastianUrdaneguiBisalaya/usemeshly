import type { z } from "zod";
import type { CommonErrorCode } from "../shared/errors";
import type { RequestOptions } from "../shared/http";
import type { idTokenClaimsSchema } from "./schemas";

/** How the client authenticates at the token and revocation endpoints. */
export type OAuthClientAuthMethod =
  | "none"
  | "client_secret_post"
  | "client_secret_basic";

/**
 * Describes one OAuth 2.0 provider. Everything provider-specific lives here, so the flow functions have no special
 * cases. Build it with `defineOAuthProvider`, which validates it.
 */
export type OAuthProvider = {
  /** A short name used in errors, e.g. `google`. */
  id: string;
  /** The issuer identifier (HTTPS). Also used to validate ID tokens and the `iss` callback parameter. */
  issuer: string;
  /** Fixed endpoints (HTTPS). Leave out to read them from the issuer's OIDC discovery document. */
  endpoints?: {
    authorization: string;
    token: string;
  };
  clientAuth: OAuthClientAuthMethod;
  /** Parameters added to every authorization URL (e.g. `access_type=offline`). */
  extraAuthParams?: Readonly<Record<string, string>>;
  /** How scopes are joined in the authorization URL and split in token responses. Defaults to a space. */
  scopeSeparator?: string;
  /** True when every refresh returns a new refresh token and invalidates the previous one. */
  rotatesRefreshToken?: boolean;
  /** Token revocation endpoint (HTTPS); overrides the discovered one. Without either, `revoke` is unsupported. */
  revocationEndpoint?: string;
};

/** The caller's OAuth client registration. Nothing here is stored by the library. */
export type OAuthClient = {
  clientId: string;
  /** Required by `client_secret_post` and `client_secret_basic` providers. */
  clientSecret?: string;
};

/** Claims of a validated ID token. Only issued when `openid` was requested. */
export type IdTokenClaims = z.output<typeof idTokenClaimsSchema>;

/** Tokens from a code exchange or a refresh. Store them yourself; the library never does. */
export type OAuthTokens = {
  accessToken: string;
  /** Lowercase, usually `bearer`. */
  tokenType: string;
  /** When the access token expires (epoch milliseconds), or null when the provider didn't say. */
  expiresAt: number | null;
  /** Null when the provider issued none. */
  refreshToken: string | null;
  /** The granted scopes, which can be fewer than requested; null when the provider didn't list them. */
  scopes: string[] | null;
  idToken: string | null;
  idTokenClaims: IdTokenClaims | null;
};

/** What `createAuthorizationRequest` returns. Keep `state`, `codeVerifier` and `nonce` until the callback. */
export type AuthorizationRequest = {
  /** Send the user here. */
  url: string;
  state: string;
  codeVerifier: string;
  /** Set when `openid` was requested; pass it to `exchangeCode`. */
  nonce: string | null;
};

export type CreateAuthorizationRequestParams = RequestOptions & {
  scopes: readonly string[];
  /** Used exactly as given. HTTPS, or `http://127.0.0.1` / `http://[::1]` for native apps. */
  redirectUri: string;
  /** Per-request parameters (e.g. `login_hint`), added after the provider's `extraAuthParams`. */
  extraParams?: Readonly<Record<string, string>>;
};

export type ExchangeCodeParams = RequestOptions & {
  /** The full URL the provider redirected to. */
  callbackUrl: string | URL;
  /** The `state` from `createAuthorizationRequest`. */
  expectedState: string;
  codeVerifier: string;
  /** The same `redirectUri` used to create the request. */
  redirectUri: string;
  /** The `nonce` from `createAuthorizationRequest`, when it returned one. */
  expectedNonce?: string | null;
};

export type RevokeParams = RequestOptions & {
  tokenTypeHint?: "access_token" | "refresh_token";
};

/** Error codes raised by `@usemeshly/auth/oauth`. */
export type OAuthErrorCode =
  | CommonErrorCode
  /** The callback's `state` doesn't match: possible CSRF, the flow must restart. */
  | "invalid_state"
  /** The user declined consent (`access_denied`). */
  | "authorization_denied"
  /** The provider returned another error to the callback. */
  | "authorization_error"
  /** The code or refresh token is invalid, expired or revoked: the user must sign in again. */
  | "invalid_grant"
  /** The provider rejected the client credentials. */
  | "invalid_client"
  /** Any other OAuth error response from the provider. */
  | "oauth_error"
  /** The provider doesn't support the operation (e.g. no revocation endpoint). */
  | "unsupported_operation"
  /** The token manager has no usable tokens (none stored, or expired without a refresh token): sign in first. */
  | "not_signed_in"
  /** The stored grant lacks a scope the token manager requires: sign in again to grant it. */
  | "missing_scopes";

export type TokenManagerOptions<T extends OAuthTokens = OAuthTokens> =
  RequestOptions & {
    provider: OAuthProvider;
    client: OAuthClient;
    /** Reads the tokens from your storage; null when the user hasn't signed in. */
    load: () => Promise<T | null>;
    /** Writes refreshed tokens to your storage. Called before the new access token is handed out. */
    save: (tokens: T) => Promise<void>;
    /** Refresh this long before the access token expires. Defaults to 60 seconds. */
    refreshMarginMs?: number;
    /** Scopes the stored grant must include; otherwise `getAccessToken` rejects with `missing_scopes`. */
    requiredScopes?: readonly string[];
  };

export type GetAccessTokenOptions = {
  /** Refresh even if the access token looks valid (e.g. after the API answered 401). */
  forceRefresh?: boolean;
};

export type TokenManager = {
  /** A valid access token, refreshed (and saved) when it is about to expire. Concurrent calls share one refresh. */
  getAccessToken: (options?: GetAccessTokenOptions) => Promise<string>;
};
