import { oauthError } from "./errors";
import { refresh } from "./flow";
import { discoverOAuthProvider } from "./provider";
import type {
  GetAccessTokenOptions,
  OAuthProvider,
  OAuthTokens,
  TokenManager,
  TokenManagerOptions,
} from "./types";

export const DEFAULT_REFRESH_MARGIN_MS = 60_000;

/**
 * Hands out valid access tokens from the caller's storage. The manager holds no tokens between calls: it reads them
 * with `load` every time and writes refreshed (and rotated) ones with `save`. While a refresh is running, every other
 * call waits for it instead of starting its own.
 *
 * @example
 * ```ts
 * const tokens = createTokenManager({
 *   provider,
 *   client: { clientId, clientSecret },
 *   load: () => keychain.read(userId),
 *   save: (next) => keychain.write(userId, next),
 * });
 * const accessToken = await tokens.getAccessToken();
 * ```
 */
export const createTokenManager = <T extends OAuthTokens>(
  options: TokenManagerOptions<T>,
): TokenManager => {
  const { provider, client, load, save } = options;
  const margin = options.refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS;
  let inflight: Promise<string> | null = null;
  // Public endpoints only (never tokens): discovered once per manager when the descriptor has no fixed endpoints.
  let resolvedProvider: Promise<OAuthProvider> | null = null;

  const resolveProvider = (): Promise<OAuthProvider> => {
    if (provider.endpoints !== undefined) {
      return Promise.resolve(provider);
    }
    resolvedProvider ??= discoverOAuthProvider(provider, options).catch(
      (error: unknown) => {
        resolvedProvider = null;
        throw error;
      },
    );
    return resolvedProvider;
  };

  const run = async (forceRefresh: boolean): Promise<string> => {
    const stored = await load();
    if (stored === null) {
      throw oauthError(provider, "not_signed_in", "No tokens are stored");
    }
    const missing =
      stored.scopes === null
        ? []
        : (options.requiredScopes ?? []).filter(
            (scope) => !stored.scopes?.includes(scope),
          );
    if (missing.length > 0) {
      throw oauthError(
        provider,
        "missing_scopes",
        `The stored grant lacks ${missing.join(", ")}`,
      );
    }
    const fresh =
      stored.expiresAt === null || stored.expiresAt - margin > Date.now();
    if (fresh && !forceRefresh) {
      return stored.accessToken;
    }
    if (stored.refreshToken === null) {
      throw oauthError(
        provider,
        "not_signed_in",
        "The access token expired and there is no refresh token",
      );
    }
    const refreshed = await refresh(
      await resolveProvider(),
      client,
      stored.refreshToken,
      options,
    );
    const next: T = {
      ...stored,
      ...refreshed,
      // A refresh response often omits these; keep what the original grant said.
      idToken: refreshed.idToken ?? stored.idToken,
      idTokenClaims: refreshed.idTokenClaims ?? stored.idTokenClaims,
      scopes: refreshed.scopes ?? stored.scopes,
    };
    // Saved first: with rotation, the previous refresh token no longer works.
    await save(next);
    return next.accessToken;
  };

  return {
    getAccessToken: (callOptions: GetAccessTokenOptions = {}) => {
      if (inflight !== null) {
        return inflight;
      }
      const current = run(callOptions.forceRefresh === true).finally(() => {
        if (inflight === current) {
          inflight = null;
        }
      });
      inflight = current;
      return current;
    },
  };
};
