import type { FetchLike } from "@usemeshly/auth";
import { assertServerRuntime } from "@usemeshly/auth";
import { createAirQuality } from "./air-quality";
import { createClimate } from "./climate";
import { createElevation } from "./elevation";
import { createEnsemble } from "./ensemble";
import { meteoError } from "./errors";
import { createFlood } from "./flood";
import { createForecast } from "./forecast";
import { createGeocoding } from "./geocoding";
import { createHistorical } from "./historical";
import { createHistoricalForecast } from "./historical-forecast";
import { createHttp, OPEN_METEO_REQUEST_TIMEOUT_MS } from "./http";
import { createMarine } from "./marine";
import { createModelUpdates } from "./model-updates";
import { createPreviousRuns } from "./previous-runs";
import { createSatelliteRadiation } from "./satellite-radiation";
import { createSeasonal } from "./seasonal";
import { createSingleRuns } from "./single-runs";
import type { OpenMeteoClient, OpenMeteoClientOptions } from "./types";

/** Same rule as `apiKeyQueryParam`, checked here so a bad key fails at creation, not on the first call. */
const isCredential = (value: unknown): value is string =>
  typeof value === "string" &&
  value !== "" &&
  [
    ...value,
  ].every((char) => {
    const code = char.charCodeAt(0);
    return code > 0x20 && code !== 0x7f;
  });

/**
 * A typed client for every [Open-Meteo](https://open-meteo.com) API, over JSON. Pick the plan when you create it:
 *
 * - `{ plan: "free" }`: the public hosts, no credentials. Runs anywhere.
 * - `{ plan: "commercial", apiKey }`: the `customer-` hosts, with `&apikey=<key>` on every request ("The API syntax is
 *   identical to the free tier — only the domain and key parameter differ"). Server-side only: it throws
 *   `unsupported_environment` in a browser-like runtime. The free plan holds no secret, so it skips that check.
 *
 * Each method infers its response from the variables requested, validates it with zod, and rejects out-of-range
 * parameters with `invalid_argument` before anything is sent. Every failure is a `MeshlyError` with an
 * `OpenMeteoErrorCode`; the key is redacted from every message. Redirects are never followed. Nothing is cached.
 *
 * **Terms of use.** They are Open-Meteo's [terms](https://open-meteo.com/en/terms) and
 * [pricing](https://open-meteo.com/en/pricing), which can change; this package doesn't enforce them. At the time of
 * writing:
 *
 * - **Free plan:** "You may only use the free API services for non-commercial purposes" (sites or apps with
 *   subscriptions or ads count as commercial), with fewer than 10,000 calls a day, 5,000 an hour, 600 a minute and
 *   300,000 a month. Limits are per IP, so shared serverless IPs (Vercel, Netlify, Render) can hit them sooner.
 * - **Data under CC BY 4.0:** attribution is required, e.g. "Weather data by Open-Meteo.com" with a link.
 * - **Commercial plan:** a subscription gives the commercial licence and the key. API Standard has no historical,
 *   climate, ensemble, satellite or seasonal APIs; API Professional has them. Each method says which it needs.
 *
 * @example
 * ```ts
 * const meteo = createOpenMeteoClient({ plan: "free" });
 * const weather = await meteo.forecast({ latitude: 52.52, longitude: 13.41, hourly: ["temperature_2m"] });
 * weather.hourly.temperature_2m; // (number | null)[]
 *
 * const paid = createOpenMeteoClient({ plan: "commercial", apiKey: process.env.OPEN_METEO_API_KEY! });
 * ```
 */
export const createOpenMeteoClient = (
  options: OpenMeteoClientOptions,
): OpenMeteoClient => {
  const plan = options?.plan;
  if (plan !== "free" && plan !== "commercial") {
    throw meteoError("invalid_argument", 'plan must be "free" or "commercial"');
  }
  let apiKey: string | undefined;
  if (plan === "commercial") {
    // Only the commercial plan holds a secret, so only it is restricted to the server.
    assertServerRuntime();
    if (!isCredential(options.apiKey)) {
      throw meteoError(
        "invalid_argument",
        "apiKey must be a non-empty string without whitespace or control characters",
      );
    }
    apiKey = options.apiKey;
  } else if (
    (
      options as {
        apiKey?: unknown;
      }
    ).apiKey !== undefined
  ) {
    throw meteoError(
      "invalid_argument",
      'apiKey is only used with plan: "commercial"; the free plan takes no credentials',
    );
  }
  const timeoutMs = options.timeoutMs ?? OPEN_METEO_REQUEST_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw meteoError("invalid_argument", "timeoutMs must be a positive number");
  }
  const fetch: FetchLike = options.fetch ?? globalThis.fetch;
  const http = createHttp({
    apiKey,
    fetch,
    signal: options.signal,
    timeoutMs,
  });

  return {
    airQuality: createAirQuality(http),
    climate: createClimate(http),
    elevation: createElevation(http),
    ensemble: createEnsemble(http),
    flood: createFlood(http),
    forecast: createForecast(http),
    geocoding: createGeocoding(http),
    historical: createHistorical(http),
    historicalForecast: createHistoricalForecast(http),
    marine: createMarine(http),
    modelUpdates: createModelUpdates(http),
    plan,
    previousRuns: createPreviousRuns(http),
    satelliteRadiation: createSatelliteRadiation(http),
    seasonal: createSeasonal(http),
    singleRuns: createSingleRuns(http),
  };
};
