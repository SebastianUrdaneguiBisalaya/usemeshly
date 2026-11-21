import type { CommonErrorCode } from "@usemeshly/auth";
import { MeshlyError } from "@usemeshly/auth";

/** Error codes raised by `@usemeshly/nager-date`. */
export type NagerDateErrorCode =
  | CommonErrorCode
  /** Nager.Date rejected the parameters (400). The message lists the fields it complained about. */
  | "bad_request"
  /** The Pro API key is missing, invalid or not allowed to call this endpoint (401/403). */
  | "unauthorized"
  /** The country or subdivision code is invalid or not recognized (404). */
  | "not_found"
  /** Too many requests (429): retry later with backoff. */
  | "rate_limited"
  /** Nager.Date failed (5xx): retry later. */
  | "server_error"
  /** Any other status, including a redirect, which is never followed. */
  | "api_error";

export const nagerError = (
  code: NagerDateErrorCode,
  message: string,
  extra: {
    status?: number;
    secrets?: readonly string[];
  } = {},
): MeshlyError<NagerDateErrorCode> =>
  new MeshlyError({
    code,
    message,
    provider: "nager-date",
    ...extra,
  });

export const statusCode = (status: number): NagerDateErrorCode => {
  if (status === 400) return "bad_request";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "api_error";
};
