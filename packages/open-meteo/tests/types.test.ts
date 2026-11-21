// Type tests: checked by `pnpm run typecheck` (tsc includes tests/). The functions below are never called; they only
// have to compile. They also hold every `@example` from the TSDoc, so a wrong variable name in the docs fails here.
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ForecastParams,
  OpenMeteoClient,
  OpenMeteoCommercialOptions,
  OpenMeteoFreeOptions,
} from "../src/index";

const inference = async (meteo: OpenMeteoClient) => {
  const r = await meteo.forecast({
    current: [
      "weather_code",
    ],
    daily: [
      "sunrise",
      "temperature_2m_max",
    ],
    hourly: [
      "temperature_2m",
      "precipitation",
    ],
    latitude: 52.52,
    longitude: 13.41,
  });
  expectTypeOf(r.hourly.temperature_2m).toEqualTypeOf<(number | null)[]>();
  expectTypeOf(r.hourly.precipitation).toEqualTypeOf<(number | null)[]>();
  expectTypeOf(r.hourly.time).toEqualTypeOf<string[]>();
  expectTypeOf(r.hourly_units.temperature_2m).toEqualTypeOf<string>();
  expectTypeOf(r.daily.sunrise).toEqualTypeOf<(string | null)[]>();
  expectTypeOf(r.current.weather_code).toEqualTypeOf<number | null>();
  expectTypeOf(r.current.interval).toEqualTypeOf<number>();
  expectTypeOf(r.latitude).toEqualTypeOf<number>();
  // @ts-expect-error wind_speed_10m was not requested
  r.hourly.wind_speed_10m;
  // @ts-expect-error minutely_15 was not requested
  r.minutely_15;

  // Unix time: timestamps become numbers.
  const unix = await meteo.forecast({
    daily: [
      "sunset",
    ],
    latitude: 1,
    longitude: 2,
    timeformat: "unixtime",
  });
  expectTypeOf(unix.daily.time).toEqualTypeOf<number[]>();
  expectTypeOf(unix.daily.sunset).toEqualTypeOf<(number | null)[]>();

  // Several coordinates: an array of results.
  const many = await meteo.forecast({
    hourly: [
      "temperature_2m",
    ],
    latitude: [
      52.52,
      48.85,
    ],
    longitude: [
      13.41,
      2.35,
    ],
  });
  expectTypeOf(many).toBeArray();
  expectTypeOf(many[0]?.hourly.temperature_2m).toEqualTypeOf<
    (number | null)[] | undefined
  >();

  // Several models: one key per model.
  const models = await meteo.forecast({
    hourly: [
      "temperature_2m",
    ],
    latitude: 1,
    longitude: 2,
    models: [
      "icon_global",
      "ecmwf_ifs025",
    ],
  });
  expectTypeOf(models.hourly.temperature_2m_icon_global).toEqualTypeOf<
    (number | null)[]
  >();
  // @ts-expect-error with several models there is no plain key
  models.hourly.temperature_2m;

  // Ensemble members.
  const ensemble = await meteo.ensemble({
    hourly: [
      "temperature_2m",
    ],
    latitude: 1,
    longitude: 2,
  });
  expectTypeOf(ensemble.hourly.temperature_2m_member01).toEqualTypeOf<
    (number | null)[] | undefined
  >();
  // @ts-expect-error members only exist for requested variables
  ensemble.hourly.precipitation_member01;

  // Previous runs accept the `_previous_dayN` variables.
  const previous = await meteo.previousRuns({
    hourly: [
      "temperature_2m_previous_day3",
    ],
    latitude: 1,
    longitude: 2,
  });
  expectTypeOf(previous.hourly.temperature_2m_previous_day3).toEqualTypeOf<
    (number | null)[]
  >();

  // Unknown variables and misspelled parameters are compile errors.
  const unknownVariable = {
    hourly: [
      "temperature_3m",
    ],
    latitude: 1,
    longitude: 2,
  } as const;
  // @ts-expect-error not a forecast variable
  await meteo.forecast(unknownVariable);
  const typo = {
    hourlyy: [
      "temperature_2m",
    ],
    latitude: 1,
    longitude: 2,
  } as const;
  // @ts-expect-error hourlyy is not a parameter
  await meteo.forecast(typo);
  const missingDates = {
    latitude: 1,
    longitude: 2,
  } as const;
  // @ts-expect-error historical requires start_date and end_date
  await meteo.historical(missingDates);
  const missingRun = {
    latitude: 1,
    longitude: 2,
  } as const;
  // @ts-expect-error singleRuns requires run
  await meteo.singleRuns(missingRun);
};

const plans = () => {
  const withKey = {
    apiKey: "k",
    plan: "free",
  } as const;
  // @ts-expect-error the free plan takes no apiKey
  const freeWithKey: OpenMeteoFreeOptions = withKey;
  // @ts-expect-error the commercial plan requires an apiKey
  const commercialWithoutKey: OpenMeteoCommercialOptions = {
    plan: "commercial",
  };
  const params: ForecastParams = {
    latitude: 1,
    longitude: 2,
  };
  return [
    freeWithKey,
    commercialWithoutKey,
    params,
  ];
};

/** Every `@example` in the TSDoc, verbatim. */
const docExamples = async (meteo: OpenMeteoClient) => {
  const weather = await meteo.forecast({
    daily: [
      "temperature_2m_max",
    ],
    hourly: [
      "temperature_2m",
      "precipitation",
    ],
    latitude: 52.52,
    longitude: 13.41,
    timezone: "auto",
  });
  weather.hourly_units.temperature_2m;
  await meteo.historical({
    daily: [
      "temperature_2m_mean",
      "precipitation_sum",
    ],
    end_date: "2024-01-31",
    latitude: 52.52,
    longitude: 13.41,
    start_date: "2024-01-01",
    timezone: "Europe/Berlin",
  });
  await meteo.historicalForecast({
    end_date: "2024-06-07",
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
    start_date: "2024-06-01",
  });
  await meteo.previousRuns({
    hourly: [
      "temperature_2m",
      "temperature_2m_previous_day1",
      "temperature_2m_previous_day3",
    ],
    latitude: 52.52,
    longitude: 13.41,
    past_days: 7,
  });
  await meteo.singleRuns({
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
    models: [
      "icon_global",
    ],
    run: "2026-11-20T00:00",
  });
  const runs = await meteo.ensemble({
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
    models: [
      "dwd_icon_seamless_eps",
    ],
  });
  runs.hourly.temperature_2m_member01;
  const season = await meteo.seasonal({
    daily: [
      "temperature_2m_max",
    ],
    latitude: 52.52,
    longitude: 13.41,
  });
  season.daily.temperature_2m_max_member01;
  await meteo.climate({
    daily: [
      "temperature_2m_max",
    ],
    end_date: "2040-12-31",
    latitude: 52.52,
    longitude: 13.41,
    models: [
      "MRI_AGCM3_2_S",
    ],
    start_date: "2040-01-01",
  });
  const air = await meteo.airQuality({
    current: [
      "european_aqi",
      "pm2_5",
    ],
    latitude: 52.52,
    longitude: 13.41,
  });
  expectTypeOf(air.current.european_aqi).toEqualTypeOf<number | null>();
  await meteo.marine({
    hourly: [
      "wave_height",
      "wave_direction",
    ],
    latitude: 54.54,
    longitude: 10.23,
  });
  await meteo.flood({
    daily: [
      "river_discharge",
    ],
    latitude: 59.91,
    longitude: 10.75,
  });
  await meteo.satelliteRadiation({
    hourly: [
      "shortwave_radiation",
    ],
    latitude: 52.52,
    longitude: 13.41,
  });
  const [berlin, paris] = await meteo.elevation({
    latitude: [
      52.52,
      48.85,
    ],
    longitude: [
      13.41,
      2.35,
    ],
  });
  const [place] = await meteo.geocoding.search("Berlin", {
    count: 1,
    language: "de",
  });
  await meteo.geocoding.get(2950159);
  const icon = await meteo.modelUpdates.get("dwd_icon");
  return [
    berlin,
    paris,
    place,
    new Date(icon.last_run_availability_time * 1000),
  ];
};

describe("types", () => {
  it("compile (checked by tsc)", () => {
    expect([
      inference,
      plans,
      docExamples,
    ]).toHaveLength(3);
  });
});
