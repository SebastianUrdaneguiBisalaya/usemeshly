import type { CommonErrorCode } from "@usemeshly/auth";
import { MeshlyError } from "@usemeshly/auth";

/** Error codes raised by `@usemeshly/open-meteo`. */
export type OpenMeteoErrorCode =
  | CommonErrorCode
  /** Open-Meteo rejected the request (400 with `{ error: true, reason }`). The message carries the `reason`. */
  | "bad_request"
  /**
   * The API key is missing or invalid, or the plan has no access to this API (401/403, or a 400 whose reason is about
   * the API key).
   */
  | "unauthorized"
  /** Rate limit reached (429). On the free plan the limits are per IP: retry later. */
  | "rate_limited"
  /** Open-Meteo failed (5xx): retry later. */
  | "server_error"
  /** Any other status, including a redirect, which is never followed. */
  | "api_error";

export const meteoError = (
  code: OpenMeteoErrorCode,
  message: string,
  extra: {
    status?: number;
    secrets?: readonly string[];
  } = {},
): MeshlyError<OpenMeteoErrorCode> =>
  new MeshlyError({
    code,
    message,
    provider: "open-meteo",
    ...extra,
  });

const API_KEY_REASON = /api ?key/i;

export const statusCode = (
  status: number,
  reason: string | undefined,
): OpenMeteoErrorCode => {
  if (status === 401 || status === 403) return "unauthorized";
  // Open-Meteo answers an invalid key with 400 "The supplied API key is invalid."
  if (status === 400) {
    return reason !== undefined && API_KEY_REASON.test(reason)
      ? "unauthorized"
      : "bad_request";
  }
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "api_error";
};
