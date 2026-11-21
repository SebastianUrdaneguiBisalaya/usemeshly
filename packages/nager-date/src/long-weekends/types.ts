import type { CallOptions } from "../types";

/**
 * A long weekend, including optional bridge days (`LongWeekendV1Dto`). The spec marks no field as required, so each
 * may be absent.
 */
export type LongWeekend = {
  /** The start date of the long weekend, `YYYY-MM-DD`. */
  startDate?: string | undefined;
  /** The end date of the long weekend, `YYYY-MM-DD`. */
  endDate?: string | undefined;
  /** Total number of days in the long weekend. */
  dayCount?: number | undefined;
  /** Whether a bridge day is required to achieve the long weekend. */
  needBridgeDay?: boolean | undefined;
  /** The bridge days (`YYYY-MM-DD`) that extend the weekend. */
  bridgeDays?: string[] | undefined;
};

export type LongWeekendsOptions = CallOptions & {
  /**
   * The maximum number of bridge days to include when looking for long-weekend opportunities, an integer from 1 to 100.
   * Nager.Date defaults to 1.
   */
  availableBridgeDays?: number;
};

/**
 * Long weekends, on the Pro API only.
 *
 * @experimental The Pro API v1 is in beta and subject to change.
 */
export type LongWeekendsResource = {
  /**
   * Every long weekend of a country or subdivision in a year: breaks of at least three consecutive days created by
   * public holidays. Bridge days (weekdays between a holiday and a weekend) can be included to find extended leave
   * opportunities.
   *
   * Rejects with `bad_request` when Nager.Date refuses the parameters (400), and with `invalid_argument` before any
   * request when `availableBridgeDays` is outside 1-100.
   *
   * @param isoCode - ISO 3166-1 alpha-2 code (`"AT"`) or ISO 3166-2 subdivision code (`"AT-1"`).
   * @param year - The year, e.g. `2026`.
   * @example
   * ```ts
   * const weekends = await nager.longWeekends.list("DE", 2026, { availableBridgeDays: 2 });
   * ```
   */
  list: (
    isoCode: string,
    year: number,
    options?: LongWeekendsOptions,
  ) => Promise<LongWeekend[]>;
};
