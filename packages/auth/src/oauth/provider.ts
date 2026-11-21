import * as oauth from "oauth4webapi";
import { z } from "zod";
import type { RequestOptions } from "../shared/http";
import { callSignal } from "../shared/http";
import { oauthError, toOAuthError } from "./errors";
import type { OAuthProvider } from "./types";

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const httpsUrl = z.string().refine(isHttpsUrl, "must be an HTTPS URL");

const providerSchema = z.object({
  clientAuth: z.enum([
    "none",
    "client_secret_post",
    "client_secret_basic",
  ]),
  endpoints: z
    .object({
      authorization: httpsUrl,
      token: httpsUrl,
    })
    .optional(),
  extraAuthParams: z.record(z.string(), z.string()).optional(),
  id: z.string().min(1),
  issuer: httpsUrl,
  revocationEndpoint: httpsUrl.optional(),
  rotatesRefreshToken: z.boolean().optional(),
  scopeSeparator: z.string().min(1).optional(),
});

const discoveredSchema = z.object({
  authorization_endpoint: httpsUrl,
  revocation_endpoint: httpsUrl.optional(),
  token_endpoint: httpsUrl,
});

/** Parameters the flow sets itself; a descriptor or request may not override them. */
export const RESERVED_AUTH_PARAMS: ReadonlySet<string> = new Set([
  "client_id",
  "code_challenge",
  "code_challenge_method",
  "nonce",
  "redirect_uri",
  "response_type",
  "scope",
  "state",
]);

export const assertNoReservedParams = (
  provider: Pick<OAuthProvider, "id">,
  params: Readonly<Record<string, string>> | undefined,
): void => {
  for (const key of Object.keys(params ?? {})) {
    if (RESERVED_AUTH_PARAMS.has(key)) {
      throw oauthError(
        provider,
        "invalid_argument",
        `"${key}" is set by the flow and can't be overridden`,
      );
    }
  }
};

/** Throws `invalid_argument` unless `provider` is a valid descriptor. */
export const assertProvider = (provider: OAuthProvider): void => {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) {
    throw oauthError(
      {
        id: typeof provider?.id === "string" ? provider.id : "oauth",
      },
      "invalid_argument",
      `Invalid OAuth provider descriptor: ${z.prettifyError(parsed.error)}`,
    );
  }
  assertNoReservedParams(provider, provider.extraAuthParams);
};

/**
 * Validates an OAuth provider descriptor (HTTPS endpoints, known client auth, no reserved parameters) and freezes it.
 *
 * @example
 * ```ts
 * export const acme = defineOAuthProvider({
 *   id: "acme",
 *   issuer: "https://auth.acme.com",
 *   clientAuth: "client_secret_basic",
 * });
 * ```
 */
export const defineOAuthProvider = <const P extends OAuthProvider>(
  provider: P,
): Readonly<P> => {
  assertProvider(provider);
  return Object.freeze({
    ...provider,
  });
};

/** oauth4webapi transport options for one call. */
export const transport = (
  options: RequestOptions,
  signal: AbortSignal,
): {
  signal: AbortSignal;
  [oauth.customFetch]?: (url: string, init: object) => Promise<Response>;
} => {
  const fetch = options.fetch;
  return fetch === undefined
    ? {
        signal,
      }
    : {
        // oauth4webapi's request options are a subset of RequestInit.
        [oauth.customFetch]: (url, init) => fetch(url, init as RequestInit),
        signal,
      };
};

/** The provider's authorization server metadata: its fixed endpoints, or the ones its discovery document lists. */
export const resolveServer = async (
  provider: OAuthProvider,
  options: RequestOptions,
  signal: AbortSignal,
): Promise<oauth.AuthorizationServer> => {
  if (provider.endpoints !== undefined) {
    return {
      authorization_endpoint: provider.endpoints.authorization,
      issuer: provider.issuer,
      token_endpoint: provider.endpoints.token,
      ...(provider.revocationEndpoint === undefined
        ? {}
        : {
            revocation_endpoint: provider.revocationEndpoint,
          }),
    };
  }
  const issuer = new URL(provider.issuer);
  let server: oauth.AuthorizationServer;
  try {
    server = await oauth.processDiscoveryResponse(
      issuer,
      await oauth.discoveryRequest(issuer, {
        ...transport(options, signal),
        algorithm: "oidc",
      }),
    );
  } catch (error) {
    throw toOAuthError(error, provider, []);
  }
  const metadata = discoveredSchema.safeParse(server);
  if (!metadata.success) {
    throw oauthError(
      provider,
      "invalid_response",
      `${provider.id} discovery document is unusable: ${z.prettifyError(metadata.error)}`,
    );
  }
  const revocation =
    provider.revocationEndpoint ?? metadata.data.revocation_endpoint;
  return {
    ...server,
    ...(revocation === undefined
      ? {}
      : {
          revocation_endpoint: revocation,
        }),
  };
};

/**
 * Reads the provider's OIDC discovery document once and returns the descriptor with fixed endpoints, so later calls
 * skip discovery. Keeping the result is up to the caller; nothing is cached.
 */
export const discoverOAuthProvider = async (
  provider: OAuthProvider,
  options: RequestOptions = {},
): Promise<Readonly<OAuthProvider>> => {
  assertProvider(provider);
  const server = await resolveServer(provider, options, callSignal(options));
  return defineOAuthProvider({
    ...provider,
    endpoints: {
      authorization: server.authorization_endpoint as string,
      token: server.token_endpoint as string,
    },
    ...(server.revocation_endpoint === undefined
      ? {}
      : {
          revocationEndpoint: server.revocation_endpoint,
        }),
  });
};
