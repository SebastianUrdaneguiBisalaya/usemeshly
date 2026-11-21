import type { CallOptions } from "../weather/params";

/** The API server a model's metadata is read from (the docs' server types). */
export type ModelUpdatesApi =
  | "forecast"
  | "historical-forecast"
  | "previous-runs"
  | "single-runs"
  | "archive"
  | "air-quality"
  | "marine"
  | "ensemble"
  | "climate"
  | "flood"
  | "seasonal"
  | "satellite";

/** Update times of one model, as documented under "Metadata API Documentation". Times are Unix seconds. */
export type ModelMetadata = {
  /** The model's initialisation (reference) time of the latest run. */
  last_run_initialisation_time: number;
  /** When downloading and converting the latest run finished. It doesn't mean the data is available yet. */
  last_run_modification_time: number;
  /**
   * When the latest run became available on the API. Servers are updated one after another: wait about 10 minutes
   * after this time for every call to see the new run.
   */
  last_run_availability_time: number;
  /** The model's own temporal resolution (3600 for hourly). The API interpolates to hourly by default. */
  temporal_resolution_seconds: number;
  /** Typical interval between runs, e.g. 3600 for hourly updates. */
  update_interval_seconds: number;
  /** The last time step with data. Not described in the docs; may be absent. */
  data_end_time?: number | undefined;
};

export type ModelUpdatesOptions = CallOptions & {
  /** The server the model belongs to. Defaults to `forecast`. */
  api?: ModelUpdatesApi;
};

/**
 * When each weather model was last updated (`/data/<model>/static/meta.json`). These times don't map directly to the
 * Forecast API, which picks the best model per location.
 *
 * **Commercial plan:** any (served from the `customer-` host with the key).
 */
export type ModelUpdatesResource = {
  /**
   * The update times of `model`, by its data directory name as linked in the docs' model updates table (e.g.
   * `dwd_icon`, `ecmwf_ifs025`, `ncep_gfs013`).
   *
   * @example
   * ```ts
   * const icon = await meteo.modelUpdates.get("dwd_icon");
   * new Date(icon.last_run_availability_time * 1000);
   * ```
   */
  get: (model: string, options?: ModelUpdatesOptions) => Promise<ModelMetadata>;
};
