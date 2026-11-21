import type {
  CallOptions,
  Coordinates,
  DateRange,
  Days,
  Exact,
  GridOptions,
  LengthUnit,
  TemperatureUnit,
  TimeOptions,
  WindSpeedUnit,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type {
  MARINE_CURRENT,
  MARINE_DAILY,
  MARINE_HOURLY,
  MARINE_MINUTELY_15,
  MARINE_MODELS,
} from "./variables";

export type MarineHourlyVariable = keyof typeof MARINE_HOURLY;
export type MarineDailyVariable = keyof typeof MARINE_DAILY;
export type MarineCurrentVariable = keyof typeof MARINE_CURRENT;
export type MarineMinutely15Variable = keyof typeof MARINE_MINUTELY_15;
export type MarineModel = (typeof MARINE_MODELS)[number];

/** Parameters of the Marine API (`/v1/marine`), from `marine.yml`. */
export type MarineParams = Coordinates &
  TimeOptions &
  Days &
  DateRange &
  GridOptions & {
    /** `celsius` (default) or `fahrenheit`, for sea surface temperature. */
    temperature_unit?: TemperatureUnit;
    /** `kmh` (default), `ms`, `mph` or `kn`, for ocean currents. */
    wind_speed_unit?: WindSpeedUnit;
    /** `metric` (default, metres) or `imperial` (feet), for wave heights. */
    length_unit?: LengthUnit;
    /** Hourly wave and ocean variables to return. */
    hourly?: readonly MarineHourlyVariable[];
    /** Daily aggregations to return. */
    daily?: readonly MarineDailyVariable[];
    /** Current conditions to return. */
    current?: readonly MarineCurrentVariable[];
    /** 15-minutely variables to return. */
    minutely_15?: readonly MarineMinutely15Variable[];
    /** One or more wave models. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly MarineModel[];
  };

export type MarineResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof MARINE_HOURLY, "series"> &
    Section<P, "daily", typeof MARINE_DAILY, "series"> &
    Section<P, "current", typeof MARINE_CURRENT, "current"> &
    Section<P, "minutely_15", typeof MARINE_MINUTELY_15, "series">
>;

/**
 * Wave, swell and ocean forecasts: wave height, direction and period, sea surface temperature, currents and sea level.
 * `forecast_days` 0-16 (default 7), `past_days` 0-92. Coastal accuracy is limited.
 *
 * **Commercial plan:** API Standard or higher.
 *
 * @example
 * ```ts
 * const sea = await meteo.marine({ latitude: 54.54, longitude: 10.23, hourly: ["wave_height", "wave_direction"] });
 * ```
 */
export type MarineMethod = <const P extends MarineParams>(
  params: Exact<P, MarineParams>,
  options?: CallOptions,
) => Promise<MarineResponse<P>>;
