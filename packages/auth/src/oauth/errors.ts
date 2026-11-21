import * as oauth from "oauth4webapi";
import { MeshlyError } from "../shared/errors";
import type { OAuthErrorCode, OAuthProvider } from "./types";

type Secrets = readonly (string | null | undefined)[];

export const oauthError = (
  provider: Pick<OAuthProvider, "id">,
  code: OAuthErrorCode,
  message: string,
  extra: {
    status?: number;
    providerCode?: string;
    secrets?: Secrets;
  } = {},
): MeshlyError<OAuthErrorCode> =>
  new MeshlyError({
    code,
    message,
    provider: provider.id,
    ...extra,
  });

const responseCode = (error: string): OAuthErrorCode => {
  switch (error) {
    case "invalid_grant":
      return "invalid_grant";
    case "invalid_client":
    case "unauthorized_client":
      return "invalid_client";
    default:
      return "oauth_error";
  }
};

/**
 * Maps anything oauth4webapi, `fetch` or the deadline throws to a `MeshlyError`. The original error is not kept:
 * oauth4webapi attaches raw response bodies to its errors.
 */
export const toOAuthError = (
  error: unknown,
  provider: Pick<OAuthProvider, "id">,
  secrets: Secrets,
): MeshlyError<OAuthErrorCode> => {
  if (error instanceof MeshlyError) {
    return error as MeshlyError<OAuthErrorCode>;
  }
  const extra = {
    secrets,
  };
  if (error instanceof oauth.ResponseBodyError) {
    return oauthError(
      provider,
      responseCode(error.error),
      `${provider.id} answered ${error.status} ${error.error}${error.error_description === undefined ? "" : `: ${error.error_description}`}`,
      {
        ...extra,
        providerCode: error.error,
        status: error.status,
      },
    );
  }
  if (error instanceof oauth.AuthorizationResponseError) {
    return oauthError(
      provider,
      error.error === "access_denied"
        ? "authorization_denied"
        : "authorization_error",
      `${provider.id} returned ${error.error} to the callback${error.error_description === undefined ? "" : `: ${error.error_description}`}`,
      {
        ...extra,
        providerCode: error.error,
      },
    );
  }
  if (error instanceof oauth.WWWAuthenticateChallengeError) {
    const challenge = error.cause[0]?.parameters.error;
    return oauthError(
      provider,
      challenge === undefined ? "oauth_error" : responseCode(challenge),
      `${provider.id} refused the request with ${error.status}`,
      {
        ...extra,
        status: error.status,
        ...(challenge === undefined
          ? {}
          : {
              providerCode: challenge,
            }),
      },
    );
  }
  if (
    error instanceof oauth.OperationProcessingError ||
    error instanceof oauth.UnsupportedOperationError
  ) {
    return oauthError(
      provider,
      "invalid_response",
      `${provider.id} sent an invalid response: ${error.message}`,
      extra,
    );
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return oauthError(
      provider,
      "timeout",
      `${provider.id} did not answer in time`,
    );
  }
  if (error instanceof Error && error.name === "AbortError") {
    return oauthError(provider, "aborted", "The request was aborted");
  }
  return oauthError(
    provider,
    "network_error",
    `${provider.id} could not be reached${error instanceof Error ? ` (${error.name})` : ""}`,
  );
};
