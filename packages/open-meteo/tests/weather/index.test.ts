import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import {
  calledUrl,
  free,
  json,
  META,
  mockFetch,
  rejection,
  weather,
} from "../helpers";

const ok = () =>
  mockFetch(() =>
    json(
      weather({
        hourly: {
          temperature_2m: [
            1,
          ],
          time: [
            "2026-11-21T00:00",
          ],
        },
      }),
    ),
  );

const base = {
  hourly: [
    "temperature_2m",
  ],
  latitude: 52.52,
  longitude: 13.41,
} as const;

/** Calls `forecast` with untyped params, as plain JavaScript would. */
const forecastWith = (
  fetch: ReturnType<typeof mockFetch>,
  params: Record<string, unknown>,
) => free(fetch).forecast(params as never);

describe("parameter validation", () => {
  it.each<
    [
      string,
      Record<string, unknown>,
    ]
  >([
    [
      "latitude above 90",
      {
        latitude: 90.5,
      },
    ],
    [
      "longitude below -180",
      {
        longitude: -181,
      },
    ],
    [
      "latitude NaN",
      {
        latitude: Number.NaN,
      },
    ],
    [
      "coordinate arrays of different lengths",
      {
        latitude: [
          1,
          2,
        ],
        longitude: [
          1,
        ],
      },
    ],
    [
      "an array and a number",
      {
        latitude: [
          1,
        ],
        longitude: 1,
      },
    ],
    [
      "empty coordinates",
      {
        latitude: [],
        longitude: [],
      },
    ],
    [
      "forecast_days above 16",
      {
        forecast_days: 17,
      },
    ],
    [
      "past_days above 92",
      {
        past_days: 93,
      },
    ],
    [
      "a fractional past_days",
      {
        past_days: 1.5,
      },
    ],
    [
      "negative forecast_hours",
      {
        forecast_hours: -1,
      },
    ],
    [
      "tilt above 90",
      {
        tilt: 91,
      },
    ],
    [
      "an unknown variable",
      {
        hourly: [
          "temperature_3m",
        ],
      },
    ],
    [
      "a daily variable in hourly",
      {
        hourly: [
          "sunrise",
        ],
      },
    ],
    [
      "an unknown model",
      {
        models: [
          "my_model",
        ],
      },
    ],
    [
      "an unknown unit",
      {
        temperature_unit: "kelvin",
      },
    ],
    [
      "an unknown parameter",
      {
        hourlyy: [
          "temperature_2m",
        ],
      },
    ],
    [
      "a malformed date",
      {
        end_date: "2026-11-02",
        start_date: "2026-1-1",
      },
    ],
    [
      "an impossible date",
      {
        end_date: "2026-03-01",
        start_date: "2026-02-30",
      },
    ],
    [
      "start_date without end_date",
      {
        start_date: "2026-01-01",
      },
    ],
    [
      "start_date after end_date",
      {
        end_date: "2026-01-01",
        start_date: "2026-01-02",
      },
    ],
    [
      "a timezone with spaces",
      {
        timezone: "Europe/Berlin&x=1",
      },
    ],
  ])("rejects %s before any request", async (_case, override) => {
    const fetch = ok();

    const error = await rejection(
      forecastWith(fetch, {
        ...base,
        ...override,
      }),
    );

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts the limits of each range", async () => {
    const fetch = ok();

    await forecastWith(fetch, {
      ...base,
      azimuth: -90,
      forecast_days: 16,
      latitude: -90,
      longitude: 180,
      past_days: 92,
      tilt: 90,
      timezone: "America/Argentina/Buenos_Aires",
    });

    const url = calledUrl(fetch);
    expect(url.searchParams.get("forecast_days")).toBe("16");
    expect(url.searchParams.get("past_days")).toBe("92");
    expect(url.searchParams.get("timezone")).toBe(
      "America/Argentina/Buenos_Aires",
    );
  });

  it("writes lists comma-separated and skips empty ones", async () => {
    const fetch = mockFetch(() =>
      json(
        weather({
          hourly: {
            precipitation: [
              0,
            ],
            temperature_2m: [
              1,
            ],
            time: [
              "2026-11-21T00:00",
            ],
          },
        }),
      ),
    );

    await free(fetch).forecast({
      daily: [],
      hourly: [
        "temperature_2m",
        "precipitation",
      ],
      latitude: 52.52,
      longitude: 13.41,
      timezone: "auto",
    });

    const url = calledUrl(fetch);
    expect(url.searchParams.get("hourly")).toBe("temperature_2m,precipitation");
    expect(url.searchParams.has("daily")).toBe(false);
    expect(url.searchParams.get("timezone")).toBe("auto");
  });
});

describe("responses", () => {
  it("returns an array for several coordinates", async () => {
    const location = weather({
      hourly: {
        temperature_2m: [
          1,
        ],
        time: [
          "2026-11-21T00:00",
        ],
      },
    });
    const fetch = mockFetch(() =>
      json([
        location,
        {
          ...location,
          latitude: 48.85,
        },
      ]),
    );

    const result = await free(fetch).forecast({
      ...base,
      latitude: [
        52.52,
        48.85,
      ],
      longitude: [
        13.41,
        2.35,
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[1]?.latitude).toBe(48.85);
    expect(calledUrl(fetch).searchParams.get("latitude")).toBe("52.52,48.85");
    expect(calledUrl(fetch).searchParams.get("longitude")).toBe("13.41,2.35");
  });

  it("wraps a single location requested as an array", async () => {
    const result = await free(ok()).forecast({
      ...base,
      latitude: [
        52.52,
      ],
      longitude: [
        13.41,
      ],
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("keeps nulls and strips variables that weren't requested", async () => {
    const fetch = mockFetch(() =>
      json(
        weather({
          hourly: {
            temperature_2m: [
              1.5,
              null,
            ],
            time: [
              "2026-11-21T00:00",
              "2026-11-21T01:00",
            ],
            wind_speed_10m: [
              3,
              4,
            ],
          },
        }),
      ),
    );

    const result = await free(fetch).forecast(base);

    expect(result.hourly).toEqual({
      temperature_2m: [
        1.5,
        null,
      ],
      time: [
        "2026-11-21T00:00",
        "2026-11-21T01:00",
      ],
    });
    expect(result.hourly_units.temperature_2m).toBe("unit");
    expect(result).toMatchObject(META);
  });

  it("expects one key per model with several models", async () => {
    const fetch = mockFetch(() =>
      json(
        weather({
          hourly: {
            temperature_2m_icon_global: [
              1,
            ],
            temperature_2m_ncep_gfs_seamless: [
              2,
            ],
            time: [
              "2026-11-21T00:00",
            ],
          },
        }),
      ),
    );

    const result = await free(fetch).forecast({
      ...base,
      models: [
        "icon_global",
        "ncep_gfs_seamless",
      ],
    });

    expect(result.hourly.temperature_2m_icon_global).toEqual([
      1,
    ]);
    expect(result.hourly.temperature_2m_ncep_gfs_seamless).toEqual([
      2,
    ]);
    expect(calledUrl(fetch).searchParams.get("models")).toBe(
      "icon_global,ncep_gfs_seamless",
    );
  });

  it("parses timestamps as numbers with timeformat=unixtime", async () => {
    const fetch = mockFetch(() =>
      json(
        weather({
          daily: {
            sunrise: [
              1795240000,
            ],
            time: [
              1795219200,
            ],
          },
        }),
      ),
    );

    const result = await free(fetch).forecast({
      daily: [
        "sunrise",
      ],
      latitude: 52.52,
      longitude: 13.41,
      timeformat: "unixtime",
    });

    expect(result.daily.time).toEqual([
      1795219200,
    ]);
    expect(result.daily.sunrise).toEqual([
      1795240000,
    ]);
  });

  it("parses current conditions as scalars", async () => {
    const fetch = mockFetch(() =>
      json({
        ...META,
        current: {
          interval: 900,
          time: "2026-11-21T17:15",
          weather_code: 61,
        },
        current_units: {
          interval: "seconds",
          time: "iso8601",
          weather_code: "wmo code",
        },
      }),
    );

    const result = await free(fetch).forecast({
      current: [
        "weather_code",
      ],
      latitude: 52.52,
      longitude: 13.41,
    });

    expect(result.current).toEqual({
      interval: 900,
      time: "2026-11-21T17:15",
      weather_code: 61,
    });
  });

  it("rejects a requested variable that is missing", async () => {
    const fetch = mockFetch(() =>
      json(
        weather({
          hourly: {
            time: [
              "2026-11-21T00:00",
            ],
          },
        }),
      ),
    );

    const error = await rejection(free(fetch).forecast(base));

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });
});
