import { z } from "zod";
import { meteoError } from "../errors";
import type { Http } from "../http";
import { parseWith } from "../http";
import { coordinates } from "../weather";
import type { ElevationMethod } from "./types";

/** `/v1/elevation`, from `elevation.yml`. */
export const ELEVATION_ENDPOINT = {
  commercial: "https://customer-api.open-meteo.com",
  free: "https://api.open-meteo.com",
  path: "/v1/elevation",
} as const;

const elevationSchema = z.object({
  elevation: z.array(z.number()),
});

export const createElevation =
  (http: Http): ElevationMethod =>
  async (params, options) => {
    if (typeof params !== "object" || params === null) {
      throw meteoError("invalid_argument", "params must be an object");
    }
    const query: Record<string, string> = {};
    coordinates(params, query);
    const extra = Object.keys(params).filter(
      (key) => key !== "latitude" && key !== "longitude",
    );
    if (extra.length > 0) {
      throw meteoError(
        "invalid_argument",
        `"${extra[0]}" is not a parameter of the Elevation API`,
      );
    }
    return parseWith(
      elevationSchema,
      await http.get(ELEVATION_ENDPOINT, query, options),
    ).elevation;
  };
