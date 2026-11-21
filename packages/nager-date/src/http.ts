import type { FetchLike } from "@usemeshly/auth";
import { z } from "zod";
import { nagerError, statusCode } from "./errors";
import type { CallOptions } from "./types";

/**
 * Where both plans are served. `date.nager.at` now redirects the Pro API (and the website) here, and redirects are
 * never followed, so the `x-api-key` header can't be sent to another host.
 */
export const NAGER_DATE_BASE_URL = "https://nagerholidays.com";

/** Default deadline per HTTP request, in milliseconds. */
export const NAGER_DATE_REQUEST_TIMEOUT_MS = 30_000;

/** A 2xx answer: its status and raw body (empty for `204 No Content`). */
export type HttpResult = {
  label: string;
  status: number;
  text: string;
};

export type Http = {
  get: (
    segments: readonly (string | number)[],
    call: CallOptions | undefined,
    query?: Record<string, number | undefined>,
  ) => Promise<HttpResult>;
};

export type HttpConfig = {
  fetch: FetchLike;
  timeoutMs: number;
  signal: AbortSignal | undefined;
  /** `/api/v4` or `/api/pro/v1`. */
  prefix: string;
  /** Extra headers (the Pro API key). */
  headers: Readonly<Record<string, string>>;
  /** Redacted from every error message. */
  secrets: readonly string[];
};

const MAX_DETAIL_LENGTH = 500;

/** ASP.NET's `ProblemDetails` / `ValidationProblemDetails`. */
const problemSchema = z.object({
  detail: z.string().nullish(),
  errors: z.record(z.string(), z.array(z.string())).nullish(),
  title: z.string().nullish(),
});

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** `title: detail (field: message; field: message)`, or "" when the body isn't a problem document. */
const problemDetail = (text: string): string => {
  const problem = problemSchema.safeParse(parseJson(text));
  if (!problem.success) return "";
  const { title, detail, errors } = problem.data;
  const summary = [
    title,
    detail,
  ]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join(": ");
  const fields = Object.entries(errors ?? {})
    .map(([field, messages]) => `${field}: ${messages.join(" ")}`)
    .join("; ");
  const full = fields === "" ? summary : `${summary} (${fields})`;
  return full.length > MAX_DETAIL_LENGTH
    ? `${full.slice(0, MAX_DETAIL_LENGTH)}…`
    : full;
};

const errorName = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  typeof error.name === "string"
    ? error.name
    : undefined;

export const createHttp = (config: HttpConfig): Http => {
  const transportError = (error: unknown, label: string) => {
    const name = errorName(error);
    if (name === "TimeoutError") {
      return nagerError("timeout", `${label} did not finish in time`);
    }
    if (name === "AbortError") {
      return nagerError("aborted", `${label} was aborted`);
    }
    return nagerError(
      "network_error",
      `${label} could not reach Nager.Date${name === undefined ? "" : ` (${name})`}`,
    );
  };

  return {
    get: async (segments, call, query = {}) => {
      const path = `${config.prefix}/${segments.map((segment) => encodeURIComponent(String(segment))).join("/")}`;
      const label = `GET ${path}`;
      const url = new URL(path, NAGER_DATE_BASE_URL);
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
      const signal = AbortSignal.any(
        [
          AbortSignal.timeout(config.timeoutMs),
          config.signal,
          call?.signal,
        ].filter((item): item is AbortSignal => item !== undefined),
      );

      let response: Response;
      let text: string;
      try {
        response = await config.fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            ...config.headers,
          },
          method: "GET",
          // A redirect could carry the API key to another host: report it instead.
          redirect: "manual",
          signal,
        });
        text = response.status === 204 ? "" : await response.text();
      } catch (error) {
        throw transportError(error, label);
      }

      const { status } = response;
      if (
        response.type === "opaqueredirect" ||
        (status >= 300 && status < 400)
      ) {
        throw nagerError(
          "api_error",
          `${label} answered with a redirect, which is not followed so the API key never reaches another host`,
          {
            status,
          },
        );
      }
      if (response.ok) {
        return {
          label,
          status,
          text,
        };
      }
      const detail = problemDetail(text);
      throw nagerError(
        statusCode(status),
        `${label} failed with ${status}${detail === "" ? "" : `: ${detail}`}`,
        {
          secrets: config.secrets,
          status,
        },
      );
    },
  };
};

/** The body of a 2xx answer, validated with `schema`. */
export const parseBody = <Output>(
  schema: z.ZodType<Output>,
  result: HttpResult,
): Output => {
  const json = parseJson(result.text);
  if (json === undefined) {
    throw nagerError(
      "invalid_response",
      `${result.label} returned a body that is not JSON`,
      {
        status: result.status,
      },
    );
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw nagerError(
      "invalid_response",
      `${result.label} returned an unexpected body: ${z.prettifyError(parsed.error)}`,
      {
        status: result.status,
      },
    );
  }
  return parsed.data;
};

/** Like `parseBody`, but `204 No Content` (and an empty 2xx body) is an empty list. */
export const parseList = <Item>(
  schema: z.ZodType<Item>,
  result: HttpResult,
): Item[] =>
  result.status === 204 || result.text === ""
    ? []
    : parseBody(z.array(schema), result);
