# @usemeshly/open-meteo

Typed client for every [Open-Meteo](https://open-meteo.com) API, over JSON, on the free and the commercial plan:

- **Responses inferred from what you request.** `hourly: ["temperature_2m"]` gives you `hourly.temperature_2m`. A variable you didn't request is a compile error. So are a misspelled variable or parameter.
- **Every response validated** with zod, nulls included.
- **Parameters checked before sending.** Coordinates, day ranges (each API's own), dates, units and model names are checked, and a bad one rejects with `invalid_argument`.
- **Typed `MeshlyError`s**, with Open-Meteo's `reason` kept and the API key redacted.

> **Server-side only for the commercial plan.** Your API key is sent as `&apikey=` and gives access to your paid subscription. Use `plan: "commercial"` only from a backend, a serverless function, a CLI or a desktop app, never in a browser or mobile bundle. `createOpenMeteoClient({ plan: "commercial", ... })` throws `unsupported_environment` in a browser-like runtime. The free plan holds no secret, so it skips that check.

> **Terms of use.** Using Open-Meteo means accepting its [terms](https://open-meteo.com/en/terms), [licence](https://open-meteo.com/en/licence) and [pricing](https://open-meteo.com/en/pricing), which can change. This package doesn't enforce any of them: complying is your responsibility. At the time of writing:
>
> - **Free plan: non-commercial use only.** "You may only use the free API services for non-commercial purposes." Sites or apps with subscriptions or advertising count as commercial. Limits: "Less than 10'000 API calls per day, 5'000 per hour and 600 per minute", and 300,000 a month. Limits apply per IP, so on providers like Vercel, Netlify or Render you can hit them sooner.
> - **Data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).** You must credit Open-Meteo, e.g. `<a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>`.
> - **Commercial plan.** A subscription gives you the commercial licence and the key. Plans differ in which APIs they include: **API Standard** has no historical, climate, ensemble, satellite or seasonal APIs. **API Professional** has them. See [the table below](#apis) and [pricing](https://open-meteo.com/en/pricing).

## Install

`@usemeshly/auth` is a peer dependency: install both.

```bash
pnpm add -E @usemeshly/auth @usemeshly/open-meteo
```

Requires Node.js 20.3+ (or any runtime with `fetch` and `AbortSignal.any`). Works with `import` and `require`.

## Create the client

```ts
import { createOpenMeteoClient } from "@usemeshly/open-meteo";

const meteo = createOpenMeteoClient({ plan: "free" });
const paid = createOpenMeteoClient({ plan: "commercial", apiKey: process.env.OPEN_METEO_API_KEY! });
```

- `free` calls the public hosts (`api.open-meteo.com`, …) and takes no `apiKey`. Passing one is a type error, and `invalid_argument` at runtime.
- `commercial` calls the `customer-` hosts (`customer-api.open-meteo.com`, …) and adds `&apikey=<key>` to every request with `apiKeyQueryParam` from `@usemeshly/auth/basic`. Otherwise the requests are identical.

Options for both plans: `fetch` (defaults to the global one), `timeoutMs` per request (defaults to 30 seconds) and `signal` to abort every request. Every method also takes a per-call `{ signal }` as its second argument. Only HTTPS is used, and redirects are never followed.

### The key is in the URL

Open-Meteo only accepts the key as a query parameter, so it travels in the URL. URLs end up in proxy, CDN and server access logs more often than headers do. This package never puts a URL in an error: messages name the host and path only (`GET customer-api.open-meteo.com/v1/forecast failed with 429: …`), and `MeshlyError` also redacts the key and any `apikey=…`. If you pass your own `fetch`, don't log the URLs it receives.

## APIs

| Method | Endpoint | Minimum commercial plan | Variables |
| --- | --- | --- | --- |
| `forecast` | `api.open-meteo.com/v1/forecast` | Standard | `hourly`, `daily`, `current`, `minutely_15` |
| `historical` | `archive-api.open-meteo.com/v1/archive` | Professional | `hourly`, `daily` |
| `historicalForecast` | `historical-forecast-api.open-meteo.com/v1/forecast` | Professional | as `forecast` |
| `previousRuns` | `previous-runs-api.open-meteo.com/v1/forecast` | Professional | `hourly`, plus `_previous_day1`…`7` |
| `singleRuns` | `single-runs-api.open-meteo.com/v1/forecast` | Professional | as `forecast`, without `current` |
| `ensemble` | `ensemble-api.open-meteo.com/v1/ensemble` | Professional | `hourly`, `daily` (+ members) |
| `seasonal` | `seasonal-api.open-meteo.com/v1/seasonal` | Professional | `hourly`, `daily`, `weekly`, `monthly` (+ members) |
| `climate` | `climate-api.open-meteo.com/v1/climate` | Professional | `daily` |
| `airQuality` | `air-quality-api.open-meteo.com/v1/air-quality` | Standard | `hourly`, `current` |
| `marine` | `marine-api.open-meteo.com/v1/marine` | Standard | `hourly`, `daily`, `current`, `minutely_15` |
| `flood` | `flood-api.open-meteo.com/v1/flood` | Standard | `daily` (+ members) |
| `satelliteRadiation` | `satellite-api.open-meteo.com/v1/archive` | Professional | `hourly`, `daily` |
| `elevation` | `api.open-meteo.com/v1/elevation` | Standard | — |
| `geocoding.search`, `geocoding.get` | `geocoding-api.open-meteo.com/v1/search`, `/v1/get` | Standard | — |
| `modelUpdates.get` | `<api>.open-meteo.com/data/<model>/static/meta.json` | any | — |

On the commercial plan every host gets the `customer-` prefix.

- **Regional model APIs.** The docs' ECMWF, GFS, DWD ICON, Météo-France, JMA, UKMO and other pages are `forecast` with a `models` value. Every value from the spec and those pages is in the `ForecastModel` union.
- **Ensemble Mean API.** This is `ensemble` with an `*_ensemble_mean` model (`ecmwf_ifs025_ensemble_mean`, …), which are in the `EnsembleModel` union.

Each method's TSDoc has its parameters, ranges and defaults, the minimum plan and an example. Each variable's hover text is its label from the Open-Meteo docs.

## Forecast

```ts
const weather = await meteo.forecast({
  latitude: 52.52,
  longitude: 13.41,
  hourly: ["temperature_2m", "precipitation"],
  daily: ["temperature_2m_max", "sunrise"],
  current: ["weather_code"],
  timezone: "auto",
  forecast_days: 3,
});

weather.hourly.time; // string[], e.g. "2026-11-21T00:00"
weather.hourly.temperature_2m; // (number | null)[], aligned with time
weather.hourly_units.temperature_2m; // "°C"
weather.daily.sunrise; // (string | null)[]
weather.current.weather_code; // number | null
weather.hourly.wind_speed_10m; // compile error: not requested
```

- Values are `null` where a model has no data.
- With `timeformat: "unixtime"`, `time` and timestamp variables such as `sunrise` are typed as numbers (Unix seconds).
- Units follow `temperature_unit`, `wind_speed_unit` and `precipitation_unit` (`length_unit` on `marine`). The unit of each variable is in `<section>_units`.

### Several locations

Pass arrays of the same length for `latitude` and `longitude`. The result is an array, one entry per location, in the same order:

```ts
const [berlin, paris] = await meteo.forecast({
  latitude: [52.52, 48.85],
  longitude: [13.41, 2.35],
  hourly: ["temperature_2m"],
});
```

### Several models

With two or more `models`, Open-Meteo returns every variable once per model, suffixed with the model name, and so do the types:

```ts
const compared = await meteo.forecast({
  latitude: 52.52,
  longitude: 13.41,
  hourly: ["temperature_2m"],
  models: ["icon_global", "ecmwf_ifs025"],
});
compared.hourly.temperature_2m_icon_global;
compared.hourly.temperature_2m_ecmwf_ifs025;
```

## Historical weather and climate

`start_date` and `end_date` (`YYYY-MM-DD`) are required:

```ts
const january = await meteo.historical({
  latitude: 52.52,
  longitude: 13.41,
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  daily: ["temperature_2m_mean", "precipitation_sum"],
  timezone: "Europe/Berlin",
});

const future = await meteo.climate({
  latitude: 52.52,
  longitude: 13.41,
  start_date: "2040-01-01",
  end_date: "2040-12-31",
  daily: ["temperature_2m_max"],
  models: ["MRI_AGCM3_2_S"],
});
```

## Archived forecasts, previous runs and single runs

```ts
await meteo.historicalForecast({ latitude: 52.52, longitude: 13.41, start_date: "2024-06-01", end_date: "2024-06-07", hourly: ["temperature_2m"] });

// What was forecast 1 and 3 days before each hour:
await meteo.previousRuns({
  latitude: 52.52,
  longitude: 13.41,
  hourly: ["temperature_2m", "temperature_2m_previous_day1", "temperature_2m_previous_day3"],
  past_days: 7,
});

// One model run, by its UTC initialisation time:
await meteo.singleRuns({ latitude: 52.52, longitude: 13.41, run: "2026-11-20T00:00", models: ["icon_global"], hourly: ["temperature_2m"] });
```

## Ensemble and seasonal forecasts

Each member comes back as `<variable>_memberNN` next to the control run. The member keys are typed as optional, because how many exist depends on the model:

```ts
const runs = await meteo.ensemble({ latitude: 52.52, longitude: 13.41, hourly: ["temperature_2m"], models: ["dwd_icon_seamless_eps"] });
runs.hourly.temperature_2m; // control run
runs.hourly.temperature_2m_member01; // (number | null)[] | undefined

const season = await meteo.seasonal({ latitude: 52.52, longitude: 13.41, monthly: ["temperature_2m_mean"] });
```

## Air quality, marine, flood and satellite radiation

```ts
const air = await meteo.airQuality({ latitude: 52.52, longitude: 13.41, current: ["european_aqi", "pm2_5"] });
const sea = await meteo.marine({ latitude: 54.54, longitude: 10.23, hourly: ["wave_height", "wave_direction"], length_unit: "imperial" });
const river = await meteo.flood({ latitude: 59.91, longitude: 10.75, daily: ["river_discharge"], ensemble: true });
const sun = await meteo.satelliteRadiation({ latitude: 52.52, longitude: 13.41, hourly: ["shortwave_radiation"] });
```

## Elevation

```ts
const [berlin, paris] = await meteo.elevation({ latitude: [52.52, 48.85], longitude: [13.41, 2.35] }); // metres
```

## Geocoding

```ts
const [berlin] = await meteo.geocoding.search("Berlin", { count: 1, language: "de", countryCode: "DE" });
const same = await meteo.geocoding.get(2950159);
```

`search` returns `[]` when nothing matches. `name` accepts `"Paris, France"` or `"Los Angeles, CA"` to narrow the results. Location data comes from GeoNames: see Open-Meteo's [licence page](https://open-meteo.com/en/licence) for its attribution.

## Model updates

```ts
const icon = await meteo.modelUpdates.get("dwd_icon"); // forecast server
const ens = await meteo.modelUpdates.get("ecmwf_ifs025_ensemble", { api: "ensemble" });
new Date(icon.last_run_availability_time * 1000);
```

The model is its data directory name, as linked in the [model updates table](https://open-meteo.com/en/docs/model-updates). Wait about 10 minutes after `last_run_availability_time` for every server to have the run.

## Input validation

These are checked before any request is sent, and reject with `invalid_argument`:

| Parameter | Rule |
| --- | --- |
| `latitude`, `longitude` | -90 to 90 and -180 to 180. Both numbers, or arrays of the same non-zero length |
| `hourly`, `daily`, … | Only the variables that API offers in that section |
| `models` | Only that API's models |
| `past_days`, `forecast_days` | Integers in the API's range: forecast 0-92 / 0-16, air quality 0-92 / 0-7, ensemble 0-92 / 0-36, flood 0-92 / 0-366, seasonal 0-92 / 0-217, marine 0-92 / 0-16 |
| `past_hours`, `forecast_hours` | Non-negative integers |
| `start_date`, `end_date` | Real dates as `YYYY-MM-DD`, given together, start not after end. Required on `historical`, `historicalForecast` and `climate` |
| `run` | `YYYY-MM-DDTHH:MM`, required on `singleRuns` |
| `timezone` | `auto`, `GMT` or an IANA name such as `America/Argentina/Buenos_Aires` |
| `tilt` | 0 to 90 |
| Units, `timeformat`, `cell_selection`, `domains`, `temporal_resolution` | Only their documented values |
| `geocoding.search` | Non-empty `name`, `count` 1-100, lower-case `language`, two-letter `countryCode` |
| Any other parameter | Rejected, since it isn't one of the API's parameters |

Ranges Open-Meteo enforces itself, such as which dates each model covers, come back as `bad_request` with Open-Meteo's reason.

## Errors

Every failure is a `MeshlyError` from `@usemeshly/auth`, with `provider: "open-meteo"`. Narrow it with `isMeshlyError(error, ...codes)`:

```ts
import { isMeshlyError } from "@usemeshly/auth";

try {
  await meteo.forecast(params);
} catch (error) {
  if (isMeshlyError(error, "rate_limited")) {
    // free plan: per-IP limits, retry later
  }
  throw error;
}
```

| Code | Meaning |
| --- | --- |
| `bad_request` | Open-Meteo rejected the request (400 with `{ "error": true, "reason": "…" }`). The message ends with the `reason`. |
| `unauthorized` | The key is missing or invalid, or your plan has no access to this API (401/403, or a 400 about the API key). |
| `rate_limited` | Too many requests (429). On the free plan the limits are per IP. |
| `server_error` | Open-Meteo failed (5xx). Retry later. |
| `api_error` | Any other status, including a redirect, which is never followed. |
| `invalid_response` | The response failed validation, e.g. a requested variable is missing. |
| `unsupported_environment` | `plan: "commercial"` was used in a browser-like runtime. |
| `invalid_argument` | A parameter failed [validation](#input-validation). Nothing was sent. |
| `network_error`, `timeout`, `aborted` | Shared with every usemeshly package. |

## Caching

The package doesn't cache. Forecasts update at most hourly, and historical data rarely changes, so cache in your app (by request parameters) if you call often. On the free plan, that also keeps you within the rate limits.

## Using it with NestJS

```ts
{
  provide: OPEN_METEO,
  useFactory: () => createOpenMeteoClient({ plan: "commercial", apiKey: process.env.OPEN_METEO_API_KEY! }),
}
```

## API sources

The variables, models, ranges and labels are generated by `scripts/generate.mjs` from:

- the OpenAPI specs in [`open-meteo/open-meteo/openapi`](https://github.com/open-meteo/open-meteo/tree/7cc41ffa9a79c2e4c7ad4e18f13b51ab8df610aa/openapi) at commit `7cc41ffa9a79c2e4c7ad4e18f13b51ab8df610aa` (2026-11-20): forecast, historical weather, air quality, marine, ensemble, climate, flood, elevation and seasonal;
- the docs pages in [`open-meteo/open-meteo-website`](https://github.com/open-meteo/open-meteo-website/tree/5abec50cf4bdd0959881aad670b90594429ef2e0/src/routes/en/docs) at commit `5abec50cf4bdd0959881aad670b90594429ef2e0` (2026-11-16). These supply the variable labels, the APIs without a spec (geocoding, historical forecast, previous runs, single runs, satellite radiation, model updates), the ensemble-mean models, and the regional models missing from the forecast spec.

To update, clone both repositories and run `pnpm run generate <open-meteo> <open-meteo-website>` in this package, then update the commits above.

FlatBuffers (`format=flatbuffers`), CSV and XLSX are not supported: this package uses JSON only.

## License

ISC. Open-Meteo data is CC BY 4.0: see the terms of use at the top.
