import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it, vi } from "vitest";
import { createGoogleCalendarClient } from "../src/index";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
};

describe("events.list", () => {
  it("follows every page and returns the next sync token", async () => {
    const fetch = vi.fn(async (url: string) =>
      new URL(url).searchParams.get("pageToken") === null
        ? json({
            items: [
              {
                id: "a",
                status: "confirmed",
              },
              {
                // No id: dropped instead of failing the sync.
                status: "confirmed",
              },
            ],
            nextPageToken: "page-2",
          })
        : json({
            items: [
              {
                id: "b",
                status: "cancelled",
              },
            ],
            nextSyncToken: "sync-2",
          }),
    );
    const calendar = createGoogleCalendarClient({
      fetch,
      getAccessToken: async () => "access",
    });

    const result = await calendar.events.list("primary", {
      syncToken: "sync-1",
    });

    expect(result.items.map((event) => event.id)).toEqual([
      "a",
      "b",
    ]);
    expect(result.nextSyncToken).toBe("sync-2");
    for (const [url] of fetch.mock.calls) {
      expect(new URL(url).searchParams.get("syncToken")).toBe("sync-1");
    }
  });

  it("reports an expired sync token (410 Gone) as sync_token_expired", async () => {
    const calendar = createGoogleCalendarClient({
      fetch: async () =>
        json(
          {
            error: {
              code: 410,
              errors: [
                {
                  reason: "fullSyncRequired",
                },
              ],
              message:
                "Sync token is no longer valid, a full sync is required.",
            },
          },
          410,
        ),
      getAccessToken: async () => "access",
    });

    const error = await rejection(
      calendar.events.list("primary", {
        syncToken: "stale",
      }),
    );

    expect(isMeshlyError(error, "sync_token_expired")).toBe(true);
  });
});

describe("authorization", () => {
  it("retries a 401 once with a forced refresh", async () => {
    const getAccessToken = vi.fn(
      async (options?: { forceRefresh?: boolean }) =>
        options?.forceRefresh === true ? "access-new" : "access-old",
    );
    const fetch = vi.fn(async (_url: string, init: RequestInit) =>
      new Headers(init.headers).get("Authorization") === "Bearer access-old"
        ? json(
            {
              error: {
                code: 401,
                message: "Invalid Credentials",
              },
            },
            401,
          )
        : json({
            id: "event-1",
          }),
    );
    const calendar = createGoogleCalendarClient({
      fetch,
      getAccessToken,
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event?.id).toBe("event-1");
    expect(getAccessToken).toHaveBeenLastCalledWith({
      forceRefresh: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
