import type { CallOptions, Coordinates } from "../weather/params";

/**
 * Terrain elevation in metres for each coordinate, from a 90 m digital elevation model (Copernicus DEM GLO-90), in
 * the order given. Pass arrays to look up several points in one call.
 *
 * **Commercial plan:** API Standard or higher.
 *
 * @example
 * ```ts
 * const [berlin, paris] = await meteo.elevation({ latitude: [52.52, 48.85], longitude: [13.41, 2.35] });
 * ```
 */
export type ElevationMethod = (
  params: Coordinates,
  options?: CallOptions,
) => Promise<number[]>;
