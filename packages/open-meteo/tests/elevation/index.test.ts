import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import {
  API_KEY,
  calledUrl,
  commercial,
  free,
  json,
  mockFetch,
  rejection,
} from "../helpers";

describe("elevation", () => {
  it("returns one elevation per coordinate", async () => {
    const fetch = mockFetch(() =>
      json({
        elevation: [
          38,
          46,
        ],
      }),
    );

    const elevations = await free(fetch).elevation({
      latitude: [
        52.52,
        48.85,
      ],
      longitude: [
        13.41,
        2.35,
      ],
    });

    expect(elevations).toEqual([
      38,
      46,
    ]);
    const url = calledUrl(fetch);
    expect(url.origin).toBe("https://api.open-meteo.com");
    expect(url.pathname).toBe("/v1/elevation");
    expect(url.searchParams.get("latitude")).toBe("52.52,48.85");
  });

  it("uses the customer- host with the key", async () => {
    const fetch = mockFetch(() =>
      json({
        elevation: [
          38,
        ],
      }),
    );

    await commercial(fetch).elevation({
      latitude: 52.52,
      longitude: 13.41,
    });

    expect(calledUrl(fetch).origin).toBe("https://customer-api.open-meteo.com");
    expect(calledUrl(fetch).searchParams.get("apikey")).toBe(API_KEY);
  });

  it("rejects bad coordinates and extra parameters before any request", async () => {
    const fetch = mockFetch(() => json({}));
    const client = free(fetch);

    for (const params of [
      {
        latitude: 91,
        longitude: 0,
      },
      {
        hourly: [],
        latitude: 0,
        longitude: 0,
      },
    ]) {
      const error = await rejection(client.elevation(params as never));
      expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
