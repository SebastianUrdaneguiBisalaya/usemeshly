import type {
  CallOptions,
  Coordinates,
  DateRange,
  Days,
  Exact,
  GridOptions,
  TimeOptions,
  Units,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type {
  SEASONAL_DAILY,
  SEASONAL_HOURLY,
  SEASONAL_MODELS,
  SEASONAL_MONTHLY,
  SEASONAL_WEEKLY,
} from "./variables";

export type SeasonalHourlyVariable = keyof typeof SEASONAL_HOURLY;
export type SeasonalDailyVariable = keyof typeof SEASONAL_DAILY;
export type SeasonalWeeklyVariable = keyof typeof SEASONAL_WEEKLY;
export type SeasonalMonthlyVariable = keyof typeof SEASONAL_MONTHLY;
export type SeasonalModel = (typeof SEASONAL_MODELS)[number];

/** Parameters of the Seasonal Forecast API (`/v1/seasonal`), from `seasonal.yml`. */
export type SeasonalParams = Coordinates &
  TimeOptions &
  Units &
  Days &
  DateRange &
  GridOptions & {
    /** Hourly variables to return (6-hourly in the source models). */
    hourly?: readonly SeasonalHourlyVariable[];
    /** Daily aggregations to return. */
    daily?: readonly SeasonalDailyVariable[];
    /** Weekly means and anomalies to return. */
    weekly?: readonly SeasonalWeeklyVariable[];
    /** Monthly means and anomalies to return. */
    monthly?: readonly SeasonalMonthlyVariable[];
    /** One or more seasonal models. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly SeasonalModel[];
  };

export type SeasonalResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof SEASONAL_HOURLY, "series", true> &
    Section<P, "daily", typeof SEASONAL_DAILY, "series", true> &
    Section<P, "weekly", typeof SEASONAL_WEEKLY, "series", true> &
    Section<P, "monthly", typeof SEASONAL_MONTHLY, "series", true>
>;

/**
 * Seasonal forecasts up to 7 months ahead (`forecast_days` 0-217, default 183) from ensemble models such as ECMWF
 * SEAS5, with every member (`<variable>_memberNN`) and weekly and monthly anomalies.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const season = await meteo.seasonal({ latitude: 52.52, longitude: 13.41, daily: ["temperature_2m_max"] });
 * season.daily.temperature_2m_max_member01;
 * ```
 */
export type SeasonalMethod = <const P extends SeasonalParams>(
  params: Exact<P, SeasonalParams>,
  options?: CallOptions,
) => Promise<SeasonalResponse<P>>;
