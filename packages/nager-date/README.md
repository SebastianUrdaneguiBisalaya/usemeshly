# @usemeshly/nager-date

Typed client for the [Nager.Date](https://date.nager.at) public holidays API, covering both plans:

- **Community API (v4)**: free, no credentials.
- **Pro API (v1)**: paid, with an API key. It adds long weekends and richer countries and holidays. **It is in beta** (see [below](#pro-api-v1-is-experimental)).

Every response is validated with zod, and every failure is a `MeshlyError` with a typed `code`. Nothing is cached or stored.

> **Server-side only for the Pro plan.** The Pro API key gives access to your paid account, so use `plan: "pro"` only from a backend, a serverless function, a CLI or a desktop app. Never ship it, or the key, to a browser or mobile bundle. `createNagerDateClient({ plan: "pro", ... })` throws `unsupported_environment` in a browser-like runtime. The Community plan holds no secret, so it skips that check.

> **Terms of use.** Using the API means accepting Nager.Date's [Terms of Service](https://date.nager.at/Legal/TermsOfService), which the provider can change at any time. At the time of writing (last updated 2023-09-15) they say:
>
> - The Community API is for "private or non-profit projects. For commercial purposes we require active sponsorship."
> - "It is not allowed to use the holiday information to publish or operate your own holiday portal."
> - "We do not warrant the availability, accuracy, or reliability of our services."
>
> This package doesn't enforce any of this. Checking that your use complies is your responsibility.

## Install

`@usemeshly/auth` is a peer dependency: install both.

```bash
pnpm add -E @usemeshly/auth @usemeshly/nager-date
```

Requires Node.js 20.3+ (or any runtime with `fetch` and `AbortSignal.any`). Works with `import` and `require`.

## Create the client

Pick the plan when you create the client. The plan decides which credentials are required and which methods exist:

```ts
import { createNagerDateClient } from "@usemeshly/nager-date";

const nager = createNagerDateClient({ plan: "community" });
const pro = createNagerDateClient({ plan: "pro", apiKey: process.env.NAGER_API_KEY! });

pro.longWeekends.list("DE", 2026); // ok
nager.longWeekends; // compile error: long weekends are Pro only
```

- `community` takes no `apiKey`. Passing one is a type error, and `invalid_argument` at runtime.
- `pro` requires `apiKey`. It's sent in the `x-api-key` header (built with `apiKeyHeader` from `@usemeshly/auth/basic`) and never appears in errors.

Options for both plans: `fetch` (defaults to the global one), `timeoutMs` per request (defaults to 30 seconds) and `signal` to abort every request. Every method also takes a per-call `signal`.

Both plans call `https://nagerholidays.com`, where `date.nager.at` now redirects. Requests use HTTPS only, and redirects are never followed (a redirect rejects with `api_error`), so the key can't be sent to another host.

## Holidays

```ts
const holidays = await nager.holidays.list("US", 2026);
// [{ date: "2026-01-01", name: "New Year's Day", countryCode: "US", nationalHoliday: true, subdivisionCodes: null, holidayTypes: ["Public", "Bank"] }, ...]

const upcoming = await nager.holidays.next("PE"); // the next 365 days
```

On the Pro plan, each holiday also has `id`, `observedDate`, `localName` and `englishName` (instead of `name`). The types are separate (`CommunityHoliday` and `ProHoliday`), so you only see fields your plan returns. When Nager.Date answers `204 No Content`, `list` and `next` return `[]`.

### Is today a holiday?

```ts
if (await nager.holidays.isToday("AT-1", { offset: 1 })) {
  // today is a public holiday in Burgenland (UTC+1)
}
```

It takes a country (`AT`) or a subdivision (`AT-1`). "Today" is the current UTC date, shifted by `offset` whole hours (an integer from -12 to 12, default 0). Nager.Date answers 200 for yes and 204 for no, and the method returns `true` or `false`.

## Countries

```ts
const countries = await nager.countries.available(); // Community: { countryCode, name }[]
const germany = await nager.countries.get("DE"); // names, region and neighboring countries in `borders`
```

On the Pro plan, `available()` returns `{ countryCode, commonName, nativeName, officialName, region, subRegion }[]`.

## Long weekends (Pro)

```ts
const weekends = await pro.longWeekends.list("DE", 2026, { availableBridgeDays: 2 });
// [{ startDate: "2026-05-14", endDate: "2026-05-17", dayCount: 4, needBridgeDay: true, bridgeDays: ["2026-05-15"] }, ...]
```

A long weekend is a break of at least three consecutive days created by public holidays. `availableBridgeDays` (an integer from 1 to 100, Nager.Date's default is 1) is the most bridge days (weekdays between a holiday and a weekend) to consider. The spec marks no field of a long weekend as required, so each one is optional in the type.

## Versions

```ts
await nager.versions(); // Community: { name: "Nager.Date", version: "2.45.7" }
await pro.versions(); // Pro: one { name, version } per Nager library
```

## Input validation

These are checked before any request is sent, and reject with `invalid_argument`:

| Parameter | Rule |
| --- | --- |
| `countryCode` | Two letters (ISO 3166-1 alpha-2), any case |
| `isoCode` | A country code, or a subdivision code such as `AT-1` or `US-CA` |
| `year` | An integer from 1 to 9999. Nager.Date supports a narrower range and answers `bad_request` outside it |
| `offset` | An integer from -12 to 12 |
| `availableBridgeDays` | An integer from 1 to 100 |

## Pro API (v1) is experimental

Nager.Date's own Pro spec says: "The API endpoints of version 1 are still in the beta phase and are subject to change. It is not yet advisable to use them for productive operation." The whole Pro plan is marked `@experimental` in this package. These endpoints are also marked experimental in the spec itself:

- `holidays.list`, `holidays.next` and `holidays.isToday`
- `versions`

If Nager.Date changes a Pro response, calls reject with `invalid_response` until this package is updated. The Community API (v4) is stable.

## Errors

Every failure is a `MeshlyError` from `@usemeshly/auth`, with `provider: "nager-date"`. Narrow it with `isMeshlyError(error, ...codes)`:

```ts
import { isMeshlyError } from "@usemeshly/auth";

try {
  await nager.holidays.list(countryCode, year);
} catch (error) {
  if (isMeshlyError(error, "not_found")) {
    // unknown country
  }
  throw error;
}
```

| Code | Meaning |
| --- | --- |
| `bad_request` | Nager.Date rejected the parameters (400). The message includes the fields it complained about. |
| `unauthorized` | The Pro API key is missing, invalid or not allowed (401/403). |
| `not_found` | Unknown country or subdivision code (404). |
| `rate_limited` | Too many requests (429). Retry later with backoff. |
| `server_error` | Nager.Date failed (5xx). Retry later. |
| `api_error` | Any other status, including a redirect, which is never followed. |
| `invalid_response` | The response failed validation against the spec. |
| `unsupported_environment` | `plan: "pro"` was used in a browser-like runtime. |
| `invalid_argument` | A parameter is out of range or malformed (see [Input validation](#input-validation)). Nothing was sent. |
| `network_error`, `timeout`, `aborted` | Shared with every usemeshly package. |

Messages never contain the API key.

## Caching

The package doesn't cache. Holidays for a past or current year rarely change, so if you call the API often, cache the results in your app (your database, a KV store, memory) for as long as suits you.

## Using it with NestJS

```ts
{
  provide: NAGER_DATE,
  useFactory: () => createNagerDateClient({ plan: "pro", apiKey: process.env.NAGER_API_KEY! }),
}
```

## API specs

The OpenAPI specs this package was written against are in [`openapi/`](./openapi): `community-api-v4.json` and `pro-api-v1.json`.

## License

ISC
