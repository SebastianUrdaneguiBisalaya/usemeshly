import type { Http } from "../http";
import { weatherMethod } from "../weather";
import {
  cellRule,
  dateRules,
  dayRules,
  hourRules,
  modelsRule,
  tiltRules,
  timeRules,
} from "../weather/rules";
import type { SatelliteRadiationMethod } from "./types";
import {
  SATELLITE_DAILY,
  SATELLITE_HOURLY,
  SATELLITE_MODELS,
} from "./variables";

/** From the docs (`/en/docs/satellite-radiation-api`, server type `satellite`, action `archive`). */
export const SATELLITE_ENDPOINT = {
  commercial: "https://customer-satellite-api.open-meteo.com",
  free: "https://satellite-api.open-meteo.com",
  path: "/v1/archive",
} as const;

export const createSatelliteRadiation = (
  http: Http,
): SatelliteRadiationMethod =>
  weatherMethod(http, {
    endpoint: SATELLITE_ENDPOINT,
    params: {
      ...timeRules,
      // The docs give no range for these: any non-negative integer.
      ...dayRules({}),
      ...hourRules,
      ...dateRules,
      ...cellRule,
      ...tiltRules,
      ...modelsRule(SATELLITE_MODELS),
    },
    sections: {
      daily: {
        kinds: SATELLITE_DAILY,
        shape: "series",
      },
      hourly: {
        kinds: SATELLITE_HOURLY,
        shape: "series",
      },
    },
  });
