import type { ForecastParams } from "../forecast/types";
import type {
  FORECAST_DAILY,
  FORECAST_HOURLY,
  FORECAST_MINUTELY_15,
} from "../forecast/variables";
import type { CallOptions, Exact } from "../weather/params";
import type { PerLocation, Section } from "../weather/response";

/** The Forecast API's parameters without `current`, plus the required `run`. */
export type SingleRunsParams = Omit<ForecastParams, "current"> & {
  /**
   * The model run, by its UTC initialisation time: `YYYY-MM-DDTHH:MM`, e.g. `2026-04-02T00:00`. Most models are
   * archived from 2 April 2026. A run that isn't available is a `bad_request`.
   */
  run: `${number}-${number}-${number}T${number}:${number}`;
};

export type SingleRunsResponse<P> = PerLocation<
  P,
  Section<P, "hourly", typeof FORECAST_HOURLY, "series"> &
    Section<P, "daily", typeof FORECAST_DAILY, "series"> &
    Section<P, "minutely_15", typeof FORECAST_MINUTELY_15, "series">
>;

/**
 * The full horizon of one model run (`/v1/forecast` on `single-runs-api.open-meteo.com`), chosen with `run`, instead
 * of the seamless latest forecast. Same variables and models as `forecast`.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const run = await meteo.singleRuns({
 *   latitude: 52.52,
 *   longitude: 13.41,
 *   run: "2026-11-20T00:00",
 *   models: ["icon_global"],
 *   hourly: ["temperature_2m"],
 * });
 * ```
 */
export type SingleRunsMethod = <const P extends SingleRunsParams>(
  params: Exact<P, SingleRunsParams>,
  options?: CallOptions,
) => Promise<SingleRunsResponse<P>>;
