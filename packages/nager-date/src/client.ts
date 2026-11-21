import type { FetchLike } from "@usemeshly/auth";
import { assertServerRuntime } from "@usemeshly/auth";
import { apiKeyHeader } from "@usemeshly/auth/basic";
import { createCountriesResource } from "./countries";
import { communityCountrySchema, proCountrySchema } from "./countries/schemas";
import { nagerError } from "./errors";
import { createHolidaysResource } from "./holidays";
import { communityHolidaySchema, proHolidaySchema } from "./holidays/schemas";
import type { HttpConfig } from "./http";
import { createHttp, NAGER_DATE_REQUEST_TIMEOUT_MS } from "./http";
import { createLongWeekendsResource } from "./long-weekends";
import type {
  NagerDateClient,
  NagerDateClientOptions,
  NagerDateCommunityClient,
  NagerDateCommunityOptions,
  NagerDateProClient,
  NagerDateProOptions,
} from "./types";
import { createCommunityVersions, createProVersions } from "./versions";

const transport = (
  options: NagerDateClientOptions,
): Pick<HttpConfig, "fetch" | "signal" | "timeoutMs"> => {
  const timeoutMs = options.timeoutMs ?? NAGER_DATE_REQUEST_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw nagerError("invalid_argument", "timeoutMs must be a positive number");
  }
  const fetch: FetchLike = options.fetch ?? globalThis.fetch;
  return {
    fetch,
    signal: options.signal,
    timeoutMs,
  };
};

/**
 * A typed client for the [Nager.Date](https://date.nager.at) public holidays API. Pick the plan when you create it:
 *
 * - `{ plan: "community" }`: the free Community API (v4). No credentials. Runs anywhere.
 * - `{ plan: "pro", apiKey }`: the paid Pro API (v1), which adds long weekends and richer countries and holidays. It is
 *   in beta (see `@experimental` below). The key goes in the `x-api-key` header, so this plan is server-side only and
 *   throws `unsupported_environment` in a browser-like runtime. The Community plan has no secret, so it skips that check.
 *
 * Every response is validated with zod, and every failure is a `MeshlyError` with a `NagerDateErrorCode`. Redirects
 * are never followed, so the key can't reach another host. Nothing is cached: cache in your app if you need to.
 *
 * **Terms of use.** Using the API means accepting Nager.Date's
 * [Terms of Service](https://date.nager.at/Legal/TermsOfService), which the provider can change without notice. At the
 * time of writing: the Community API is for "private or non-profit projects. For commercial purposes we require active
 * sponsorship"; "it is not allowed to use the holiday information to publish or operate your own holiday portal"; and
 * "we do not warrant the availability, accuracy, or reliability of our services". This package doesn't enforce any of
 * it: complying is your responsibility.
 *
 * @experimental The Pro plan (API v1) is in beta and subject to change.
 * @example
 * ```ts
 * const nager = createNagerDateClient({ plan: "community" });
 * const holidays = await nager.holidays.list("US", 2026);
 *
 * const pro = createNagerDateClient({ plan: "pro", apiKey: process.env.NAGER_API_KEY! });
 * const weekends = await pro.longWeekends.list("DE", 2026, { availableBridgeDays: 2 });
 * ```
 */
export function createNagerDateClient(
  options: NagerDateCommunityOptions,
): NagerDateCommunityClient;
export function createNagerDateClient(
  options: NagerDateProOptions,
): NagerDateProClient;
export function createNagerDateClient(
  options: NagerDateClientOptions,
): NagerDateClient;
export function createNagerDateClient(
  options: NagerDateClientOptions,
): NagerDateClient {
  if (options?.plan === "pro") {
    // Only the Pro plan holds a secret, so only it is restricted to the server.
    assertServerRuntime();
    const { apiKey } = options;
    const http = createHttp({
      ...transport(options),
      // Validates the key (non-empty, no whitespace or control characters) without echoing it.
      headers: apiKeyHeader(apiKey, {
        header: "x-api-key",
      }),
      prefix: "/api/pro/v1",
      secrets: [
        apiKey,
      ],
    });
    return {
      countries: createCountriesResource(http, proCountrySchema),
      holidays: createHolidaysResource(http, proHolidaySchema),
      longWeekends: createLongWeekendsResource(http),
      plan: "pro",
      versions: createProVersions(http),
    };
  }
  if (options?.plan === "community") {
    if (
      (
        options as {
          apiKey?: unknown;
        }
      ).apiKey !== undefined
    ) {
      throw nagerError(
        "invalid_argument",
        'apiKey is only used with plan: "pro"; the Community API takes no credentials',
      );
    }
    const http = createHttp({
      ...transport(options),
      headers: {},
      prefix: "/api/v4",
      secrets: [],
    });
    return {
      countries: createCountriesResource(http, communityCountrySchema),
      holidays: createHolidaysResource(http, communityHolidaySchema),
      plan: "community",
      versions: createCommunityVersions(http),
    };
  }
  throw nagerError("invalid_argument", 'plan must be "community" or "pro"');
}
