import { z } from "zod";
import { meteoError } from "../errors";
import type { Http } from "../http";
import { parseWith } from "../http";
import type { GeocodingLocation, GeocodingResource } from "./types";

/** From the docs (`/en/docs/geocoding-api`). */
export const GEOCODING_SEARCH_ENDPOINT = {
  commercial: "https://customer-geocoding-api.open-meteo.com",
  free: "https://geocoding-api.open-meteo.com",
  path: "/v1/search",
} as const;

export const GEOCODING_GET_ENDPOINT = {
  ...GEOCODING_SEARCH_ENDPOINT,
  path: "/v1/get",
} as const;

const locationSchema: z.ZodType<GeocodingLocation> = z.object({
  admin1: z.string().optional(),
  admin1_id: z.number().optional(),
  admin2: z.string().optional(),
  admin2_id: z.number().optional(),
  admin3: z.string().optional(),
  admin3_id: z.number().optional(),
  admin4: z.string().optional(),
  admin4_id: z.number().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  country_id: z.number().optional(),
  elevation: z.number().optional(),
  feature_code: z.string().optional(),
  id: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string(),
  population: z.number().optional(),
  postcodes: z.array(z.string()).optional(),
  timezone: z.string().optional(),
});

const searchSchema = z.object({
  // Absent when nothing matches.
  results: z.array(locationSchema).optional(),
});

const invalid = (message: string) => meteoError("invalid_argument", message);

export const createGeocoding = (http: Http): GeocodingResource => ({
  get: async (id, options) => {
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) {
      throw invalid("id must be a positive integer");
    }
    return parseWith(
      locationSchema,
      await http.get(
        GEOCODING_GET_ENDPOINT,
        {
          id: String(id),
        },
        options,
      ),
    );
  },
  search: async (name, options = {}) => {
    if (typeof name !== "string" || name.trim() === "" || name.length > 200) {
      throw invalid(
        "name must be a non-empty string of at most 200 characters",
      );
    }
    const query: Record<string, string> = {
      format: "json",
      name,
    };
    const { count, language, countryCode } = options;
    if (count !== undefined) {
      if (!Number.isInteger(count) || count < 1 || count > 100) {
        throw invalid("count must be an integer from 1 to 100");
      }
      Object.assign(query, {
        count: String(count),
      });
    }
    if (language !== undefined) {
      if (typeof language !== "string" || !/^[a-z]{2,3}$/.test(language)) {
        throw invalid("language must be a lower-case language code, e.g. en");
      }
      Object.assign(query, {
        language,
      });
    }
    if (countryCode !== undefined) {
      if (
        typeof countryCode !== "string" ||
        !/^[A-Za-z]{2}$/.test(countryCode)
      ) {
        throw invalid(
          "countryCode must be an ISO 3166-1 alpha-2 code, e.g. DE",
        );
      }
      Object.assign(query, {
        countryCode,
      });
    }
    return (
      parseWith(
        searchSchema,
        await http.get(GEOCODING_SEARCH_ENDPOINT, query, options),
      ).results ?? []
    );
  },
});
