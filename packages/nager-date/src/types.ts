import type { FetchLike } from "@usemeshly/auth";
import type {
  CommunityCountry,
  CountriesResource,
  ProCountry,
} from "./countries/types";
import type {
  CommunityHolidaysResource,
  ProHolidaysResource,
} from "./holidays/types";
import type { LongWeekendsResource } from "./long-weekends/types";
import type { VersionInfo } from "./versions/types";

/** Per-call options. */
export type CallOptions = {
  /** Aborts this call. */
  signal?: AbortSignal;
};

type TransportOptions = {
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Deadline per HTTP request, in milliseconds. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Aborts every request made by this client. */
  signal?: AbortSignal;
};

/** The free Community API (v4). It takes no credentials. */
export type NagerDateCommunityOptions = TransportOptions & {
  plan: "community";
  /** The Community API takes no key: pass `plan: "pro"` to use one. */
  apiKey?: never;
};

/**
 * The paid Pro API (v1), authenticated with your API key in the `x-api-key` header.
 *
 * @experimental The Pro API v1 is in beta: its own spec says it is "subject to change. It is not yet advisable to use
 * them for productive operation."
 */
export type NagerDateProOptions = TransportOptions & {
  plan: "pro";
  /** Your Nager.Date Pro API key. Keep it server-side; this package never stores or logs it. */
  apiKey: string;
};

export type NagerDateClientOptions =
  | NagerDateCommunityOptions
  | NagerDateProOptions;

/** A client for the Community API (v4). */
export type NagerDateCommunityClient = {
  readonly plan: "community";
  countries: CountriesResource<CommunityCountry>;
  holidays: CommunityHolidaysResource;
  /**
   * The version of the Nager.Date library running on the server, including its exact NuGet package version.
   *
   * @example
   * ```ts
   * const { version } = await nager.versions();
   * ```
   */
  versions: (options?: CallOptions) => Promise<VersionInfo>;
};

/**
 * A client for the Pro API (v1). On top of the Community endpoints it has `longWeekends`, and richer countries and
 * holidays.
 *
 * @experimental The Pro API v1 is in beta and subject to change.
 */
export type NagerDateProClient = {
  readonly plan: "pro";
  countries: CountriesResource<ProCountry>;
  holidays: ProHolidaysResource;
  longWeekends: LongWeekendsResource;
  /**
   * The versions of the Nager libraries running on the server, one entry per library, with their exact NuGet package
   * versions.
   *
   * @experimental
   * @example
   * ```ts
   * const versions = await nager.versions();
   * ```
   */
  versions: (options?: CallOptions) => Promise<VersionInfo[]>;
};

export type NagerDateClient = NagerDateCommunityClient | NagerDateProClient;
