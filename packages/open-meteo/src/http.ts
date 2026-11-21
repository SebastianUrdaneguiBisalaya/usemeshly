import type { FetchLike } from "@usemeshly/auth";
import { apiKeyQueryParam } from "@usemeshly/auth/basic";
import { z } from "zod";
import { meteoError, statusCode } from "./errors";
import type { CallOptions } from "./weather/params";

/** Default deadline per HTTP request, in milliseconds. */
export const OPEN_METEO_REQUEST_TIMEOUT_MS = 30_000;

/** Where a request goes: the free and the commercial host of one API, and its path. */
export type Endpoint = {
  readonly path: string;
  /** `https://api.open-meteo.com` */
  readonly free: string;
  /** `https://customer-api.open-meteo.com` */
  readonly commercial: string;
};

export type Query = Readonly<Record<string, string>>;

export type Http = {
  /** The parsed JSON of a 2xx answer. */
  get: (
    endpoint: Endpoint,
    query: Query,
    call: CallOptions | undefined,
  ) => Promise<{
    label: string;
    json: unknown;
  }>;
};

export type HttpConfig = {
  fetch: FetchLike;
  timeoutMs: number;
  signal: AbortSignal | undefined;
  /** Set on the commercial plan: sent as `&apikey=`. */
  apiKey: string | undefined;
};

const MAX_REASON_LENGTH = 500;

const errorBodySchema = z.object({
  reason: z.string(),
});

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const errorName = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  typeof error.name === "string"
    ? error.name
    : undefined;

export const createHttp = (config: HttpConfig): Http => {
  const secrets =
    config.apiKey === undefined
      ? []
      : [
          config.apiKey,
        ];

  const transportError = (error: unknown, label: string) => {
    const name = errorName(error);
    if (name === "TimeoutError") {
      return meteoError("timeout", `${label} did not finish in time`);
    }
    if (name === "AbortError") {
      return meteoError("aborted", `${label} was aborted`);
    }
    return meteoError(
      "network_error",
      `${label} could not reach Open-Meteo${name === undefined ? "" : ` (${name})`}`,
    );
  };

  return {
    get: async (endpoint, query, call) => {
      const base =
        config.apiKey === undefined ? endpoint.free : endpoint.commercial;
      // Labels name the host and path only: the query carries the API key on the commercial plan.
      const label = `GET ${new URL(base).host}${endpoint.path}`;
      let url = new URL(endpoint.path, base);
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
      if (config.apiKey !== undefined) {
        url = apiKeyQueryParam(url, {
          name: "apikey",
          value: config.apiKey,
        });
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
          },
          method: "GET",
          // A redirect would repeat the key-carrying URL to another host: report it instead.
          redirect: "manual",
          signal,
        });
        text = await response.text();
      } catch (error) {
        throw transportError(error, label);
      }

      const { status } = response;
      if (
        response.type === "opaqueredirect" ||
        (status >= 300 && status < 400)
      ) {
        throw meteoError(
          "api_error",
          `${label} answered with a redirect, which is not followed so the API key never reaches another host`,
          {
            status,
          },
        );
      }
      const json = parseJson(text);
      if (response.ok) {
        if (json === undefined) {
          throw meteoError(
            "invalid_response",
            `${label} returned a body that is not JSON`,
            {
              status,
            },
          );
        }
        return {
          json,
          label,
        };
      }
      const body = errorBodySchema.safeParse(json);
      const reason = body.success
        ? body.data.reason.slice(0, MAX_REASON_LENGTH)
        : undefined;
      throw meteoError(
        statusCode(status, reason),
        `${label} failed with ${status}${reason === undefined ? "" : `: ${reason}`}`,
        {
          secrets,
          status,
        },
      );
    },
  };
};

/** `json` validated with `schema`. */
export const parseWith = <Output>(
  schema: z.ZodType<Output>,
  result: {
    label: string;
    json: unknown;
  },
): Output => {
  const parsed = schema.safeParse(result.json);
  if (!parsed.success) {
    throw meteoError(
      "invalid_response",
      `${result.label} returned an unexpected body: ${z.prettifyError(parsed.error).slice(0, MAX_REASON_LENGTH)}`,
    );
  }
  return parsed.data;
};
