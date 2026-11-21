import { forecastParams, forecastSections } from "../forecast";
import type { Http } from "../http";
import { weatherMethod } from "../weather";
import type { SingleRunsMethod } from "./types";

/** From the docs (`/en/docs/single-runs-api`): the Forecast API on its own host. */
export const SINGLE_RUNS_ENDPOINT = {
  commercial: "https://customer-single-runs-api.open-meteo.com",
  free: "https://single-runs-api.open-meteo.com",
  path: "/v1/forecast",
} as const;

const { current: _current, ...sections } = forecastSections;

export const createSingleRuns = (http: Http): SingleRunsMethod =>
  weatherMethod(http, {
    endpoint: SINGLE_RUNS_ENDPOINT,
    params: {
      ...forecastParams,
      run: {
        type: "datetime",
      },
    },
    required: [
      "run",
    ],
    sections,
  });
