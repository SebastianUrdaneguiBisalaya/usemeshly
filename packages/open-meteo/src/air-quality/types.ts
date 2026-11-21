import type {
  CallOptions,
  Coordinates,
  DateRange,
  Days,
  Exact,
  TimeOptions,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type { AIR_QUALITY_CURRENT, AIR_QUALITY_HOURLY } from "./variables";

export type AirQualityHourlyVariable = keyof typeof AIR_QUALITY_HOURLY;
export type AirQualityCurrentVariable = keyof typeof AIR_QUALITY_CURRENT;
/** `auto` (default) uses CAMS Europe where available and CAMS Global elsewhere. */
export type AirQualityDomain = "auto" | "cams_europe" | "cams_global";

/** Parameters of the Air Quality API (`/v1/air-quality`), from `air-quality.yml`. */
export type AirQualityParams = Coordinates &
  TimeOptions &
  Days &
  DateRange & {
    /** Hourly pollutants, pollen and indices to return. */
    hourly?: readonly AirQualityHourlyVariable[];
    /** Current conditions to return. */
    current?: readonly AirQualityCurrentVariable[];
    /** Which CAMS domain to use. */
    domains?: AirQualityDomain;
  };

export type AirQualityResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof AIR_QUALITY_HOURLY, "series"> &
    Section<P, "current", typeof AIR_QUALITY_CURRENT, "current">
>;

/**
 * Air quality and pollen forecasts from CAMS: particulate matter, gases, pollen and the European and US AQI.
 * `forecast_days` 0-7 (default 5), `past_days` 0-92.
 *
 * **Commercial plan:** API Standard or higher.
 *
 * @example
 * ```ts
 * const air = await meteo.airQuality({ latitude: 52.52, longitude: 13.41, current: ["european_aqi", "pm2_5"] });
 * air.current.european_aqi; // number | null
 * ```
 */
export type AirQualityMethod = <const P extends AirQualityParams>(
  params: Exact<P, AirQualityParams>,
  options?: CallOptions,
) => Promise<AirQualityResponse<P>>;
