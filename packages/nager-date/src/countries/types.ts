import type { CallOptions } from "../types";

/** Detailed information about a country. */
export type CountryInfo = {
  /** The commonly used name of the country. */
  commonName: string;
  /** The name of the country in its native language. */
  nativeName: string;
  /** The official name of the country. */
  officialName: string;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  /** Geopolitical or continental region of the country. */
  region: string;
};

/** Detailed information about a country, including neighboring countries. Same shape on both plans. */
export type CountryInfoWithBorders = CountryInfo & {
  /** Neighboring countries based on geographical borders. `null` (or absent) when Nager.Date has none. */
  borders?: CountryInfo[] | null | undefined;
};

/** A country supported by the Community API (`CountryV4Dto`). */
export type CommunityCountry = {
  /** The ISO 3166-1 alpha-2 country code (e.g. `"US"`, `"DE"`). */
  countryCode: string;
  /** The common name of the country. */
  name: string;
};

/** A country supported by the Pro API (`CountryV1Dto`). */
export type ProCountry = {
  /** The ISO 3166-1 alpha-2 country code (e.g. `"US"`, `"DE"`). */
  countryCode: string;
  /** The commonly used English name of the country. */
  commonName: string;
  /** The name of the country in its native language. */
  nativeName: string;
  /** The official name of the country. */
  officialName: string;
  /** The geopolitical region of the country (e.g. `"Europe"`, `"Americas"`). */
  region: string;
  /** The specific sub-region of the country (e.g. `"Western Europe"`, `"Northern America"`). */
  subRegion: string;
};

/** Country metadata. `Country` is what `available()` lists on this plan. */
export type CountriesResource<Country> = {
  /**
   * Detailed information about one country: common, native and official names, region and, when available,
   * neighboring countries based on geographical borders.
   *
   * Rejects with `not_found` when the code is not recognized (404), and with `invalid_argument` before any request
   * when it isn't two letters.
   *
   * @param countryCode - ISO 3166-1 alpha-2 code, e.g. `"US"` or `"GB"` (any case).
   * @example
   * ```ts
   * const germany = await nager.countries.get("DE");
   * germany.borders?.map((country) => country.countryCode); // ["AT", "BE", "CH", ...]
   * ```
   */
  get: (
    countryCode: string,
    options?: CallOptions,
  ) => Promise<CountryInfoWithBorders>;
  /**
   * Every country for which public-holiday data is available.
   *
   * @example
   * ```ts
   * const countries = await nager.countries.available();
   * ```
   */
  available: (options?: CallOptions) => Promise<Country[]>;
};
