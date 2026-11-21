import type { ForecastHourlyVariable, ForecastParams } from "../forecast/types";
import type { FORECAST_HOURLY } from "../forecast/variables";
import type { CallOptions, Exact } from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type { PREVIOUS_RUNS_HOURLY } from "./variables";

/** A forecast variable as forecast N days before: `temperature_2m_previous_day1` … `_previous_day7`. */
export type PreviousRunsVariable = keyof typeof PREVIOUS_RUNS_HOURLY;

type PreviousRunsKinds = typeof FORECAST_HOURLY & typeof PREVIOUS_RUNS_HOURLY;

/** The Forecast API's parameters, with `hourly` only, which also accepts the `_previous_dayN` variables. */
export type PreviousRunsParams = Omit<
  ForecastParams,
  "hourly" | "daily" | "current" | "minutely_15"
> & {
  /** Hourly variables: plain names are the latest run (`_previous_day0`), `_previous_dayN` the run N days earlier. */
  hourly?: readonly (ForecastHourlyVariable | PreviousRunsVariable)[];
};

export type PreviousRunsResponse<P> = PerLocation<
  P,
  Section<P, "hourly", PreviousRunsKinds, "series">
>;

/**
 * Forecasts at fixed lead times (`/v1/forecast` on `previous-runs-api.open-meteo.com`): `<variable>_previous_day1`
 * is what was forecast 24 hours before the valid time, up to `_previous_day7`. Useful to measure forecast skill.
 * Local models with a short horizon only fill the offsets within it.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const runs = await meteo.previousRuns({
 *   latitude: 52.52,
 *   longitude: 13.41,
 *   hourly: ["temperature_2m", "temperature_2m_previous_day1", "temperature_2m_previous_day3"],
 *   past_days: 7,
 * });
 * ```
 */
export type PreviousRunsMethod = <const P extends PreviousRunsParams>(
  params: Exact<P, PreviousRunsParams>,
  options?: CallOptions,
) => Promise<PreviousRunsResponse<P>>;
