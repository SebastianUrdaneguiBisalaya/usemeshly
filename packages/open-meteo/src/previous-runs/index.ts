import { forecastParams } from "../forecast";
import { FORECAST_HOURLY } from "../forecast/variables";
import type { Http } from "../http";
import { weatherMethod } from "../weather";
import type { PreviousRunsMethod } from "./types";
import { PREVIOUS_RUNS_HOURLY } from "./variables";

/** From the docs (`/en/docs/previous-runs-api`): the Forecast API on its own host. */
export const PREVIOUS_RUNS_ENDPOINT = {
  commercial: "https://customer-previous-runs-api.open-meteo.com",
  free: "https://previous-runs-api.open-meteo.com",
  path: "/v1/forecast",
} as const;

export const createPreviousRuns = (http: Http): PreviousRunsMethod =>
  weatherMethod(http, {
    endpoint: PREVIOUS_RUNS_ENDPOINT,
    params: forecastParams,
    sections: {
      hourly: {
        kinds: {
          ...FORECAST_HOURLY,
          ...PREVIOUS_RUNS_HOURLY,
        },
        shape: "series",
      },
    },
  });
