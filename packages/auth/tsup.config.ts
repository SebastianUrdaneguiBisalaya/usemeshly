import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  // One entry per subpath export: importing `@usemeshly/auth/basic` never loads the OAuth code.
  entry: {
    basic: "src/basic/index.ts",
    index: "src/index.ts",
    oauth: "src/oauth/index.ts",
  },
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
  // Shared code (MeshlyError) lives in one chunk, so every subpath sees the same class.
  splitting: true,
  target: "es2022",
  treeshake: true,
});
