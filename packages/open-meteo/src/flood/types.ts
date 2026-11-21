import type {
  CallOptions,
  Coordinates,
  DateRange,
  Days,
  Exact,
  GridOptions,
  TimeOptions,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type { FLOOD_DAILY, FLOOD_MODELS } from "./variables";

export type FloodDailyVariable = keyof typeof FLOOD_DAILY;
/** A GloFAS version: `seamless_v4` (default), `forecast_v4`, `consolidated_v4`, … */
export type FloodModel = (typeof FLOOD_MODELS)[number];

/** Parameters of the Flood API (`/v1/flood`), from `flood.yml`. */
export type FloodParams = Coordinates &
  TimeOptions &
  Days &
  DateRange &
  GridOptions & {
    /** River discharge variables to return. */
    daily?: readonly FloodDailyVariable[];
    /** Return every ensemble member (`river_discharge_memberNN`) instead of only the ensemble mean. */
    ensemble?: boolean;
    /** One or more GloFAS versions. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly FloodModel[];
  };

export type FloodResponse<P> = PerLocation<
  P,
  Section<P, "daily", typeof FLOOD_DAILY, "series", true>
>;

/**
 * Daily river discharge forecasts from the Copernicus GloFAS hydrological model, for rivers worldwide.
 * `forecast_days` 0-366 (default 92), `past_days` 0-92. The nearest river is picked within a 5 km grid cell.
 *
 * **Commercial plan:** API Standard or higher.
 *
 * @example
 * ```ts
 * const river = await meteo.flood({ latitude: 59.91, longitude: 10.75, daily: ["river_discharge"] });
 * ```
 */
export type FloodMethod = <const P extends FloodParams>(
  params: Exact<P, FloodParams>,
  options?: CallOptions,
) => Promise<FloodResponse<P>>;
