import type { z } from "zod";
import { nagerError } from "../errors";
import type { Http } from "../http";
import { parseList } from "../http";
import type { CallOptions } from "../types";
import {
  assertCountryCode,
  assertIntegerInRange,
  assertIsoCode,
  assertYear,
} from "../validate";
import type { IsTodayOptions } from "./types";

/** The shape both plans share; each plan's client type documents it on its own. */
export type HolidaysEndpoints<Holiday> = {
  list: (
    countryCode: string,
    year: number,
    options?: CallOptions,
  ) => Promise<Holiday[]>;
  next: (countryCode: string, options?: CallOptions) => Promise<Holiday[]>;
  isToday: (isoCode: string, options?: IsTodayOptions) => Promise<boolean>;
};

export const createHolidaysResource = <Holiday>(
  http: Http,
  holidaySchema: z.ZodType<Holiday>,
): HolidaysEndpoints<Holiday> => ({
  isToday: async (isoCode, options = {}) => {
    assertIsoCode(isoCode);
    const offset = options.offset ?? 0;
    assertIntegerInRange("offset", offset, -12, 12);
    const result = await http.get(
      [
        "IotHolidays",
        isoCode,
        "IsToday",
        offset,
      ],
      options,
    );
    if (result.status === 200) return true;
    if (result.status === 204) return false;
    throw nagerError(
      "invalid_response",
      `${result.label} answered ${result.status}, expected 200 or 204`,
      {
        status: result.status,
      },
    );
  },
  list: async (countryCode, year, options) => {
    assertCountryCode(countryCode);
    assertYear(year);
    return parseList(
      holidaySchema,
      await http.get(
        [
          "Holidays",
          countryCode,
          year,
        ],
        options,
      ),
    );
  },
  next: async (countryCode, options) => {
    assertCountryCode(countryCode);
    return parseList(
      holidaySchema,
      await http.get(
        [
          "Holidays",
          countryCode,
          "Next",
        ],
        options,
      ),
    );
  },
});
