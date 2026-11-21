import { vi } from "vitest";
import { createOpenMeteoClient } from "../src/index";

export const API_KEY = "om-secret-key-123456";

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

export const failure = (status: number, reason: string): Response =>
  json(
    {
      error: true,
      reason,
    },
    status,
  );

/** What every weather response carries. */
export const META = {
  elevation: 38,
  generationtime_ms: 0.05,
  latitude: 52.52,
  longitude: 13.41,
  timezone: "GMT",
  timezone_abbreviation: "GMT",
  utc_offset_seconds: 0,
};

/** A weather body with `section` holding `values` for each variable (and matching units). */
export const weather = (
  sections: Record<string, Record<string, unknown>>,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    ...META,
  };
  for (const [name, values] of Object.entries(sections)) {
    body[name] = values;
    body[`${name}_units`] = Object.fromEntries(
      Object.keys(values).map((key) => [
        key,
        key === "time" ? "iso8601" : "unit",
      ]),
    );
  }
  return body;
};

export const mockFetch = (respond: () => Response | Promise<Response>) =>
  vi.fn(async (_url: string, _init: RequestInit) => respond());

export type MockFetch = ReturnType<typeof mockFetch>;

export const free = (fetch: MockFetch) =>
  createOpenMeteoClient({
    fetch,
    plan: "free",
  });

export const commercial = (fetch: MockFetch) =>
  createOpenMeteoClient({
    apiKey: API_KEY,
    fetch,
    plan: "commercial",
  });

export const calledUrl = (fetch: MockFetch, index = 0): URL =>
  new URL(fetch.mock.calls[index]?.[0] ?? "");

export const rejection = async (
  promise: Promise<unknown>,
): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
};
