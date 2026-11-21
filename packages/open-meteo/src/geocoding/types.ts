import type { CallOptions } from "../weather/params";

/** A location from the Geocoding API (GeoNames data). Fields Open-Meteo has no value for are absent. */
export type GeocodingLocation = {
  /** Unique id of this location; resolve it again with `geocoding.get(id)`. */
  id: number;
  /** Location name, localized following `language` when possible. */
  name: string;
  /** WGS84 latitude of this location. */
  latitude: number;
  /** WGS84 longitude of this location. */
  longitude: number;
  /** Elevation above mean sea level, in metres. */
  elevation?: number | undefined;
  /** Type of location, as a [GeoNames feature code](https://www.geonames.org/export/codes.html) (e.g. `PPLC`). */
  feature_code?: string | undefined;
  /** ISO 3166-1 alpha-2 country code, e.g. `DE`. */
  country_code?: string | undefined;
  /** Country name, localized following `language` when possible. */
  country?: string | undefined;
  /** Unique id of the country. */
  country_id?: number | undefined;
  /** IANA time zone, e.g. `Europe/Berlin`. */
  timezone?: string | undefined;
  /** Number of inhabitants. */
  population?: number | undefined;
  /** Postcodes of this location. */
  postcodes?: string[] | undefined;
  /** First administrative level this location is in (e.g. a state), localized when possible. */
  admin1?: string | undefined;
  /** Second administrative level. */
  admin2?: string | undefined;
  /** Third administrative level. */
  admin3?: string | undefined;
  /** Fourth administrative level. */
  admin4?: string | undefined;
  /** Id of `admin1`. */
  admin1_id?: number | undefined;
  /** Id of `admin2`. */
  admin2_id?: number | undefined;
  /** Id of `admin3`. */
  admin3_id?: number | undefined;
  /** Id of `admin4`. */
  admin4_id?: number | undefined;
};

export type GeocodingSearchOptions = CallOptions & {
  /** How many results to return, from 1 to 100. Defaults to 10. Country filters apply before the limit. */
  count?: number;
  /** Lower-case language code for translated names (e.g. `en`, `de`, `fr`). Defaults to `en`. */
  language?: string;
  /** Only results in this country: an ISO 3166-1 alpha-2 code, e.g. `DE`. */
  countryCode?: string;
};

/**
 * Location search by name or postal code, and lookup by id.
 *
 * **Commercial plan:** API Standard or higher.
 */
export type GeocodingResource = {
  /**
   * Locations matching `name`: a place name or postal code, optionally followed by a comma and a country or
   * first-level administrative area (`"Paris, France"`, `"Los Angeles, CA"`). Two characters match an exact name;
   * three or more match by prefix, ignoring case and diacritics. No match gives `[]`.
   *
   * @example
   * ```ts
   * const [berlin] = await meteo.geocoding.search("Berlin", { count: 1, language: "de" });
   * ```
   */
  search: (
    name: string,
    options?: GeocodingSearchOptions,
  ) => Promise<GeocodingLocation[]>;
  /**
   * The location with this id (from a search result, or any of its `*_id` fields). An unknown id is a `bad_request`
   * ("Location ID not found.").
   *
   * @example
   * ```ts
   * const berlin = await meteo.geocoding.get(2950159);
   * ```
   */
  get: (id: number, options?: CallOptions) => Promise<GeocodingLocation>;
};
