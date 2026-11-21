import type { Http } from "../http";
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
import type { HistoricalMethod } from "./types";
import {
  HISTORICAL_DAILY,
  HISTORICAL_ENDPOINT,
  HISTORICAL_HOURLY,
  HISTORICAL_LIMITS,
  HISTORICAL_MODELS,
} from "./variables";

export const createHistorical = (http: Http): HistoricalMethod =>
  weatherMethod(http, {
    endpoint: HISTORICAL_ENDPOINT,
    params: {
      ...timeRules,
      ...unitRules,
      ...dayRules(HISTORICAL_LIMITS),
      ...hourRules,
      ...dateRules,
      ...cellRule,
      ...elevationRule,
      ...tiltRules,
      ...modelsRule(HISTORICAL_MODELS),
    },
    required: [
      "start_date",
      "end_date",
    ],
    sections: {
      daily: {
        kinds: HISTORICAL_DAILY,
        shape: "series",
      },
      hourly: {
        kinds: HISTORICAL_HOURLY,
        shape: "series",
      },
    },
  });
