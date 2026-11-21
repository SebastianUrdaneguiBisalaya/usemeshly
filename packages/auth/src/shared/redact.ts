/** What a redacted value is replaced with. */
export const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS =
  "access_token|refresh_token|id_token|client_secret|code_verifier|code|token|password|api_key|apikey|assertion|secret|authorization";

const PATTERNS: readonly [
  RegExp,
  string,
][] = [
  // `key=value` in query strings and form bodies.
  [
    new RegExp(`\\b(${SENSITIVE_KEYS})=([^&\\s"']+)`, "gi"),
    `$1=${REDACTED}`,
  ],
  // `"key": "value"` in JSON bodies.
  [
    new RegExp(`"(${SENSITIVE_KEYS})"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"`, "gi"),
    `"$1":"${REDACTED}"`,
  ],
  // `Authorization` header values.
  [
    /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi,
    `$1 ${REDACTED}`,
  ],
];

/**
 * `text` with every value in `secrets` and anything shaped like a credential (token parameters, JSON token fields,
 * `Bearer`/`Basic` values) replaced by `[REDACTED]`.
 */
export const redact = (
  text: string,
  secrets: readonly (string | null | undefined)[] = [],
): string => {
  let result = text;
  for (const secret of secrets) {
    if (secret !== null && secret !== undefined && secret !== "") {
      result = result.split(secret).join(REDACTED);
    }
  }
  for (const [pattern, replacement] of PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};
