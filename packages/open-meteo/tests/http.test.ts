import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it, vi } from "vitest";
import { createOpenMeteoClient } from "../src/index";
import {
  commercial,
  failure,
  free,
  json,
  mockFetch,
  rejection,
} from "./helpers";

const params = {
  hourly: [
    "temperature_2m",
  ],
  latitude: 52.52,
  longitude: 13.41,
} as const;

describe("error mapping", () => {
  it("maps {error, reason} with 400 to bad_request and keeps the reason", async () => {
    const fetch = mockFetch(() =>
      failure(400, "Latitude must be in range of -90 to 90°. Given: 200.0."),
    );

    const error = await rejection(free(fetch).forecast(params));

    expect(isMeshlyError(error, "bad_request")).toBe(true);
    expect(error).toMatchObject({
      message:
        "GET api.open-meteo.com/v1/forecast failed with 400: Latitude must be in range of -90 to 90°. Given: 200.0.",
      provider: "open-meteo",
      status: 400,
    });
  });

  it("maps an invalid key (400) to unauthorized", async () => {
    const fetch = mockFetch(() =>
      failure(400, "The supplied API key is invalid."),
    );

    const error = await rejection(commercial(fetch).forecast(params));

    expect(isMeshlyError(error, "unauthorized")).toBe(true);
  });

  it.each([
    [
      401,
      "unauthorized",
    ],
    [
      403,
      "unauthorized",
    ],
    [
      429,
      "rate_limited",
    ],
    [
      500,
      "server_error",
    ],
    [
      502,
      "server_error",
    ],
    [
      404,
      "api_error",
    ],
  ] as const)("maps %i to %s", async (status, code) => {
    const fetch = mockFetch(() => failure(status, "reason"));

    const error = await rejection(commercial(fetch).forecast(params));

    expect(isMeshlyError(error, code)).toBe(true);
    expect(error).toMatchObject({
      status,
    });
    expect((error as Error).message).toContain(": reason");
  });

  it("handles an error without a JSON body", async () => {
    const fetch = mockFetch(
      () =>
        new Response("<html>Bad Gateway</html>", {
          status: 502,
        }),
    );

    const error = await rejection(free(fetch).forecast(params));

    expect(isMeshlyError(error, "server_error")).toBe(true);
    expect((error as Error).message).toBe(
      "GET api.open-meteo.com/v1/forecast failed with 502",
    );
  });

  it("does not follow a redirect", async () => {
    const fetch = mockFetch(
      () =>
        new Response(null, {
          headers: {
            location: "https://elsewhere.example",
          },
          status: 302,
        }),
    );

    const error = await rejection(commercial(fetch).forecast(params));

    expect(isMeshlyError(error, "api_error")).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a 200 that is not JSON or doesn't match", async () => {
    const notJson = await rejection(
      free(mockFetch(() => new Response("nope"))).forecast(params),
    );
    const wrongShape = await rejection(
      free(
        mockFetch(() =>
          json({
            latitude: 1,
          }),
        ),
      ).forecast(params),
    );

    expect(isMeshlyError(notJson, "invalid_response")).toBe(true);
    expect(isMeshlyError(wrongShape, "invalid_response")).toBe(true);
  });
});

describe("transport", () => {
  it("maps the caller's abort", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      init.signal?.throwIfAborted();
      return json({});
    });

    const error = await rejection(
      createOpenMeteoClient({
        fetch,
        plan: "free",
      }).forecast(params, {
        signal: controller.signal,
      }),
    );

    expect(isMeshlyError(error, "aborted")).toBe(true);
  });

  it("maps the deadline", async () => {
    const fetch = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const error = await rejection(
      createOpenMeteoClient({
        fetch,
        plan: "free",
        timeoutMs: 5,
      }).forecast(params),
    );

    expect(isMeshlyError(error, "timeout")).toBe(true);
  });
});
