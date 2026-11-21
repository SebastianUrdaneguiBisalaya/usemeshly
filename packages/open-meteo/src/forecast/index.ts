import type { Http } from "../http";
import type { WeatherApi } from "../weather";
import { weatherMethod } from "../weather";
import {
  cellRule,
  dateRules,
  dayRules,
  elevationRule,
  hourRules,
  modelsRule,
  tiltRules,
  timeRules,
  unitRules,
} from "../weather/rules";
import type { ForecastMethod } from "./types";
import {
  FORECAST_CURRENT,
  FORECAST_DAILY,
  FORECAST_ENDPOINT,
  FORECAST_HOURLY,
  FORECAST_LIMITS,
  FORECAST_MINUTELY_15,
  FORECAST_MODELS,
} from "./variables";

/** Forecast-style parameters, shared with the APIs that serve `/v1/forecast` on another host. */
export const forecastParams = {
  ...timeRules,
  ...unitRules,
  ...dayRules(FORECAST_LIMITS),
  ...hourRules,
  ...dateRules,
  ...cellRule,
  ...elevationRule,
  ...tiltRules,
  ...modelsRule(FORECAST_MODELS),
};

export const forecastSections = {
  current: {
    kinds: FORECAST_CURRENT,
    shape: "current",
  },
  daily: {
    kinds: FORECAST_DAILY,
    shape: "series",
  },
  hourly: {
    kinds: FORECAST_HOURLY,
    shape: "series",
  },
  minutely_15: {
    kinds: FORECAST_MINUTELY_15,
    shape: "series",
  },
} as const;

export const forecastApi: WeatherApi = {
  endpoint: FORECAST_ENDPOINT,
  params: forecastParams,
  sections: forecastSections,
};

export const createForecast = (http: Http): ForecastMethod =>
  weatherMethod(http, forecastApi);
