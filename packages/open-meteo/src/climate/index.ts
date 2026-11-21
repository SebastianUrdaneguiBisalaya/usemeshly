import type { Http } from "../http";
import { weatherMethod } from "../weather";
import {
  cellRule,
  dateRules,
  modelsRule,
  timeRules,
  unitRules,
} from "../weather/rules";
import type { ClimateMethod } from "./types";
import { CLIMATE_DAILY, CLIMATE_ENDPOINT, CLIMATE_MODELS } from "./variables";

export const createClimate = (http: Http): ClimateMethod =>
  weatherMethod(http, {
    endpoint: CLIMATE_ENDPOINT,
    params: {
      ...timeRules,
      ...unitRules,
      ...dateRules,
      ...cellRule,
      ...modelsRule(CLIMATE_MODELS),
      disable_bias_correction: {
        type: "boolean",
      },
    },
    required: [
      "start_date",
      "end_date",
    ],
    sections: {
      daily: {
        kinds: CLIMATE_DAILY,
        shape: "series",
      },
    },
  });
