import type { Http } from "../http";
import { parseList } from "../http";
import { assertIntegerInRange, assertIsoCode, assertYear } from "../validate";
import { longWeekendSchema } from "./schemas";
import type { LongWeekendsResource } from "./types";

export const createLongWeekendsResource = (
  http: Http,
): LongWeekendsResource => ({
  list: async (isoCode, year, options = {}) => {
    assertIsoCode(isoCode);
    assertYear(year);
    const { availableBridgeDays } = options;
    if (availableBridgeDays !== undefined) {
      assertIntegerInRange("availableBridgeDays", availableBridgeDays, 1, 100);
    }
    return parseList(
      longWeekendSchema,
      await http.get(
        [
          "LongWeekends",
          isoCode,
          year,
        ],
        options,
        {
          availableBridgeDays,
        },
      ),
    );
  },
});
