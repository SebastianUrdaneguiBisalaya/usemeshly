import { forecastParams, forecastSections } from "../forecast";
import type { Http } from "../http";
import { weatherMethod } from "../weather";
import type { HistoricalForecastMethod } from "./types";

/** From the docs (`/en/docs/historical-forecast-api`): the Forecast API on its own host. */
export const HISTORICAL_FORECAST_ENDPOINT = {
  commercial: "https://customer-historical-forecast-api.open-meteo.com",
  free: "https://historical-forecast-api.open-meteo.com",
  path: "/v1/forecast",
} as const;

export const createHistoricalForecast = (
  http: Http,
): HistoricalForecastMethod =>
  weatherMethod(http, {
    endpoint: HISTORICAL_FORECAST_ENDPOINT,
    params: forecastParams,
    required: [
      "start_date",
      "end_date",
    ],
    sections: forecastSections,
  });
