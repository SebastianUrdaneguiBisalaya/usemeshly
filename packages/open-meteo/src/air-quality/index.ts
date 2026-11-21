import type { Http } from "../http";
import { weatherMethod } from "../weather";
import { dateRules, dayRules, timeRules } from "../weather/rules";
import type { AirQualityMethod } from "./types";
import {
  AIR_QUALITY_CURRENT,
  AIR_QUALITY_ENDPOINT,
  AIR_QUALITY_HOURLY,
  AIR_QUALITY_LIMITS,
} from "./variables";

export const createAirQuality = (http: Http): AirQualityMethod =>
  weatherMethod(http, {
    endpoint: AIR_QUALITY_ENDPOINT,
    params: {
      ...timeRules,
      ...dayRules(AIR_QUALITY_LIMITS),
      ...dateRules,
      domains: {
        type: "enum",
        values: [
          "auto",
          "cams_europe",
          "cams_global",
        ],
      },
    },
    sections: {
      current: {
        kinds: AIR_QUALITY_CURRENT,
        shape: "current",
      },
      hourly: {
        kinds: AIR_QUALITY_HOURLY,
        shape: "series",
      },
    },
  });
