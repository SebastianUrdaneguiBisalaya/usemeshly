// Parameter types shared by the weather APIs. Descriptions are from the Open-Meteo specs and docs.

/** A WGS84 coordinate, or several (same count for latitude and longitude) to get one result per location. */
export type Coordinates = {
  /**
   * Latitude in WGS84, from -90 to 90. Pass an array (with a `longitude` array of the same length) to query several
   * locations at once: the result is then an array, one entry per location.
   */
  latitude: number | readonly number[];
  /** Longitude in WGS84, from -180 to 180. An array when `latitude` is one. */
  longitude: number | readonly number[];
};

/** `YYYY-MM-DD`. */
export type IsoDate = `${number}-${number}-${number}`;

export type DateRange = {
  /** Start of the time interval, `YYYY-MM-DD`. Requires `end_date`. */
  start_date?: IsoDate;
  /** End of the time interval (inclusive), `YYYY-MM-DD`. Requires `start_date`. */
  end_date?: IsoDate;
};

/** Required for the archive-style APIs (historical weather, climate). */
export type RequiredDateRange = {
  /** Start of the time interval, `YYYY-MM-DD`. */
  start_date: IsoDate;
  /** End of the time interval (inclusive), `YYYY-MM-DD`. */
  end_date: IsoDate;
};

export type TimeFormat = "iso8601" | "unixtime";

export type TimeOptions = {
  /**
   * Any IANA time zone name (e.g. `Europe/Berlin`), or `auto` to use the location's local time zone. Daily values
   * need a time zone to know where a day starts. Defaults to `GMT`.
   */
  timezone?: "auto" | "GMT" | (string & {});
  /**
   * `iso8601` (default) returns times as local ISO 8601 strings (`2026-11-21T00:00`); `unixtime` as Unix seconds (in
   * GMT, whatever the `timezone`, so add `utc_offset_seconds` to show local times).
   */
  timeformat?: TimeFormat;
};

export type Days = {
  /** Also return this many past days. Each API has its own range: see the method. */
  past_days?: number;
  /** Number of forecast days. Each API has its own range and default: see the method. */
  forecast_days?: number;
};

export type Hours = {
  /** Limit hourly (and 15-minutely) data to this many past hours. A non-negative integer. */
  past_hours?: number;
  /** Limit hourly (and 15-minutely) data to this many hours from now. A non-negative integer. */
  forecast_hours?: number;
};

export type TemperatureUnit = "celsius" | "fahrenheit";
export type WindSpeedUnit = "kmh" | "ms" | "mph" | "kn";
export type PrecipitationUnit = "mm" | "inch";
export type LengthUnit = "metric" | "imperial";

export type Units = {
  /** `celsius` (default) or `fahrenheit`. */
  temperature_unit?: TemperatureUnit;
  /** `kmh` (default), `ms`, `mph` or `kn`. */
  wind_speed_unit?: WindSpeedUnit;
  /** `mm` (default) or `inch`. Snowfall is in centimetres, or inches with `inch`. */
  precipitation_unit?: PrecipitationUnit;
};

export type CellSelection = "land" | "sea" | "nearest";

export type GridOptions = {
  /**
   * How the grid cell is picked: `land` (default) prefers a land cell with an elevation like the requested one, `sea`
   * prefers sea cells, `nearest` takes the nearest cell.
   */
  cell_selection?: CellSelection;
};

export type ElevationOption = {
  /** Elevation used for statistical downscaling, in metres. Defaults to a 90 m digital elevation model. */
  elevation?: number;
};

export type TiltedIrradiance = {
  /** Slope tilt in degrees for `global_tilted_irradiance`, from 0 (horizontal) to 90 (vertical). Defaults to 0. */
  tilt?: number;
  /** Azimuth for `global_tilted_irradiance`: North=0, East=90, South=180, West=270. Defaults to 0. */
  azimuth?: number;
};

/** Per-call options. */
export type CallOptions = {
  /** Aborts this call. */
  signal?: AbortSignal;
};

/** Rejects parameters that `Shape` doesn't have (typos), which a generic `P` would otherwise accept silently. */
export type Exact<P, Shape> = P & {
  [K in Exclude<keyof P, keyof Shape>]: never;
};
