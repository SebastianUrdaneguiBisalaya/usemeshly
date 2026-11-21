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
import type { EnsembleMethod } from "./types";
import {
  ENSEMBLE_DAILY,
  ENSEMBLE_ENDPOINT,
  ENSEMBLE_HOURLY,
  ENSEMBLE_LIMITS,
  ENSEMBLE_MODELS,
} from "./variables";

export const createEnsemble = (http: Http): EnsembleMethod =>
  weatherMethod(http, {
    endpoint: ENSEMBLE_ENDPOINT,
    members: true,
    params: {
      ...timeRules,
      ...unitRules,
      ...dayRules(ENSEMBLE_LIMITS),
      ...hourRules,
      ...dateRules,
      ...cellRule,
      ...elevationRule,
      ...tiltRules,
      ...modelsRule(ENSEMBLE_MODELS),
      temporal_resolution: {
        type: "enum",
        values: [
          "native",
          "hourly",
          "hourly_3",
          "hourly_6",
        ],
      },
    },
    sections: {
      daily: {
        kinds: ENSEMBLE_DAILY,
        shape: "series",
      },
      hourly: {
        kinds: ENSEMBLE_HOURLY,
        shape: "series",
      },
    },
  });
