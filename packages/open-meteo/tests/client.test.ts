import { isMeshlyError, MeshlyError } from "@usemeshly/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpenMeteoFreeOptions } from "../src/index";
import { createOpenMeteoClient } from "../src/index";
import {
  API_KEY,
  calledUrl,
  commercial,
  failure,
  free,
  mockFetch,
  rejection,
  weather,
} from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const browserLike = () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {});
};

const body = () =>
  weather({
    hourly: {
      temperature_2m: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  });

const params = {
  hourly: [
    "temperature_2m",
  ],
  latitude: 52.52,
  longitude: 13.41,
} as const;

describe("createOpenMeteoClient", () => {
  it("uses the public host and no key on the free plan", async () => {
    const fetch = mockFetch(() => new Response(JSON.stringify(body())));

    await free(fetch).forecast(params);

    const url = calledUrl(fetch);
    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.pathname).toBe("/v1/forecast");
    expect(url.searchParams.has("apikey")).toBe(false);
    expect(fetch.mock.calls[0]?.[1].redirect).toBe("manual");
  });

  it("uses the customer- host and &apikey= on the commercial plan", async () => {
    const fetch = mockFetch(() => new Response(JSON.stringify(body())));

    await commercial(fetch).forecast(params);

    const url = calledUrl(fetch);
    expect(url.origin).toBe("https://customer-api.open-meteo.com");
    expect(url.searchParams.get("apikey")).toBe(API_KEY);
    expect(url.searchParams.get("latitude")).toBe("52.52");
  });

  it("redacts the key from errors", async () => {
    const fetch = mockFetch(() =>
      failure(400, `The supplied API key is invalid: apikey=${API_KEY}`),
    );

    const error = await rejection(commercial(fetch).forecast(params));

    expect(isMeshlyError(error, "unauthorized")).toBe(true);
    const meshly = error as MeshlyError;
    expect(meshly).toBeInstanceOf(MeshlyError);
    expect(meshly.message).not.toContain(API_KEY);
    expect(JSON.stringify(meshly)).not.toContain(API_KEY);
    expect(meshly.cause).toBeUndefined();
    expect(meshly.stack ?? "").not.toContain(API_KEY);
  });

  it("never puts the URL in transport errors", async () => {
    const fetch = mockFetch(() => {
      throw new TypeError(`fetch failed for ?apikey=${API_KEY}`);
    });

    const error = await rejection(commercial(fetch).forecast(params));

    expect(isMeshlyError(error, "network_error")).toBe(true);
    expect(String(error)).not.toContain(API_KEY);
    expect((error as Error).message).toBe(
      "GET customer-api.open-meteo.com/v1/forecast could not reach Open-Meteo (TypeError)",
    );
  });

  it("rejects an apiKey on the free plan, and a bad or missing key on commercial", () => {
    expect(() =>
      createOpenMeteoClient({
        apiKey: API_KEY,
        plan: "free",
      } as unknown as OpenMeteoFreeOptions),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_argument",
      }),
    );
    for (const apiKey of [
      "",
      "has space",
      "line\nbreak",
      undefined,
    ]) {
      expect(() =>
        createOpenMeteoClient({
          apiKey: apiKey as string,
          plan: "commercial",
        }),
      ).toThrow(
        expect.objectContaining({
          code: "invalid_argument",
        }),
      );
    }
  });

  it("rejects an unknown plan and a bad timeout", () => {
    expect(() =>
      createOpenMeteoClient({
        plan: "enterprise",
      } as unknown as OpenMeteoFreeOptions),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_argument",
      }),
    );
    expect(() =>
      createOpenMeteoClient({
        plan: "free",
        timeoutMs: -1,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_argument",
      }),
    );
  });

  it("refuses the commercial plan in a browser-like runtime", () => {
    browserLike();

    expect(() =>
      createOpenMeteoClient({
        apiKey: API_KEY,
        plan: "commercial",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported_environment",
      }),
    );
  });

  it("allows the free plan in a browser-like runtime (it holds no secret)", () => {
    browserLike();

    expect(
      createOpenMeteoClient({
        plan: "free",
      }).plan,
    ).toBe("free");
  });

  it("does not expose the key on the client", () => {
    expect(
      JSON.stringify(commercial(mockFetch(() => failure(500, "")))),
    ).not.toContain(API_KEY);
  });
});
