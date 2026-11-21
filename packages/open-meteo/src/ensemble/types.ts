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
  ENSEMBLE_DAILY,
  ENSEMBLE_HOURLY,
  ENSEMBLE_MODELS,
} from "./variables";

export type EnsembleHourlyVariable = keyof typeof ENSEMBLE_HOURLY;
export type EnsembleDailyVariable = keyof typeof ENSEMBLE_DAILY;
/**
 * An ensemble model, including the `*_ensemble_mean` models of the Ensemble Mean API (same endpoint), which return
 * the mean and spread instead of every member.
 */
export type EnsembleModel = (typeof ENSEMBLE_MODELS)[number];

/** Parameters of the Ensemble API (`/v1/ensemble`), from `ensemble.yml` (and the Ensemble Mean API docs). */
export type EnsembleParams = Coordinates &
  TimeOptions &
  Units &
  Days &
  Hours &
  DateRange &
  GridOptions &
  ElevationOption &
  TiltedIrradiance & {
    /** Hourly variables to return. */
    hourly?: readonly EnsembleHourlyVariable[];
    /** Daily aggregations to return. */
    daily?: readonly EnsembleDailyVariable[];
    /** One or more ensemble models. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly EnsembleModel[];
    /** `native` returns the model's own steps (e.g. 3- or 6-hourly) instead of interpolating to hourly. */
    temporal_resolution?: "native" | "hourly" | "hourly_3" | "hourly_6";
  };

export type EnsembleResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof ENSEMBLE_HOURLY, "series", true> &
    Section<P, "daily", typeof ENSEMBLE_DAILY, "series", true>
>;

/**
 * Ensemble forecasts: every member of an ensemble model (e.g. 51 for ECMWF IFS), up to 35 days ahead
 * (`forecast_days` 0-36, default 7). Each variable comes back as the control run plus `<variable>_memberNN` keys.
 * Pass an `*_ensemble_mean` model for the Ensemble Mean API.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const runs = await meteo.ensemble({ latitude: 52.52, longitude: 13.41, hourly: ["temperature_2m"], models: ["dwd_icon_seamless_eps"] });
 * runs.hourly.temperature_2m_member01; // (number | null)[] | undefined: how many members exist depends on the model
 * ```
 */
export type EnsembleMethod = <const P extends EnsembleParams>(
  params: Exact<P, EnsembleParams>,
  options?: CallOptions,
) => Promise<EnsembleResponse<P>>;
