import type {
  CallOptions,
  Coordinates,
  DateRange,
  Days,
  ElevationOption,
  Exact,
  GridOptions,
  Hours,
  TiltedIrradiance,
  TimeOptions,
  Units,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type {
  FORECAST_CURRENT,
  FORECAST_DAILY,
  FORECAST_HOURLY,
  FORECAST_MINUTELY_15,
  FORECAST_MODELS,
} from "./variables";

export type ForecastHourlyVariable = keyof typeof FORECAST_HOURLY;
export type ForecastDailyVariable = keyof typeof FORECAST_DAILY;
export type ForecastCurrentVariable = keyof typeof FORECAST_CURRENT;
export type ForecastMinutely15Variable = keyof typeof FORECAST_MINUTELY_15;
/**
 * A weather model: `best_match` (default) or a national model (ECMWF, GFS, DWD ICON, Météo-France, JMA, …). The
 * regional "APIs" of the docs are this endpoint with one of these values.
 */
export type ForecastModel = (typeof FORECAST_MODELS)[number];

/** Parameters of the Forecast API (`/v1/forecast`), from `forecast.yml`. */
export type ForecastParams = Coordinates &
  TimeOptions &
  Units &
  Days &
  Hours &
  DateRange &
  GridOptions &
  ElevationOption &
  TiltedIrradiance & {
    /** Hourly variables to return. */
    hourly?: readonly ForecastHourlyVariable[];
    /** Daily aggregations to return. Set `timezone` too, so days start at local midnight. */
    daily?: readonly ForecastDailyVariable[];
    /** Current conditions to return. */
    current?: readonly ForecastCurrentVariable[];
    /** 15-minutely variables to return (native in Central Europe and North America, interpolated elsewhere). */
    minutely_15?: readonly ForecastMinutely15Variable[];
    /** One or more weather models. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly ForecastModel[];
  };

/** The response for `P`: only the requested sections and variables exist. An array for several coordinates. */
export type ForecastResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof FORECAST_HOURLY, "series"> &
    Section<P, "daily", typeof FORECAST_DAILY, "series"> &
    Section<P, "current", typeof FORECAST_CURRENT, "current"> &
    Section<P, "minutely_15", typeof FORECAST_MINUTELY_15, "series">
>;

/**
 * Weather forecast for any location: up to 16 days (`forecast_days` 0-16, default 7) and up to 92 past days
 * (`past_days` 0-92), hourly, daily, 15-minutely and current. Combines the best models for each location unless
 * `models` is set.
 *
 * **Commercial plan:** API Standard or higher.
 *
 * @example
 * ```ts
 * const weather = await meteo.forecast({
 *   latitude: 52.52,
 *   longitude: 13.41,
 *   hourly: ["temperature_2m", "precipitation"],
 *   daily: ["temperature_2m_max"],
 *   timezone: "auto",
 * });
 * weather.hourly.temperature_2m; // (number | null)[]
 * weather.hourly_units.temperature_2m; // "°C"
 * ```
 */
export type ForecastMethod = <const P extends ForecastParams>(
  params: Exact<P, ForecastParams>,
  options?: CallOptions,
) => Promise<ForecastResponse<P>>;
