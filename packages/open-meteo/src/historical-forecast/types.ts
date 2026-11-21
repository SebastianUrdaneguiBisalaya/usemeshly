import type { ForecastParams, ForecastResponse } from "../forecast/types";
import type { CallOptions, Exact, RequiredDateRange } from "../weather/params";

/** The Forecast API's parameters, with `start_date` and `end_date` required. */
export type HistoricalForecastParams = ForecastParams & RequiredDateRange;

/**
 * The archive of past forecasts (`/v1/forecast` on `historical-forecast-api.open-meteo.com`), from 2016 or 2022
 * depending on the model: the first hours of each run, stitched into a continuous time series. Same variables and
 * models as `forecast`. `start_date` and `end_date` are required.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const archived = await meteo.historicalForecast({
 *   latitude: 52.52,
 *   longitude: 13.41,
 *   start_date: "2024-06-01",
 *   end_date: "2024-06-07",
 *   hourly: ["temperature_2m"],
 * });
 * ```
 */
export type HistoricalForecastMethod = <
  const P extends HistoricalForecastParams,
>(
  params: Exact<P, HistoricalForecastParams>,
  options?: CallOptions,
) => Promise<ForecastResponse<P>>;
