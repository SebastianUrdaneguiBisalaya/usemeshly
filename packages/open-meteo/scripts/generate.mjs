// Generates src/<resource>/variables.ts: the variable names, value kinds, models and day ranges of every Open-Meteo
// API, with each variable's label from the docs as TSDoc.
//
// Sources (cloned locally, never committed):
//   - open-meteo/open-meteo: openapi/*.yml, the specs (variables, value types, models, ranges).
//   - open-meteo/open-meteo-website: src/routes/en/docs/**/options.ts, the doc pages (labels, and the variables and
//     models of the APIs without a spec).
//
// Usage:
//   git clone --depth 1 https://github.com/open-meteo/open-meteo.git /tmp/open-meteo
//   git clone --depth 1 https://github.com/open-meteo/open-meteo-website.git /tmp/open-meteo-website
//   node scripts/generate.mjs /tmp/open-meteo /tmp/open-meteo-website
//   pnpm exec biome check --write src
//
// Update the commits in README.md ("API sources") after regenerating.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";

const [specRepo, webRepo] = process.argv.slice(2);
if (specRepo === undefined || webRepo === undefined) {
  throw new Error(
    "usage: node scripts/generate.mjs <open-meteo checkout> <open-meteo-website checkout>",
  );
}
const packageDir = resolve(import.meta.dirname, "..");
const commit = (repo) =>
  execFileSync("git", [
    "-C",
    repo,
    "rev-parse",
    "HEAD",
  ])
    .toString()
    .trim();
const specCommit = commit(specRepo);
const webCommit = commit(webRepo);

// ---- Labels from the doc pages ----------------------------------------------------------------------------------

const docsDir = join(webRepo, "src/routes/en/docs");
const optionFiles = [
  join(docsDir, "options.ts"),
  join(docsDir, "ensemble-options.ts"),
  ...readdirSync(docsDir, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(docsDir, entry.name, "options.ts"))
    .filter((path) => {
      try {
        readFileSync(path);
        return true;
      } catch {
        return false;
      }
    }),
];
const OPTION =
  /\{\s*value:\s*'([A-Za-z0-9_]+)',\s*label:\s*'((?:[^'\\]|\\.)*)'/g;
const labels = new Map();
for (const file of optionFiles) {
  for (const [, value, label] of readFileSync(file, "utf8").matchAll(OPTION)) {
    if (!labels.has(value)) labels.set(value, label.replace(/\\'/g, "'"));
  }
}

const docsOptions = (page, exportName) => {
  const text = readFileSync(join(docsDir, page, "options.ts"), "utf8");
  const start = text.indexOf(`export const ${exportName} =`);
  if (start === -1) throw new Error(`${page}/options.ts has no ${exportName}`);
  const next = text.indexOf("\nexport const ", start + 1);
  const block = text.slice(start, next === -1 ? undefined : next);
  return [
    ...block.matchAll(OPTION),
  ].map(([, value]) => value);
};

/** The doc label, or one built from the base variable for levels, depths and previous days. */
const labelOf = (name) => {
  if (labels.has(name)) return labels.get(name);
  const level = name.match(/^(.+)_(\d+)hPa$/);
  if (level !== null && labels.has(level[1])) {
    return `${labels.get(level[1])} (${level[2]} hPa)`;
  }
  const height = name.match(/^(.+)_(\d+)m$/);
  if (height !== null && labels.has(height[1])) {
    return `${labels.get(height[1])} (${height[2]} m)`;
  }
  const previous = name.match(/^(.+)_previous_day(\d)$/);
  if (previous !== null) {
    return `${labelOf(previous[1]) ?? previous[1]}, as forecast ${previous[2]} day(s) before`;
  }
  // Seasonal aggregates: `<variable>_mean`, `<variable>_anomaly`, …
  const aggregate = name.match(
    /^(.+)_(mean|anomaly|min|max|sum|spread|median|p\d+)$/,
  );
  if (aggregate !== null) {
    const base = labelOf(aggregate[1]);
    if (base !== undefined) return `${base} (${aggregate[2]})`;
  }
  // No label on any page: the name itself, readable.
  return name.replace(/_/g, " ");
};

// ---- Specs ------------------------------------------------------------------------------------------------------

const spec = (file) => {
  const document = parse(readFileSync(join(specRepo, "openapi", file), "utf8"));
  const [path, item] = Object.entries(document.paths)[0];
  return {
    operation: item.get,
    path,
    servers: item.servers.map((server) => server.url),
  };
};

const parameter = (operation, name) =>
  operation.parameters.find((item) => item.name === name);

const enumOf = (operation, name) => {
  const schema = parameter(operation, name)?.schema;
  return schema?.items?.enum ?? schema?.enum ?? [];
};

const range = (operation, name) => {
  const schema = parameter(operation, name)?.schema;
  return schema?.minimum === undefined
    ? undefined
    : [
        schema.minimum,
        schema.maximum,
        schema.default,
      ];
};

/** `time` for values that are ISO 8601 strings (or Unix seconds with `timeformat=unixtime`), else `number`. */
const kindOf = (property) => {
  const type = property?.items?.type ?? property?.type;
  const types = Array.isArray(type)
    ? type
    : [
        type,
      ];
  return types.includes("string") ? "time" : "number";
};

const specSection = (operation, section) => {
  const names = enumOf(operation, section);
  const response =
    operation.responses["200"].content["application/json"].schema.properties[
      section
    ]?.properties ?? {};
  return names.map((name) => [
    name,
    kindOf(response[name]),
  ]);
};

// ---- Emit -------------------------------------------------------------------------------------------------------

const comment = (text) =>
  text === undefined ? "" : `  /** ${text.replace(/\*\//g, "* /")} */\n`;

const variablesConst = (constName, description, entries) =>
  `/** ${description} The value is the variable's kind: \`time\` values are ISO 8601 strings (Unix seconds with \`timeformat: "unixtime"\`). */\nexport const ${constName} = {\n${entries
    .map(([name, kind]) => `${comment(labelOf(name))}  ${name}: "${kind}",\n`)
    .join("")}} as const;\n`;

const listConst = (constName, description, values) =>
  `/** ${description} */\nexport const ${constName} = [\n${values.map((value) => `${comment(labelOf(value))}  "${value}",\n`).join("")}] as const;\n`;

const header = (sources) =>
  `// Generated by scripts/generate.mjs. Do not edit: regenerate instead.\n// Sources:\n${sources.map((source) => `//   ${source}\n`).join("")}\n`;

const specSource = (file) =>
  `open-meteo/open-meteo@${specCommit.slice(0, 12)} openapi/${file}`;
const docsSource = (page) =>
  `open-meteo/open-meteo-website@${webCommit.slice(0, 12)} src/routes/en/docs/${page}`;

const SECTION_DESCRIPTIONS = {
  current:
    "Variables for `current` (the conditions now, at 15-minutely resolution).",
  daily: "Daily aggregation variables for `daily`.",
  hourly: "Hourly variables for `hourly`.",
  minutely_15: "15-minutely variables for `minutely_15`.",
  monthly: "Monthly aggregation variables for `monthly`.",
  weekly: "Weekly aggregation variables for `weekly`.",
};

const write = (resource, content) => {
  writeFileSync(join(packageDir, "src", resource, "variables.ts"), content);
  console.log(`wrote src/${resource}/variables.ts`);
};

const constName = (prefix, section) => `${prefix}_${section.toUpperCase()}`;

/**
 * One API with a spec: its sections, models, limits and hosts. `modelPages` are doc pages whose `models` are added to
 * the spec's enum: the regional model pages use values the spec doesn't list yet.
 */
const fromSpec = (resource, prefix, file, sections, modelPages = []) => {
  const { operation, path, servers } = spec(file);
  const specModels = enumOf(operation, "models");
  const extraModels = [
    ...new Set(modelPages.flatMap((page) => docsOptions(page, "models"))),
  ].filter((model) => !specModels.includes(model));
  const parts = [
    header([
      specSource(file),
      ...modelPages.map((page) => docsSource(`${page}/options.ts`)),
    ]),
  ];
  parts.push(
    `/** \`${path}\` on ${servers.map((server) => `\`${server}\``).join(" (free) and ")} (commercial). */\nexport const ${prefix}_ENDPOINT = { path: "${path}", free: "${servers[0]}", commercial: "${servers[1]}" } as const;\n`,
  );
  for (const section of sections) {
    parts.push(
      variablesConst(
        constName(prefix, section),
        SECTION_DESCRIPTIONS[section],
        specSection(operation, section),
      ),
    );
  }
  const models = [
    ...specModels,
    ...extraModels,
  ];
  if (models.length > 0) {
    parts.push(listConst(`${prefix}_MODELS`, "Values for `models`.", models));
  }
  const limits = {};
  for (const name of [
    "past_days",
    "forecast_days",
  ]) {
    const value = range(operation, name);
    if (value !== undefined) limits[name] = value;
  }
  parts.push(
    `/** \`[minimum, maximum, default]\` of the day ranges, from the spec. */\nexport const ${prefix}_LIMITS = ${JSON.stringify(limits)} as const;\n`,
  );
  write(resource, parts.join("\n"));
  return {
    operation,
    sections: Object.fromEntries(
      sections.map((section) => [
        section,
        specSection(operation, section),
      ]),
    ),
  };
};

/** The regional model pages: the Forecast API with their own `models`. */
const REGIONAL_PAGES = readdirSync(docsDir, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((page) => {
    try {
      return (
        readFileSync(join(docsDir, page, "+page.svelte"), "utf8").includes(
          "api.open-meteo.com/v1/forecast",
        ) &&
        readFileSync(join(docsDir, page, "options.ts"), "utf8").includes(
          "export const models",
        )
      );
    } catch {
      return false;
    }
  })
  .filter(
    (page) =>
      ![
        "historical-forecast-api",
        "previous-runs-api",
        "single-runs-api",
        "satellite-radiation-api",
        "seasonal-forecast-api",
      ].includes(page),
  )
  .sort();

const forecast = fromSpec(
  "forecast",
  "FORECAST",
  "forecast.yml",
  [
    "hourly",
    "daily",
    "current",
    "minutely_15",
  ],
  REGIONAL_PAGES,
);
fromSpec("historical", "HISTORICAL", "historical-weather.yml", [
  "hourly",
  "daily",
]);
fromSpec("air-quality", "AIR_QUALITY", "air-quality.yml", [
  "hourly",
  "current",
]);
fromSpec("marine", "MARINE", "marine.yml", [
  "hourly",
  "daily",
  "current",
  "minutely_15",
]);
fromSpec(
  "ensemble",
  "ENSEMBLE",
  "ensemble.yml",
  [
    "hourly",
    "daily",
  ],
  [
    "ensemble-mean-api",
    "google-weathernext-api",
  ],
);
fromSpec("climate", "CLIMATE", "climate.yml", [
  "daily",
]);
fromSpec("flood", "FLOOD", "flood.yml", [
  "daily",
]);
fromSpec("seasonal", "SEASONAL", "seasonal.yml", [
  "hourly",
  "daily",
  "weekly",
  "monthly",
]);

// ---- APIs documented only on the website ------------------------------------------------------------------------

// Previous Runs: hourly forecast variables, plus `<variable>_previous_day<1-7>` for the variables the page lists.
{
  const page = "previous-runs-api";
  const bases = [
    ...new Set([
      ...docsOptions(page, "previousDay"),
      ...docsOptions(page, "solarVariables"),
      ...docsOptions(page, "windVariables"),
    ]),
  ];
  const previous = bases.flatMap((base) =>
    [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
    ].map((day) => [
      `${base}_previous_day${day}`,
      "number",
    ]),
  );
  write(
    "previous-runs",
    [
      header([
        docsSource(`${page}/options.ts`),
        docsSource(`${page}/+page.svelte`),
      ]),
      variablesConst(
        "PREVIOUS_RUNS_HOURLY",
        "The `_previous_dayN` variables for `hourly`: the value forecast N days (N × 24 hours) before its valid time. `_previous_day0` is the plain variable name.",
        previous,
      ),
    ].join("\n"),
  );
}

// Satellite Radiation: its own variables and models.
{
  const page = "satellite-radiation-api";
  const hourly = [
    ...new Set([
      ...docsOptions(page, "hourly"),
      ...docsOptions(page, "additionalVariables"),
    ]),
  ].map((name) => [
    name,
    "number",
  ]);
  const daily = docsOptions(page, "daily").map((name) => [
    name,
    name === "sunrise" || name === "sunset" ? "time" : "number",
  ]);
  write(
    "satellite-radiation",
    [
      header([
        docsSource(`${page}/options.ts`),
      ]),
      variablesConst("SATELLITE_HOURLY", SECTION_DESCRIPTIONS.hourly, hourly),
      variablesConst("SATELLITE_DAILY", SECTION_DESCRIPTIONS.daily, daily),
      listConst(
        "SATELLITE_MODELS",
        "Values for `models`.",
        docsOptions(page, "models"),
      ),
    ].join("\n"),
  );
}

console.log(
  `forecast: ${Object.entries(forecast.sections)
    .map(([section, entries]) => `${section} ${entries.length}`)
    .join(", ")}; labels found ${labels.size}`,
);
console.log(`regional pages: ${REGIONAL_PAGES.join(", ")}`);
console.log(`spec commit ${specCommit}\nwebsite commit ${webCommit}`);
