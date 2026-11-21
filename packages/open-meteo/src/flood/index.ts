import type { Http } from "../http";
import { weatherMethod } from "../weather";
import {
  cellRule,
  dateRules,
  dayRules,
  modelsRule,
  timeRules,
} from "../weather/rules";
import type { FloodMethod } from "./types";
import {
  FLOOD_DAILY,
  FLOOD_ENDPOINT,
  FLOOD_LIMITS,
  FLOOD_MODELS,
} from "./variables";

export const createFlood = (http: Http): FloodMethod =>
  weatherMethod(http, {
    endpoint: FLOOD_ENDPOINT,
    members: true,
    params: {
      ...timeRules,
      ...dayRules(FLOOD_LIMITS),
      ...dateRules,
      ...cellRule,
      ...modelsRule(FLOOD_MODELS),
      ensemble: {
        type: "boolean",
      },
    },
    sections: {
      daily: {
        kinds: FLOOD_DAILY,
        shape: "series",
      },
    },
  });
