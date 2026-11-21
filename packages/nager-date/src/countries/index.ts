import type { z } from "zod";
import type { Http } from "../http";
import { parseBody, parseList } from "../http";
import { assertCountryCode } from "../validate";
import { countryInfoWithBordersSchema } from "./schemas";
import type { CountriesResource } from "./types";

export const createCountriesResource = <Country>(
  http: Http,
  countrySchema: z.ZodType<Country>,
): CountriesResource<Country> => ({
  available: async (options) =>
    parseList(
      countrySchema,
      await http.get(
        [
          "Countries",
          "Available",
        ],
        options,
      ),
    ),
  get: async (countryCode, options) => {
    assertCountryCode(countryCode);
    return parseBody(
      countryInfoWithBordersSchema,
      await http.get(
        [
          "Countries",
          countryCode,
        ],
        options,
      ),
    );
  },
});
