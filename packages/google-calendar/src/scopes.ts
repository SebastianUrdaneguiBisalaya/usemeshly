/**
 * Granted scopes as Google returns them (space-separated), as a list (`OAuthTokens.scopes`), or null when unknown,
 * which counts as nothing granted.
 */
export type GrantedScopes = string | readonly string[] | null;

const toSet = (granted: GrantedScopes): Set<string> =>
  new Set(
    granted === null
      ? []
      : typeof granted === "string"
        ? granted.split(" ").filter((scope) => scope !== "")
        : granted,
  );

/**
 * The scopes in `required` that `granted` lacks, in the order they were required. Google lets users grant only some
 * of the requested scopes, so check before calling an API that needs them.
 */
export const missingScopes = (
  granted: GrantedScopes,
  required: readonly string[],
): string[] => {
  const have = toSet(granted);
  return required.filter((scope) => !have.has(scope));
};

/** True when `granted` covers every scope in `required`. */
export const hasScopes = (
  granted: GrantedScopes,
  required: readonly string[],
): boolean => missingScopes(granted, required).length === 0;
