import type { Http } from "../http";
import { weatherMethod } from "../weather";
import {
  cellRule,
  dateRules,
  dayRules,
  modelsRule,
  timeRules,
  unitRules,
} from "../weather/rules";
import type { SeasonalMethod } from "./types";
import {
  SEASONAL_DAILY,
  SEASONAL_ENDPOINT,
  SEASONAL_HOURLY,
  SEASONAL_LIMITS,
  SEASONAL_MODELS,
  SEASONAL_MONTHLY,
  SEASONAL_WEEKLY,
} from "./variables";

export const createSeasonal = (http: Http): SeasonalMethod =>
  weatherMethod(http, {
    endpoint: SEASONAL_ENDPOINT,
    members: true,
    params: {
      ...timeRules,
      ...unitRules,
      ...dayRules(SEASONAL_LIMITS),
      ...dateRules,
      ...cellRule,
      ...modelsRule(SEASONAL_MODELS),
    },
    sections: {
      daily: {
        kinds: SEASONAL_DAILY,
        shape: "series",
      },
      hourly: {
        kinds: SEASONAL_HOURLY,
        shape: "series",
      },
      monthly: {
        kinds: SEASONAL_MONTHLY,
        shape: "series",
      },
      weekly: {
        kinds: SEASONAL_WEEKLY,
        shape: "series",
      },
    },
  });
