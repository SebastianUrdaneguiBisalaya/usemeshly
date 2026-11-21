import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // Same mapping as `paths` in tsconfig.base.json: tests run against the sources, not a stale build.
    alias: [
      {
        find: /^@usemeshly\/auth$/,
        replacement: source("./packages/auth/src/index.ts"),
      },
      {
        find: /^@usemeshly\/auth\/(.+)$/,
        replacement: source("./packages/auth/src/$1/index.ts"),
      },
    ],
  },
  test: {
    include: [
      "packages/*/tests/**/*.test.ts",
    ],
    passWithNoTests: true,
  },
});
