import type {
  CallOptions,
  Coordinates,
  Days,
  ElevationOption,
  Exact,
  GridOptions,
  Hours,
  RequiredDateRange,
  TiltedIrradiance,
  TimeOptions,
  Units,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type {
  HISTORICAL_DAILY,
  HISTORICAL_HOURLY,
  HISTORICAL_MODELS,
} from "./variables";

export type HistoricalHourlyVariable = keyof typeof HISTORICAL_HOURLY;
export type HistoricalDailyVariable = keyof typeof HISTORICAL_DAILY;
/** A reanalysis: `best_match` (default), ERA5, ERA5-Land, CERRA, … */
export type HistoricalModel = (typeof HISTORICAL_MODELS)[number];

/** Parameters of the Historical Weather API (`/v1/archive`), from `historical-weather.yml`. */
export type HistoricalParams = Coordinates &
  RequiredDateRange &
  TimeOptions &
  Units &
  Days &
  Hours &
  GridOptions &
  ElevationOption &
  TiltedIrradiance & {
    /** Hourly variables to return. */
    hourly?: readonly HistoricalHourlyVariable[];
    /** Daily aggregations to return. Set `timezone` too, so days start at local midnight. */
    daily?: readonly HistoricalDailyVariable[];
    /** One or more reanalysis models. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly HistoricalModel[];
  };

export type HistoricalResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof HISTORICAL_HOURLY, "series"> &
    Section<P, "daily", typeof HISTORICAL_DAILY, "series">
>;

/**
 * Historical weather from reanalysis models (ERA5 and others), from 1940 to a few days ago, for any location.
 * `start_date` and `end_date` are required.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const past = await meteo.historical({
 *   latitude: 52.52,
 *   longitude: 13.41,
 *   start_date: "2024-01-01",
 *   end_date: "2024-01-31",
 *   daily: ["temperature_2m_mean", "precipitation_sum"],
 *   timezone: "Europe/Berlin",
 * });
 * ```
 */
export type HistoricalMethod = <const P extends HistoricalParams>(
  params: Exact<P, HistoricalParams>,
  options?: CallOptions,
) => Promise<HistoricalResponse<P>>;
