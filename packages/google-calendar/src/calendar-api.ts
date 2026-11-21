import type { FetchLike } from "@usemeshly/auth";
import { MeshlyError } from "@usemeshly/auth";
import { z } from "zod";
import {
  calendarListEntrySchema,
  errorBodySchema,
  eventSchema,
  pageSchema,
} from "./schemas";
import type {
  CalendarListParams,
  CallOptions,
  EventsListParams,
  GoogleCalendarClient,
  GoogleCalendarClientOptions,
  GoogleCalendarErrorCode,
  GoogleEvent,
  ListResult,
  WriteOptions,
} from "./types";

const BASE_URL = "https://www.googleapis.com/calendar/v3";

/** Default deadline per HTTP request. */
export const GOOGLE_REQUEST_TIMEOUT_MS = 30_000;

type Method = "DELETE" | "GET" | "PATCH" | "POST";
type Query = Record<string, string | number | boolean | undefined>;

const calendarPageSchema = pageSchema(calendarListEntrySchema);
const eventPageSchema = pageSchema(eventSchema);

const RATE_LIMIT_REASONS = new Set([
  "quotaExceeded",
  "rateLimitExceeded",
  "userRateLimitExceeded",
]);

const calendarError = (
  code: GoogleCalendarErrorCode,
  message: string,
  extra: {
    status?: number;
    providerCode?: string;
    secrets?: readonly string[];
  } = {},
): MeshlyError<GoogleCalendarErrorCode> =>
  new MeshlyError({
    code,
    message,
    provider: "google",
    ...extra,
  });

const statusCode = (
  status: number,
  reason: string | undefined,
): GoogleCalendarErrorCode => {
  if (status === 401) return "unauthorized";
  if (status === 429) return "rate_limited";
  if (status === 403) {
    if (reason !== undefined && RATE_LIMIT_REASONS.has(reason)) {
      return "rate_limited";
    }
    if (reason === "insufficientPermissions") return "insufficient_scope";
  }
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 412) return "precondition_failed";
  return "api_error";
};

/** Path segments are encoded; queries never reach messages, since they can carry sync and page tokens. */
const path = (...segments: string[]): string =>
  segments.map(encodeURIComponent).join("/");

const isGone = (error: unknown): boolean =>
  error instanceof MeshlyError && error.status === 410;

const isNotFound = (error: unknown): boolean =>
  error instanceof MeshlyError &&
  (error.status === 404 || error.status === 410);

/**
 * Google Calendar API v3 over `fetch`. The client knows nothing about your app or storage: it asks `getAccessToken`
 * for a token before every request and validates every response with zod.
 *
 * @example
 * ```ts
 * const tokens = createTokenManager({ provider: googleOAuthProvider, client, load, save });
 * const calendar = createGoogleCalendarClient({ getAccessToken: tokens.getAccessToken });
 * const { items, nextSyncToken } = await calendar.events.list("primary");
 * ```
 */
export const createGoogleCalendarClient = (
  options: GoogleCalendarClientOptions,
): GoogleCalendarClient => {
  const fetch: FetchLike = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? GOOGLE_REQUEST_TIMEOUT_MS;

  const requestSignal = (call: CallOptions | undefined): AbortSignal =>
    AbortSignal.any(
      [
        AbortSignal.timeout(timeoutMs),
        options.signal,
        call?.signal,
      ].filter((signal): signal is AbortSignal => signal !== undefined),
    );

  const transportError = (
    error: unknown,
    label: string,
  ): MeshlyError<GoogleCalendarErrorCode> => {
    if (error instanceof Error && error.name === "TimeoutError") {
      return calendarError("timeout", `${label} did not finish in time`);
    }
    if (error instanceof Error && error.name === "AbortError") {
      return calendarError("aborted", `${label} was aborted`);
    }
    return calendarError(
      "network_error",
      `${label} could not reach Google${error instanceof Error ? ` (${error.name})` : ""}`,
    );
  };

  const request = async (
    method: Method,
    resource: string,
    init: {
      query?: Query;
      body?: object;
      call?: CallOptions;
    },
    /** Set on the one retry after a 401: the token Google rejected. */
    rejectedToken?: string,
  ): Promise<unknown> => {
    const label = `${method} /${resource}`;
    const url = new URL(`${BASE_URL}/${resource}`);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const token =
      rejectedToken === undefined
        ? await options.getAccessToken()
        : await options.getAccessToken({
            forceRefresh: true,
            rejectedToken,
          });
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const signal = requestSignal(init.call);

    let response: Response;
    let json: unknown = null;
    try {
      response = await fetch(url.toString(), {
        headers,
        method,
        signal,
        ...(init.body === undefined
          ? {}
          : {
              body: JSON.stringify(init.body),
            }),
      });
      const text = response.status === 204 ? "" : await response.text();
      try {
        json = text === "" ? null : JSON.parse(text);
      } catch {
        json = undefined;
      }
    } catch (error) {
      throw transportError(error, label);
    }

    if (response.ok) {
      if (json === undefined) {
        throw calendarError(
          "invalid_response",
          `${label} returned a body that is not JSON`,
          {
            status: response.status,
          },
        );
      }
      return json;
    }
    if (response.status === 401 && rejectedToken === undefined) {
      return request(method, resource, init, token);
    }
    const body = errorBodySchema.safeParse(json);
    const reason = body.success
      ? (body.data.error.errors?.[0]?.reason ?? body.data.error.status)
      : undefined;
    const detail = body.success ? body.data.error.message : undefined;
    throw calendarError(
      statusCode(response.status, reason),
      `${label} failed with ${response.status}${detail === undefined ? "" : `: ${detail}`}`,
      {
        secrets: [
          token,
          rejectedToken,
        ].filter((secret): secret is string => secret !== undefined),
        status: response.status,
        ...(reason === undefined
          ? {}
          : {
              providerCode: reason,
            }),
      },
    );
  };

  const parseEvent = (json: unknown, label: string): GoogleEvent => {
    const parsed = eventSchema.safeParse(json);
    if (!parsed.success) {
      throw calendarError(
        "invalid_response",
        `${label} returned an invalid event: ${z.prettifyError(parsed.error)}`,
      );
    }
    return parsed.data;
  };

  /** Follows every page; a 410 while using a sync token means the token expired. */
  const listAll = async <Item>(
    resource: string,
    query: Query,
    schema: z.ZodType<{
      items: Item[];
      nextPageToken?: string | undefined;
      nextSyncToken?: string | undefined;
    }>,
    call: CallOptions,
  ): Promise<ListResult<Item>> => {
    const { syncToken } = query;
    const usesSyncToken = syncToken !== undefined;
    const items: Item[] = [];
    let pageToken: string | undefined;
    for (;;) {
      let json: unknown;
      try {
        json = await request("GET", resource, {
          call,
          query: {
            ...query,
            pageToken,
          },
        });
      } catch (error) {
        if (usesSyncToken && isGone(error)) {
          throw calendarError(
            "sync_token_expired",
            `The sync token for /${resource} expired: list again without it`,
            {
              status: 410,
            },
          );
        }
        throw error;
      }
      const page = schema.safeParse(json);
      if (!page.success) {
        throw calendarError(
          "invalid_response",
          `GET /${resource} returned an invalid page`,
        );
      }
      items.push(...page.data.items);
      if (page.data.nextPageToken === undefined) {
        return {
          items,
          nextSyncToken: page.data.nextSyncToken ?? null,
        };
      }
      pageToken = page.data.nextPageToken;
    }
  };

  const eventPath = (calendarId: string, eventId?: string): string =>
    eventId === undefined
      ? path("calendars", calendarId, "events")
      : path("calendars", calendarId, "events", eventId);

  return {
    calendarList: {
      list: (params: CalendarListParams = {}) =>
        listAll(
          "users/me/calendarList",
          {
            maxResults: params.maxResults ?? 250,
            minAccessRole: params.minAccessRole,
            showDeleted: params.showDeleted,
            showHidden: params.showHidden,
            syncToken: params.syncToken,
          },
          calendarPageSchema,
          params,
        ),
    },
    events: {
      delete: async (calendarId, eventId, writeOptions: WriteOptions = {}) => {
        try {
          await request("DELETE", eventPath(calendarId, eventId), {
            call: writeOptions,
            query: {
              sendUpdates: writeOptions.sendUpdates,
            },
          });
        } catch (error) {
          if (isNotFound(error)) return;
          throw error;
        }
      },
      get: async (calendarId, eventId, call: CallOptions = {}) => {
        let json: unknown;
        try {
          json = await request("GET", eventPath(calendarId, eventId), {
            call,
          });
        } catch (error) {
          if (isNotFound(error)) return null;
          throw error;
        }
        return parseEvent(json, "GET event");
      },
      insert: async (calendarId, event, writeOptions: WriteOptions = {}) =>
        parseEvent(
          await request("POST", eventPath(calendarId), {
            body: event,
            call: writeOptions,
            query: {
              sendUpdates: writeOptions.sendUpdates,
            },
          }),
          "POST event",
        ),
      list: (calendarId, params: EventsListParams = {}) =>
        listAll(
          eventPath(calendarId),
          {
            maxResults: params.maxResults ?? 2500,
            orderBy: params.orderBy,
            q: params.q,
            showDeleted: params.showDeleted,
            singleEvents: params.singleEvents,
            syncToken: params.syncToken,
            timeMax: params.timeMax,
            timeMin: params.timeMin,
            timeZone: params.timeZone,
            updatedMin: params.updatedMin,
          },
          eventPageSchema,
          params,
        ),
      patch: async (
        calendarId,
        eventId,
        event,
        writeOptions: WriteOptions = {},
      ) =>
        parseEvent(
          await request("PATCH", eventPath(calendarId, eventId), {
            body: event,
            call: writeOptions,
            query: {
              sendUpdates: writeOptions.sendUpdates,
            },
          }),
          "PATCH event",
        ),
    },
  };
};
