import { z } from "zod";
import { meteoError } from "../errors";
import type { Endpoint, Http, Query } from "../http";
import { parseWith } from "../http";
import type { CallOptions } from "./params";
import type { VariableKinds } from "./response";

/** How a parameter is checked before the request and written to the query. */
export type ParamRule =
  | {
      type: "enum";
      values: readonly string[];
    }
  | {
      /** A list sent comma-separated, e.g. `models`. */
      type: "list";
      values: readonly string[];
    }
  | {
      type: "integer";
      min: number;
      max?: number;
    }
  | {
      type: "number";
      min?: number;
      max?: number;
    }
  | {
      type: "boolean";
    }
  | {
      type: "date";
    }
  | {
      /** `YYYY-MM-DDTHH:MM`. */
      type: "datetime";
    }
  | {
      type: "timezone";
    };

export type SectionDef = {
  kinds: VariableKinds;
  shape: "series" | "current";
};

/** Everything the engine needs to know about one weather API. */
export type WeatherApi = {
  endpoint: Endpoint;
  sections: Readonly<Record<string, SectionDef>>;
  params: Readonly<Record<string, ParamRule>>;
  /** Parameters that must be present (e.g. `start_date`, `run`). */
  required?: readonly string[];
  /** Ensemble members (`<variable>_memberNN`) can come back next to the requested variables. */
  members?: boolean;
};

const invalid = (message: string) => meteoError("invalid_argument", message);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
/** IANA names (`America/Argentina/Buenos_Aires`, `Etc/GMT+5`), `GMT`, `UTC` or `auto`. */
const TIMEZONE = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/;

const isValidDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const coordinateList = (
  name: string,
  value: unknown,
  limit: number,
): number[] => {
  const values = Array.isArray(value)
    ? value
    : [
        value,
      ];
  if (values.length === 0) {
    throw invalid(`${name} must have at least one value`);
  }
  for (const item of values) {
    if (
      typeof item !== "number" ||
      !Number.isFinite(item) ||
      Math.abs(item) > limit
    ) {
      throw invalid(`${name} must be a number from -${limit} to ${limit}`);
    }
  }
  return values as number[];
};

/** `latitude` and `longitude` checked and written to the query; true when several locations were requested. */
export const coordinates = (
  params: Record<string, unknown>,
  query: Record<string, string>,
): boolean => {
  const { latitude, longitude } = params;
  const latitudes = coordinateList("latitude", latitude, 90);
  const longitudes = coordinateList("longitude", longitude, 180);
  const several = Array.isArray(latitude);
  if (
    several !== Array.isArray(longitude) ||
    latitudes.length !== longitudes.length
  ) {
    throw invalid(
      "latitude and longitude must both be numbers, or arrays of the same length",
    );
  }
  Object.assign(query, {
    latitude: latitudes.join(","),
    longitude: longitudes.join(","),
  });
  return several;
};

const checkRule = (name: string, rule: ParamRule, value: unknown): string => {
  switch (rule.type) {
    case "enum":
      if (typeof value !== "string" || !rule.values.includes(value)) {
        throw invalid(`${name} must be one of ${rule.values.join(", ")}`);
      }
      return value;
    case "list": {
      if (
        !Array.isArray(value) ||
        !value.every(
          (item) => typeof item === "string" && rule.values.includes(item),
        )
      ) {
        throw invalid(
          `${name} must be an array of supported values (see the type for the list)`,
        );
      }
      return value.join(",");
    }
    case "integer":
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < rule.min ||
        (rule.max !== undefined && value > rule.max)
      ) {
        throw invalid(
          rule.max === undefined
            ? `${name} must be an integer of at least ${rule.min}`
            : `${name} must be an integer from ${rule.min} to ${rule.max}`,
        );
      }
      return String(value);
    case "number":
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        (rule.min !== undefined && value < rule.min) ||
        (rule.max !== undefined && value > rule.max)
      ) {
        throw invalid(
          rule.min === undefined || rule.max === undefined
            ? `${name} must be a finite number`
            : `${name} must be a number from ${rule.min} to ${rule.max}`,
        );
      }
      return String(value);
    case "boolean":
      if (typeof value !== "boolean") {
        throw invalid(`${name} must be a boolean`);
      }
      return String(value);
    case "date":
      if (typeof value !== "string" || !isValidDate(value)) {
        throw invalid(`${name} must be a date as YYYY-MM-DD`);
      }
      return value;
    case "datetime":
      if (
        typeof value !== "string" ||
        !ISO_DATETIME.test(value) ||
        !isValidDate(value.slice(0, 10))
      ) {
        throw invalid(
          `${name} must be a UTC date and time as YYYY-MM-DDTHH:MM`,
        );
      }
      return value;
    case "timezone":
      if (
        typeof value !== "string" ||
        value.length > 64 ||
        !TIMEZONE.test(value)
      ) {
        throw invalid(
          `${name} must be "auto" or an IANA time zone name, e.g. Europe/Berlin`,
        );
      }
      return value;
  }
};

type Plan = {
  query: Query;
  several: boolean;
  /** Section → the response keys to expect, each with the variable it holds. */
  sections: Map<
    string,
    (readonly [
      key: string,
      variable: string,
    ])[]
  >;
  unixtime: boolean;
};

/** Checks every parameter (nothing is sent on failure) and builds the query. */
export const planRequest = (api: WeatherApi, params: unknown): Plan => {
  if (typeof params !== "object" || params === null) {
    throw invalid("params must be an object");
  }
  const input = params as Record<string, unknown>;
  const query: Record<string, string> = {};
  const several = coordinates(input, query);
  const requested = new Map<string, string[]>();

  for (const [name, value] of Object.entries(input)) {
    if (name === "latitude" || name === "longitude" || value === undefined) {
      continue;
    }
    const section = api.sections[name];
    if (section !== undefined) {
      if (
        !Array.isArray(value) ||
        !value.every(
          (item) =>
            typeof item === "string" && Object.hasOwn(section.kinds, item),
        )
      ) {
        throw invalid(
          `${name} must be an array of variables this API offers (see the type for the list)`,
        );
      }
      if (value.length > 0) {
        query[name] = value.join(",");
        requested.set(name, value as string[]);
      }
      continue;
    }
    const rule = api.params[name];
    if (rule === undefined) {
      throw invalid(`"${name}" is not a parameter of this API`);
    }
    query[name] = checkRule(name, rule, value);
  }

  for (const name of api.required ?? []) {
    if (input[name] === undefined) throw invalid(`${name} is required`);
  }
  const {
    start_date: startDate,
    end_date: endDate,
    models: modelList,
    timeformat,
  } = input;
  if ((startDate === undefined) !== (endDate === undefined)) {
    throw invalid("start_date and end_date must be given together");
  }
  if (
    typeof startDate === "string" &&
    typeof endDate === "string" &&
    startDate > endDate
  ) {
    throw invalid("start_date must not be after end_date");
  }

  // With two or more models, Open-Meteo suffixes every variable with the model name.
  const models = Array.isArray(modelList) ? (modelList as string[]) : [];
  const sections: Plan["sections"] = new Map();
  for (const [name, variables] of requested) {
    sections.set(
      name,
      variables.flatMap((variable) =>
        models.length >= 2
          ? models.map(
              (model) =>
                [
                  `${variable}_${model}`,
                  variable,
                ] as const,
            )
          : [
              [
                variable,
                variable,
              ] as const,
            ],
      ),
    );
  }
  return {
    query,
    sections,
    several,
    unixtime: timeformat === "unixtime",
  };
};

/** The zod schema of one location's response, for exactly what was requested. */
const locationSchema = (api: WeatherApi, plan: Plan) => {
  const time = plan.unixtime ? z.number() : z.string();
  const nullableValue = (kind: "number" | "time") =>
    (kind === "time" ? time : z.number()).nullable();
  const shape: Record<string, z.ZodType> = {
    elevation: z.number().optional(),
    generationtime_ms: z.number(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string(),
    timezone_abbreviation: z.string(),
    utc_offset_seconds: z.number(),
  };
  for (const [name, keys] of plan.sections) {
    const section = api.sections[name];
    if (section === undefined) continue;
    const values: Record<string, z.ZodType> = {};
    const units: Record<string, z.ZodType> = {
      time: z.string(),
    };
    for (const [key, variable] of keys) {
      const kind = section.kinds[variable] ?? "number";
      values[key] =
        section.shape === "current"
          ? nullableValue(kind)
          : z.array(nullableValue(kind));
      units[key] = z.string();
    }
    if (section.shape === "current") {
      Object.assign(values, {
        interval: z.number(),
        time,
      });
      Object.assign(units, {
        interval: z.string(),
      });
    } else {
      Object.assign(values, {
        time: z.array(time),
      });
    }
    shape[name] = api.members
      ? z.object(values).catchall(z.array(z.number().nullable()))
      : z.object(values);
    shape[`${name}_units`] = api.members
      ? z.object(units).catchall(z.string())
      : z.object(units);
  }
  return z.object(shape);
};

/** Validates, sends and parses one weather request. */
export const fetchWeather = async (
  http: Http,
  api: WeatherApi,
  params: unknown,
  call: CallOptions | undefined,
): Promise<unknown> => {
  const plan = planRequest(api, params);
  const result = await http.get(api.endpoint, plan.query, call);
  const location = locationSchema(api, plan);
  if (!plan.several) return parseWith(location, result);
  // A list with a single location comes back as one object: normalize it to an array.
  return parseWith(
    z.union([
      z.array(location),
      location.transform((item) => [
        item,
      ]),
    ]),
    result,
  );
};

/** A typed method over one weather API. Its signature (in each resource's `types.ts`) infers the response type. */
export const weatherMethod = <Method>(http: Http, api: WeatherApi): Method =>
  ((params: unknown, options?: CallOptions) =>
    fetchWeather(http, api, params, options)) as Method;
