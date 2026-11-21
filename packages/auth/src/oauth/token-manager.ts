import { assertServerRuntime } from "../shared/environment";
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

type RunResult = {
  accessToken: string;
  /** Whether this run called the token endpoint. */
  refreshed: boolean;
};

/**
 * Hands out valid access tokens from the caller's storage. The manager holds no tokens between calls: it reads them
 * with `load` every time and writes refreshed (and rotated) ones with `save`. While a refresh is running, every other
 * call waits for it instead of starting its own. A `forceRefresh` call that arrives while a plain call is running
 * still refreshes once that call finishes, unless that call refreshed already. Pass the rejected token as
 * `rejectedToken` so a forced call skips the refresh when another call already replaced that token.
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
  assertServerRuntime();
  const { provider, client, load, save } = options;
  const margin = options.refreshMarginMs ?? DEFAULT_REFRESH_MARGIN_MS;
  /** The run every concurrent call shares; `forced` runs always refresh, plain ones only when the token expired. */
  let inflight: {
    forced: boolean;
    result: Promise<RunResult>;
  } | null = null;
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

  const run = async (
    forceRefresh: boolean,
    rejectedToken?: string,
  ): Promise<RunResult> => {
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
    const replaced =
      rejectedToken !== undefined && stored.accessToken !== rejectedToken;
    if (fresh && (!forceRefresh || replaced)) {
      return {
        accessToken: stored.accessToken,
        refreshed: false,
      };
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
    return {
      accessToken: next.accessToken,
      refreshed: true,
    };
  };

  const share = (
    forced: boolean,
    start: () => Promise<RunResult>,
  ): Promise<RunResult> => {
    const entry = {
      forced,
      result: start(),
    };
    entry.result = entry.result.finally(() => {
      if (inflight === entry) {
        inflight = null;
      }
    });
    inflight = entry;
    return entry.result;
  };

  const getRun = (
    forced: boolean,
    rejectedToken: string | undefined,
  ): Promise<RunResult> => {
    const current = inflight;
    if (current === null) {
      return share(forced, () => run(forced, rejectedToken));
    }
    if (current.forced || !forced) {
      return current.result;
    }
    // A plain call may only have read the token that just failed: refresh after it, unless it refreshed already.
    return share(true, async () => {
      const previous = await current.result.catch(() => null);
      return previous?.refreshed === true ? previous : run(true, rejectedToken);
    });
  };

  return {
    getAccessToken: async (callOptions: GetAccessTokenOptions = {}) =>
      (
        await getRun(
          callOptions.forceRefresh === true,
          callOptions.rejectedToken,
        )
      ).accessToken,
  };
};
