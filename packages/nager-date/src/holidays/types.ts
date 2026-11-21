import type { CallOptions } from "../types";

/** How a holiday is classified (`HolidayTypes` in the spec). */
export type HolidayType =
  | "Public"
  | "Bank"
  | "School"
  | "Authorities"
  | "Optional"
  | "Observance";

/** A public holiday from the Community API (`PublicHolidayV4Dto`). */
export type CommunityHoliday = {
  /** The date of the holiday, `YYYY-MM-DD`. */
  date: string;
  /** English name of the holiday. */
  name: string;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  /** Whether this holiday applies to the entire country. */
  nationalHoliday?: boolean | undefined;
  /** ISO 3166-2 codes of the subdivisions where this holiday applies; `null` (or absent) for the whole country. */
  subdivisionCodes?: string[] | null | undefined;
  /** Holiday types this holiday is classified under. */
  holidayTypes: HolidayType[];
};

/**
 * A holiday from the Pro API (`HolidayV1Dto`).
 *
 * @experimental The Pro API v1 is in beta.
 */
export type ProHoliday = {
  /** Unique id of the holiday. */
  id: string;
  /** The date of the holiday, `YYYY-MM-DD`. */
  date: string;
  /** The date on which the holiday is observed, `YYYY-MM-DD`. */
  observedDate: string;
  /** Local name of the holiday. */
  localName: string;
  /** English name of the holiday. */
  englishName: string;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  /** Whether this holiday applies to the entire country. */
  nationalHoliday?: boolean | undefined;
  /** ISO 3166-2 codes of the subdivisions where this holiday applies; `null` (or absent) for the whole country. */
  subdivisionCodes?: string[] | null | undefined;
  /** Holiday types this holiday is classified under. */
  holidayTypes: HolidayType[];
};

export type IsTodayOptions = CallOptions & {
  /**
   * UTC offset in hours, an integer from -12 to 12, to evaluate "today" in another timezone. Defaults to 0 (the current
   * UTC date).
   */
  offset?: number;
};

/** Public holidays on the Community API. */
export type CommunityHolidaysResource = {
  /**
   * Every officially recognized public holiday of a country in a year, with its English name, whether it applies
   * nationally or only in some subdivisions, and its holiday types. `204 No Content` gives `[]`.
   *
   * Rejects with `not_found` for an unknown country (404) and `bad_request` for a year Nager.Date doesn't support (400).
   *
   * @param countryCode - ISO 3166-1 alpha-2 code, e.g. `"US"`.
   * @param year - The year, e.g. `2026`.
   * @example
   * ```ts
   * const holidays = await nager.holidays.list("US", 2026);
   * ```
   */
  list: (
    countryCode: string,
    year: number,
    options?: CallOptions,
  ) => Promise<CommunityHoliday[]>;
  /**
   * The public holidays of a country in the next 365 days, from today. `204 No Content` (none) gives `[]`.
   *
   * @param countryCode - ISO 3166-1 alpha-2 code, e.g. `"US"`.
   * @example
   * ```ts
   * const [upcoming] = await nager.holidays.next("DE");
   * ```
   */
  next: (
    countryCode: string,
    options?: CallOptions,
  ) => Promise<CommunityHoliday[]>;
  /**
   * Whether today is a public holiday in a country or subdivision: `true` on 200, `false` on 204. By default "today" is
   * the current UTC date; `offset` shifts it by whole hours.
   *
   * @param isoCode - ISO 3166-1 alpha-2 code (`"AT"`) or ISO 3166-2 subdivision code (`"AT-1"`).
   * @example
   * ```ts
   * if (await nager.holidays.isToday("AT-1", { offset: 1 })) {
   *   // skip today's reminders
   * }
   * ```
   */
  isToday: (isoCode: string, options?: IsTodayOptions) => Promise<boolean>;
};

/**
 * Holidays on the Pro API. Every endpoint here is marked experimental in the Pro spec.
 *
 * @experimental The Pro API v1 is in beta and subject to change.
 */
export type ProHolidaysResource = {
  /**
   * Every officially recognized holiday of a country in a year, with local and English names, the observed date,
   * whether it applies nationally or only in some subdivisions, and its holiday types. `204 No Content` gives `[]`.
   *
   * Rejects with `not_found` for an unknown country (404) and `bad_request` for a year Nager.Date doesn't support (400).
   *
   * @experimental
   * @param countryCode - ISO 3166-1 alpha-2 code, e.g. `"US"`.
   * @param year - The year, e.g. `2026`.
   * @example
   * ```ts
   * const holidays = await nager.holidays.list("US", 2026);
   * holidays.map((holiday) => `${holiday.observedDate} ${holiday.localName}`);
   * ```
   */
  list: (
    countryCode: string,
    year: number,
    options?: CallOptions,
  ) => Promise<ProHoliday[]>;
  /**
   * The holidays of a country in the next 365 days, from today. `204 No Content` (none) gives `[]`.
   *
   * @experimental
   * @param countryCode - ISO 3166-1 alpha-2 code, e.g. `"US"`.
   * @example
   * ```ts
   * const [upcoming] = await nager.holidays.next("DE");
   * ```
   */
  next: (countryCode: string, options?: CallOptions) => Promise<ProHoliday[]>;
  /**
   * Whether today is a public holiday in a country or subdivision: `true` on 200, `false` on 204. By default "today" is
   * the current UTC date; `offset` shifts it by whole hours.
   *
   * @experimental
   * @param isoCode - ISO 3166-1 alpha-2 code (`"AT"`) or ISO 3166-2 subdivision code (`"AT-1"`).
   * @example
   * ```ts
   * const holidayToday = await nager.holidays.isToday("US-CA", { offset: -8 });
   * ```
   */
  isToday: (isoCode: string, options?: IsTodayOptions) => Promise<boolean>;
};
