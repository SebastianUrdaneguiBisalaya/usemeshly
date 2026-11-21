import type {
  CallOptions,
  Coordinates,
  DateRange,
  Days,
  Exact,
  GridOptions,
  Hours,
  TiltedIrradiance,
  TimeOptions,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type {
  SATELLITE_DAILY,
  SATELLITE_HOURLY,
  SATELLITE_MODELS,
} from "./variables";

export type SatelliteHourlyVariable = keyof typeof SATELLITE_HOURLY;
export type SatelliteDailyVariable = keyof typeof SATELLITE_DAILY;
/** A satellite source: `satellite_radiation_seamless` (default), EUMETSAT SARAH-3, Himawari, GOES-19, … */
export type SatelliteModel = (typeof SATELLITE_MODELS)[number];

/** Parameters of the Satellite Radiation API, from its docs page (it has no spec). */
export type SatelliteRadiationParams = Coordinates &
  TimeOptions &
  Days &
  Hours &
  DateRange &
  GridOptions &
  TiltedIrradiance & {
    /** Hourly radiation variables to return. */
    hourly?: readonly SatelliteHourlyVariable[];
    /** Daily aggregations to return. */
    daily?: readonly SatelliteDailyVariable[];
    /** One or more satellite sources. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly SatelliteModel[];
  };

export type SatelliteRadiationResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof SATELLITE_HOURLY, "series"> &
    Section<P, "daily", typeof SATELLITE_DAILY, "series">
>;

/**
 * Solar radiation measured by geostationary satellites (`/v1/archive` on `satellite-api.open-meteo.com`), in 10-, 15-
 * or 30-minutely source steps depending on the satellite. By default, today's radiation (`forecast_days` defaults
 * to 1); use `past_days` or `start_date`/`end_date` for the archive.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const sun = await meteo.satelliteRadiation({ latitude: 52.52, longitude: 13.41, hourly: ["shortwave_radiation"] });
 * ```
 */
export type SatelliteRadiationMethod = <
  const P extends SatelliteRadiationParams,
>(
  params: Exact<P, SatelliteRadiationParams>,
  options?: CallOptions,
) => Promise<SatelliteRadiationResponse<P>>;
