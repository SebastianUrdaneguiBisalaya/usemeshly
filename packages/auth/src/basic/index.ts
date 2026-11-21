import { assertServerRuntime } from "../shared/environment";
import type { CommonErrorCode } from "../shared/errors";
import { MeshlyError } from "../shared/errors";

/** Error codes raised by `@usemeshly/auth/basic`. */
export type BasicAuthErrorCode = Extract<
  CommonErrorCode,
  "invalid_argument" | "unsupported_environment"
>;

/** An HTTP header field name (RFC 9110 token). */
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const isControl = (code: number): boolean => code < 0x20 || code === 0x7f;

/** No control characters: CR and LF would inject headers. */
const hasNoControl = (value: string): boolean =>
  [
    ...value,
  ].every((char) => !isControl(char.charCodeAt(0)));

/** Non-empty, without whitespace or control characters. */
const isCredential = (value: string): boolean =>
  value !== "" &&
  [
    ...value,
  ].every((char) => {
    const code = char.charCodeAt(0);
    return !isControl(code) && code !== 0x20;
  });

const invalid = (message: string): MeshlyError<BasicAuthErrorCode> =>
  new MeshlyError({
    code: "invalid_argument",
    message,
  });

const assertCredential = (name: string, value: string): void => {
  // The value itself never goes into the message.
  if (typeof value !== "string" || !isCredential(value)) {
    throw invalid(
      `${name} must be a non-empty string without whitespace or control characters`,
    );
  }
};

const base64Utf8 = (text: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)));

export type BasicCredentials = {
  /** May not contain `:`, which separates it from the password. */
  username: string;
  password: string;
};

/**
 * An `Authorization: Basic …` header (RFC 7617, UTF-8). The credentials are encoded, not stored.
 *
 * @example
 * ```ts
 * await fetch(url, { headers: basicAuthHeader({ username: apiUser, password: apiPassword }) });
 * ```
 */
export const basicAuthHeader = (
  credentials: BasicCredentials,
): {
  readonly Authorization: string;
} => {
  assertServerRuntime();
  const { username, password } = credentials;
  if (
    typeof username !== "string" ||
    username === "" ||
    username.includes(":") ||
    !hasNoControl(username)
  ) {
    throw invalid(
      "username must be a non-empty string without ':' or control characters",
    );
  }
  if (typeof password !== "string" || !hasNoControl(password)) {
    throw invalid("password must be a string without control characters");
  }
  return {
    Authorization: `Basic ${base64Utf8(`${username}:${password}`)}`,
  };
};

/**
 * An `Authorization: Bearer …` header (RFC 6750).
 *
 * @example
 * ```ts
 * await fetch(url, { headers: bearerAuthHeader(accessToken) });
 * ```
 */
export const bearerAuthHeader = (
  token: string,
): {
  readonly Authorization: string;
} => {
  assertServerRuntime();
  assertCredential("token", token);
  return {
    Authorization: `Bearer ${token}`,
  };
};

export type ApiKeyHeaderOptions<Header extends string> = {
  /** The header that carries the key. Defaults to `X-API-Key`. */
  header?: Header;
  /** Written before the key with a space, e.g. `Token` gives `Token <key>`. */
  prefix?: string;
};

/**
 * An API key header, `X-API-Key: <key>` by default.
 *
 * @example
 * ```ts
 * apiKeyHeader(key, { header: "Authorization", prefix: "Token" }); // { Authorization: "Token <key>" }
 * ```
 */
export const apiKeyHeader = <Header extends string = "X-API-Key">(
  key: string,
  options: ApiKeyHeaderOptions<Header> = {},
): Readonly<Record<Header, string>> => {
  assertServerRuntime();
  const header = (options.header ?? "X-API-Key") as Header;
  if (!HEADER_NAME.test(header)) {
    throw invalid(`"${header}" is not a valid header name`);
  }
  if (options.prefix !== undefined && !HEADER_NAME.test(options.prefix)) {
    throw invalid("prefix must be a single token, e.g. Token or ApiKey");
  }
  assertCredential("key", key);
  return {
    [header]: options.prefix === undefined ? key : `${options.prefix} ${key}`,
  } as Record<Header, string>;
};
