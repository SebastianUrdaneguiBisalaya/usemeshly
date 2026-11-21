import { MeshlyError } from "./errors";

/**
 * Throws `unsupported_environment` in a browser-like runtime (one with both `window` and `document`, such as a web page
 * or an Electron renderer). usemeshly handles client secrets and users' tokens, which must never reach code shipped to
 * an end user. Node.js, Deno, Bun and edge workers have no `document`, so they pass.
 *
 * Every function that receives credentials calls it; importing a package (for types or constants) never does.
 * Integrations call it in their own client factories.
 */
export const assertServerRuntime = (): void => {
  const scope = globalThis as {
    window?: unknown;
    document?: unknown;
  };
  if (
    typeof scope.window !== "undefined" &&
    typeof scope.document !== "undefined"
  ) {
    throw new MeshlyError({
      code: "unsupported_environment",
      message:
        "usemeshly must only run server-side (a backend, serverless function, CLI or desktop main process). Never expose client secrets or user tokens to a browser bundle.",
    });
  }
};
