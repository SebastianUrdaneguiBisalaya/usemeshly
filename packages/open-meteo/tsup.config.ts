import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
  },
  // Kept as imports so the consumer's single copy of @usemeshly/auth is shared.
  external: [
    "@usemeshly/auth",
  ],
  format: [
    "esm",
    "cjs",
  ],
  outDir: "dist",
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
  platform: "neutral",
  skipNodeModulesBundle: true,
  sourcemap: true,
  splitting: false,
  target: "es2022",
  treeshake: true,
  // Without the source `paths` of tsconfig.base.json, which would bundle @usemeshly/auth into this package.
  tsconfig: "tsconfig.build.json",
});
