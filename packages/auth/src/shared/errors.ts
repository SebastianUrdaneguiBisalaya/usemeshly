import { redact } from "./redact";

/** Marks every usemeshly error, so `isMeshlyError` works even across duplicated copies of the package (ESM and CJS). */
const BRAND = Symbol.for("usemeshly.error");

/** Error codes any usemeshly package can raise. Each package adds its own on top. */
export type CommonErrorCode =
  /** The caller's `AbortSignal` aborted the request. */
  | "aborted"
  /** A parameter or configuration value is invalid; nothing was sent. */
  | "invalid_argument"
  /** The provider answered with something that failed validation. */
  | "invalid_response"
  /** The provider could not be reached. */
  | "network_error"
  /** The request took longer than its deadline. */
  | "timeout"
  /** Called in a browser-like runtime: credentials must stay server-side. */
  | "unsupported_environment";

export type MeshlyErrorOptions<Code extends string> = {
  code: Code;
  /** A developer-facing description. It is redacted before it is stored. */
  message: string;
  /** The HTTP status, when the error comes from a response. */
  status?: number;
  /** Which provider raised it (e.g. `google`). */
  provider?: string;
  /** The provider's own error code (e.g. `invalid_grant`, `rateLimitExceeded`). */
  providerCode?: string;
  /**
   * Values that must not appear in the message (tokens, secrets, authorization codes). They are replaced, then
   * forgotten: the error never keeps them.
   */
  secrets?: readonly (string | null | undefined)[];
};

/** The serializable form of a `MeshlyError`, as `JSON.stringify` writes it. */
export type MeshlyErrorJSON<Code extends string = string> = {
  name: "MeshlyError";
  code: Code;
  message: string;
  status: number | undefined;
  provider: string | undefined;
  providerCode: string | undefined;
};

const PROVIDER_CODE = /^[\w.:-]{1,100}$/;

/**
 * The one error type every usemeshly package throws. `code` tells cases apart; `message` is redacted, and the error
 * holds no tokens, secrets or response bodies, so it is safe to log or serialize.
 *
 * @example
 * ```ts
 * try {
 *   await tokens.getAccessToken();
 * } catch (error) {
 *   if (isMeshlyError(error, "invalid_grant")) {
 *     // the user revoked access: ask them to connect again
 *   }
 * }
 * ```
 */
export class MeshlyError<Code extends string = string> extends Error {
  override readonly name = "MeshlyError";
  readonly code: Code;
  readonly status: number | undefined;
  readonly provider: string | undefined;
  readonly providerCode: string | undefined;

  constructor(options: MeshlyErrorOptions<Code>) {
    super(redact(options.message, options.secrets));
    this.code = options.code;
    this.status = options.status;
    this.provider = options.provider;
    // Provider codes are short identifiers; anything else could be an echoed value, so it is dropped.
    this.providerCode =
      options.providerCode !== undefined &&
      PROVIDER_CODE.test(options.providerCode)
        ? options.providerCode
        : undefined;
    Object.defineProperty(this, BRAND, {
      value: true,
    });
  }

  toJSON(): MeshlyErrorJSON<Code> {
    return {
      code: this.code,
      message: this.message,
      name: this.name,
      provider: this.provider,
      providerCode: this.providerCode,
      status: this.status,
    };
  }
}

/**
 * True when `error` is a `MeshlyError` (from any copy of the package) and, when `codes` are given, has one of them.
 * Narrows `code` to those values.
 */
export const isMeshlyError = <Code extends string = string>(
  error: unknown,
  ...codes: readonly Code[]
): error is MeshlyError<Code> =>
  typeof error === "object" &&
  error !== null &&
  BRAND in error &&
  "code" in error &&
  (codes.length === 0 || codes.includes(error.code as Code));
