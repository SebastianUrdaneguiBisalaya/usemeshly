import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import {
  API_KEY,
  calledUrl,
  commercial,
  failure,
  free,
  json,
  mockFetch,
  rejection,
} from "../helpers";

const berlin = {
  admin1: "State of Berlin",
  admin1_id: 2950157,
  country: "Germany",
  country_code: "DE",
  country_id: 2921044,
  elevation: 74,
  feature_code: "PPLC",
  id: 2950159,
  latitude: 52.52437,
  longitude: 13.41053,
  name: "Berlin",
  population: 3426354,
  postcodes: [
    "10967",
  ],
  timezone: "Europe/Berlin",
};

describe("geocoding.search", () => {
  it("returns the matching locations", async () => {
    const fetch = mockFetch(() =>
      json({
        generationtime_ms: 0.1,
        results: [
          berlin,
        ],
      }),
    );

    const results = await free(fetch).geocoding.search("Berlin", {
      count: 1,
      countryCode: "DE",
      language: "de",
    });

    expect(results).toEqual([
      berlin,
    ]);
    const url = calledUrl(fetch);
    expect(url.origin).toBe("https://geocoding-api.open-meteo.com");
    expect(url.pathname).toBe("/v1/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      count: "1",
      countryCode: "DE",
      format: "json",
      language: "de",
      name: "Berlin",
    });
  });

  it("returns [] when nothing matches (results is absent)", async () => {
    const fetch = mockFetch(() =>
      json({
        generationtime_ms: 0.05,
      }),
    );

    await expect(free(fetch).geocoding.search("zzzzqqq")).resolves.toEqual([]);
  });

  it("uses the customer- host with the key", async () => {
    const fetch = mockFetch(() => json({}));

    await commercial(fetch).geocoding.search("Lima");

    expect(calledUrl(fetch).origin).toBe(
      "https://customer-geocoding-api.open-meteo.com",
    );
    expect(calledUrl(fetch).searchParams.get("apikey")).toBe(API_KEY);
  });

  it.each([
    [
      "",
      {},
    ],
    [
      "Berlin",
      {
        count: 0,
      },
    ],
    [
      "Berlin",
      {
        count: 101,
      },
    ],
    [
      "Berlin",
      {
        language: "EN",
      },
    ],
    [
      "Berlin",
      {
        countryCode: "DEU",
      },
    ],
  ])("rejects %j %j before any request", async (name, options) => {
    const fetch = mockFetch(() => json({}));

    const error = await rejection(free(fetch).geocoding.search(name, options));

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("geocoding.get", () => {
  it("returns the location by id", async () => {
    const fetch = mockFetch(() => json(berlin));

    await expect(free(fetch).geocoding.get(2950159)).resolves.toEqual(berlin);
    expect(calledUrl(fetch).pathname).toBe("/v1/get");
    expect(calledUrl(fetch).searchParams.get("id")).toBe("2950159");
  });

  it("maps an unknown id to bad_request", async () => {
    const fetch = mockFetch(() => failure(400, "Location ID not found."));

    const error = await rejection(free(fetch).geocoding.get(1));

    expect(isMeshlyError(error, "bad_request")).toBe(true);
    expect((error as Error).message).toContain("Location ID not found.");
  });

  it("rejects a non-integer id", async () => {
    const error = await rejection(
      free(mockFetch(() => json({}))).geocoding.get(1.5),
    );

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
  });
});
