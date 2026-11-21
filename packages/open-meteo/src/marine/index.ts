import type { Http } from "../http";
import { weatherMethod } from "../weather";
import {
  cellRule,
  dateRules,
  dayRules,
  modelsRule,
  temperatureRule,
  timeRules,
  windRule,
} from "../weather/rules";
import type { MarineMethod } from "./types";
import {
  MARINE_CURRENT,
  MARINE_DAILY,
  MARINE_ENDPOINT,
  MARINE_HOURLY,
  MARINE_LIMITS,
  MARINE_MINUTELY_15,
  MARINE_MODELS,
} from "./variables";

export const createMarine = (http: Http): MarineMethod =>
  weatherMethod(http, {
    endpoint: MARINE_ENDPOINT,
    params: {
      ...timeRules,
      ...temperatureRule,
      ...windRule,
      length_unit: {
        type: "enum",
        values: [
          "metric",
          "imperial",
        ],
      },
      ...dayRules(MARINE_LIMITS),
      ...dateRules,
      ...cellRule,
      ...modelsRule(MARINE_MODELS),
    },
    sections: {
      current: {
        kinds: MARINE_CURRENT,
        shape: "current",
      },
      daily: {
        kinds: MARINE_DAILY,
        shape: "series",
      },
      hourly: {
        kinds: MARINE_HOURLY,
        shape: "series",
      },
      minutely_15: {
        kinds: MARINE_MINUTELY_15,
        shape: "series",
      },
    },
  });
