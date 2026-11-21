import type {
  CallOptions,
  Coordinates,
  Exact,
  GridOptions,
  RequiredDateRange,
  TimeOptions,
  Units,
} from "../weather/params";
import type { PerLocation, Section } from "../weather/response";
import type { CLIMATE_DAILY, CLIMATE_MODELS } from "./variables";

export type ClimateDailyVariable = keyof typeof CLIMATE_DAILY;
/** A CMIP6 climate model (`CMCC_CM2_VHR4`, `MRI_AGCM3_2_S`, …). */
export type ClimateModel = (typeof CLIMATE_MODELS)[number];

/** Parameters of the Climate Change API (`/v1/climate`), from `climate.yml`. */
export type ClimateParams = Coordinates &
  RequiredDateRange &
  TimeOptions &
  Units &
  GridOptions & {
    /** Daily climate variables to return. */
    daily?: readonly ClimateDailyVariable[];
    /** One or more climate models. With two or more, every variable comes back once per model, suffixed `_<model>`. */
    models?: readonly ClimateModel[];
    /** Return the raw model output, without the statistical bias correction applied by default. */
    disable_bias_correction?: boolean;
  };

export type ClimateResponse<P> = PerLocation<
  P,
  Section<P, "daily", typeof CLIMATE_DAILY, "series">
>;

/**
 * Daily climate projections from 1950 to 2050 from downscaled CMIP6 models. `start_date` and `end_date` are required.
 *
 * **Commercial plan:** API Professional or higher (not included in API Standard).
 *
 * @example
 * ```ts
 * const future = await meteo.climate({
 *   latitude: 52.52,
 *   longitude: 13.41,
 *   start_date: "2040-01-01",
 *   end_date: "2040-12-31",
 *   daily: ["temperature_2m_max"],
 *   models: ["MRI_AGCM3_2_S"],
 * });
 * ```
 */
export type ClimateMethod = <const P extends ClimateParams>(
  params: Exact<P, ClimateParams>,
  options?: CallOptions,
) => Promise<ClimateResponse<P>>;
