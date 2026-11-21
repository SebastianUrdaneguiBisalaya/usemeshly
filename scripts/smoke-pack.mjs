// Packs every publishable package, installs the tarballs into a throwaway project with npm (as a consumer would),
// and checks that every subpath in `exports`:
// - loads with `import` and with `require`, exposing the same non-empty set of exports;
// - has types under both conditions (`.mts` and `.cts` with `moduleResolution: nodenext`) that declare every
//   runtime export.
// Run after `pnpm run build`. Needs network access to install the packages' own dependencies.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
/** Runs a command and returns its stdout; on failure, prints that stdout (tsc reports errors there) and rethrows. */
const run = (command, args, cwd) => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: [
        "ignore",
        "pipe",
        "inherit",
      ],
    });
  } catch (error) {
    process.stdout.write(error.stdout ?? "");
    throw error;
  }
};

const packages = readdirSync(join(root, "packages"))
  .map((name) => join(root, "packages", name))
  .filter((dir) => existsSync(join(dir, "package.json")))
  .map((dir) => ({
    dir,
    manifest: JSON.parse(readFileSync(join(dir, "package.json"), "utf8")),
  }))
  .filter(({ manifest }) => manifest.private !== true);

const work = mkdtempSync(join(tmpdir(), "usemeshly-smoke-"));
try {
  const tarballs = join(work, "tarballs");
  const project = join(work, "project");
  for (const { dir, manifest } of packages) {
    if (!existsSync(join(dir, "dist"))) {
      throw new Error(
        `${manifest.name} has no dist/: run \`pnpm run build\` first`,
      );
    }
    run(
      "pnpm",
      [
        "pack",
        "--pack-destination",
        tarballs,
      ],
      dir,
    );
  }

  mkdirSync(project);
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({
      name: "usemeshly-smoke",
      private: true,
    }),
  );
  run(
    "npm",
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--ignore-scripts",
      "--no-package-lock",
      ...readdirSync(tarballs).map((file) => join(tarballs, file)),
    ],
    project,
  );

  const specifiers = packages.flatMap(({ manifest }) =>
    Object.keys(manifest.exports)
      .filter((subpath) => subpath !== "./package.json")
      .map((subpath) => `${manifest.name}${subpath.slice(1)}`),
  );

  // Runtime: the same exports through `import` and `require`.
  writeFileSync(
    join(project, "runtime.mjs"),
    `import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const result = {};
for (const specifier of ${JSON.stringify(specifiers)}) {
  const esm = Object.keys(await import(specifier)).sort();
  const cjs = Object.keys(require(specifier)).sort();
  if (esm.length === 0) throw new Error(specifier + " exports nothing");
  if (esm.join() !== cjs.join()) {
    throw new Error(specifier + " differs between ESM [" + esm + "] and CJS [" + cjs + "]");
  }
  result[specifier] = esm;
}
console.log(JSON.stringify(result));
`,
  );
  const exportsBySpecifier = JSON.parse(
    run(
      "node",
      [
        "runtime.mjs",
      ],
      project,
    ),
  );

  // Types: every runtime export is declared, under the `import` and the `require` condition.
  const access = (name, specifier) =>
    exportsBySpecifier[specifier]
      .map((key) => `void ${name}.${key};`)
      .join("\n");
  writeFileSync(
    join(project, "types.mts"),
    specifiers
      .map(
        (specifier, i) =>
          `import * as m${i} from "${specifier}";\n${access(`m${i}`, specifier)}`,
      )
      .join("\n"),
  );
  writeFileSync(
    join(project, "types.cts"),
    specifiers
      .map(
        (specifier, i) =>
          `import m${i} = require("${specifier}");\n${access(`m${i}`, specifier)}`,
      )
      .join("\n"),
  );
  writeFileSync(
    join(project, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        lib: [
          "ES2022",
          "DOM",
          "DOM.Iterable",
        ],
        module: "nodenext",
        moduleResolution: "nodenext",
        noEmit: true,
        strict: true,
        types: [],
      },
      files: [
        "types.mts",
        "types.cts",
      ],
    }),
  );
  const tsc = createRequire(
    join(root, "packages", "auth", "package.json"),
  ).resolve("typescript/bin/tsc");
  run(
    "node",
    [
      tsc,
      "-p",
      project,
    ],
    project,
  );

  for (const [specifier, keys] of Object.entries(exportsBySpecifier)) {
    console.log(`✓ ${specifier} (ESM + CJS + types): ${keys.length} exports`);
  }
} finally {
  rmSync(work, {
    force: true,
    recursive: true,
  });
}
