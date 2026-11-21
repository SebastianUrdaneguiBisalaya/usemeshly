import type { FetchLike } from "@usemeshly/auth";
import type { AirQualityMethod } from "./air-quality/types";
import type { ClimateMethod } from "./climate/types";
import type { ElevationMethod } from "./elevation/types";
import type { EnsembleMethod } from "./ensemble/types";
import type { FloodMethod } from "./flood/types";
import type { ForecastMethod } from "./forecast/types";
import type { GeocodingResource } from "./geocoding/types";
import type { HistoricalMethod } from "./historical/types";
import type { HistoricalForecastMethod } from "./historical-forecast/types";
import type { MarineMethod } from "./marine/types";
import type { ModelUpdatesResource } from "./model-updates/types";
import type { PreviousRunsMethod } from "./previous-runs/types";
import type { SatelliteRadiationMethod } from "./satellite-radiation/types";
import type { SeasonalMethod } from "./seasonal/types";
import type { SingleRunsMethod } from "./single-runs/types";

export type { CallOptions } from "./weather/params";

type TransportOptions = {
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Deadline per HTTP request, in milliseconds. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Aborts every request made by this client. */
  signal?: AbortSignal;
};

/**
 * The free plan: the public hosts, no credentials. Non-commercial use only, rate-limited per IP (600 calls a minute,
 * 5,000 an hour, 10,000 a day, 300,000 a month).
 */
export type OpenMeteoFreeOptions = TransportOptions & {
  plan: "free";
  /** The free plan takes no key: pass `plan: "commercial"` to use one. */
  apiKey?: never;
};

/** A commercial subscription: the `customer-` hosts, with your key sent as `&apikey=`. */
export type OpenMeteoCommercialOptions = TransportOptions & {
  plan: "commercial";
  /** Your Open-Meteo API key. Keep it server-side; this package never stores or logs it. */
  apiKey: string;
};

export type OpenMeteoClientOptions =
  | OpenMeteoFreeOptions
  | OpenMeteoCommercialOptions;

/** Every Open-Meteo API. The method name is the API; the TSDoc of each says the minimum commercial plan. */
export type OpenMeteoClient = {
  readonly plan: "free" | "commercial";
  forecast: ForecastMethod;
  historical: HistoricalMethod;
  historicalForecast: HistoricalForecastMethod;
  previousRuns: PreviousRunsMethod;
  singleRuns: SingleRunsMethod;
  ensemble: EnsembleMethod;
  seasonal: SeasonalMethod;
  climate: ClimateMethod;
  airQuality: AirQualityMethod;
  marine: MarineMethod;
  flood: FloodMethod;
  satelliteRadiation: SatelliteRadiationMethod;
  elevation: ElevationMethod;
  geocoding: GeocodingResource;
  modelUpdates: ModelUpdatesResource;
};
