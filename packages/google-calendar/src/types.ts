import type { CommonErrorCode, FetchLike } from "@usemeshly/auth";
import type { z } from "zod";
import type {
  calendarListEntrySchema,
  eventSchema,
  eventTimeSchema,
} from "./schemas";

export type GoogleCalendarListEntry = z.output<typeof calendarListEntrySchema>;
export type GoogleEventTime = z.output<typeof eventTimeSchema>;
export type GoogleEvent = z.output<typeof eventSchema>;

/**
 * The event fields this client writes. On a patch, fields left out keep their value at Google (attendees,
 * conferences and anything not listed here included).
 */
export type GoogleEventInput = {
  /** Only on insert: your own id (5-1024 characters, base32hex). */
  id?: string;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  recurrence?: string[];
  attendees?: {
    email: string;
    displayName?: string;
    optional?: boolean;
  }[];
  reminders?: {
    useDefault: boolean;
    overrides?: {
      method: "email" | "popup";
      minutes: number;
    }[];
  };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  colorId?: string;
  status?: "confirmed" | "tentative" | "cancelled";
  transparency?: "opaque" | "transparent";
  visibility?: "default" | "public" | "private" | "confidential";
};

/** Per-call options. */
export type CallOptions = {
  signal?: AbortSignal;
};

/** Who Google emails about the change. */
export type SendUpdates = "all" | "externalOnly" | "none";

export type WriteOptions = CallOptions & {
  sendUpdates?: SendUpdates;
};

type ListOptions = CallOptions & {
  /** Page size Google uses while this client follows every page. Defaults to the maximum. */
  maxResults?: number;
  showDeleted?: boolean;
};

/** The calendars in the user's list, every page. */
export type CalendarListParams = ListOptions & {
  showHidden?: boolean;
} & (
    | {
        /** From a previous list: only the changes since then. */
        syncToken: string;
        minAccessRole?: never;
      }
    | {
        syncToken?: undefined;
        minAccessRole?: "freeBusyReader" | "reader" | "writer" | "owner";
      }
  );

type EventsListCommon = ListOptions & {
  /** Expand recurring events into their occurrences. */
  singleEvents?: boolean;
  timeZone?: string;
};

/**
 * A full list (with optional filters) or, with `syncToken`, only the changes since that list. Google rejects filters
 * together with a sync token, so the types do too.
 */
export type EventsListParams = EventsListCommon &
  (
    | {
        syncToken: string;
        timeMin?: never;
        timeMax?: never;
        updatedMin?: never;
        q?: never;
        orderBy?: never;
      }
    | {
        syncToken?: undefined;
        /** RFC 3339 lower bound (exclusive) for an event's end. */
        timeMin?: string;
        /** RFC 3339 upper bound (exclusive) for an event's start. */
        timeMax?: string;
        updatedMin?: string;
        q?: string;
        /** `startTime` requires `singleEvents: true`. */
        orderBy?: "startTime" | "updated";
      }
  );

/** Every item of a list plus the token for the next incremental sync (null when Google didn't issue one). */
export type ListResult<Item> = {
  items: Item[];
  nextSyncToken: string | null;
};

export type GoogleCalendarClientOptions = {
  /**
   * Returns a valid access token; called before every request. Pass `createTokenManager(...).getAccessToken` from
   * `@usemeshly/auth/oauth`: on a 401 the client calls it once more with `{ forceRefresh: true, rejectedToken }` and
   * retries.
   */
  getAccessToken: (options?: {
    forceRefresh?: boolean;
    /** The token that just got a 401. */
    rejectedToken?: string;
  }) => Promise<string>;
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Deadline per HTTP request, in milliseconds. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Aborts every request made by this client. */
  signal?: AbortSignal;
};

export type GoogleCalendarClient = {
  calendarList: {
    list: (
      params?: CalendarListParams,
    ) => Promise<ListResult<GoogleCalendarListEntry>>;
  };
  events: {
    list: (
      calendarId: string,
      params?: EventsListParams,
    ) => Promise<ListResult<GoogleEvent>>;
    /** The event or occurrence, cancelled ones included; null when Google has none. */
    get: (
      calendarId: string,
      eventId: string,
      options?: CallOptions,
    ) => Promise<GoogleEvent | null>;
    insert: (
      calendarId: string,
      event: GoogleEventInput,
      options?: WriteOptions,
    ) => Promise<GoogleEvent>;
    patch: (
      calendarId: string,
      eventId: string,
      event: GoogleEventInput,
      options?: WriteOptions,
    ) => Promise<GoogleEvent>;
    /** Deletes an event, or cancels an occurrence given its instance id. One already gone counts as deleted. */
    delete: (
      calendarId: string,
      eventId: string,
      options?: WriteOptions,
    ) => Promise<void>;
  };
};

/** Error codes raised by `@usemeshly/google-calendar`. */
export type GoogleCalendarErrorCode =
  | CommonErrorCode
  /** Google refused the access token (401), also after a forced refresh. */
  | "unauthorized"
  /** The grant lacks a scope this call needs (403): ask the user to grant it. */
  | "insufficient_scope"
  /** Quota or rate limit (403/429): retry later with backoff. */
  | "rate_limited"
  | "not_found"
  | "conflict"
  | "precondition_failed"
  /** The sync token is no longer valid (410 Gone): drop it and do a full list. */
  | "sync_token_expired"
  /** Any other error status from Google. */
  | "api_error";
