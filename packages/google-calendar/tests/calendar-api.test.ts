import { isMeshlyError } from "@usemeshly/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGoogleCalendarClient } from "../src/index";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

const gone = () =>
  json(
    {
      error: {
        code: 410,
        errors: [
          {
            reason: "fullSyncRequired",
          },
        ],
        message: "Sync token is no longer valid, a full sync is required.",
      },
    },
    410,
  );

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

  it("reports a sync token that expires on a later page as sync_token_expired", async () => {
    const calendar = createGoogleCalendarClient({
      fetch: async (url: string) =>
        new URL(url).searchParams.get("pageToken") === null
          ? json({
              items: [],
              nextPageToken: "page-2",
            })
          : gone(),
      getAccessToken: async () => "access",
    });

    const error = await rejection(
      calendar.events.list("primary", {
        syncToken: "stale",
      }),
    );

    expect(isMeshlyError(error, "sync_token_expired")).toBe(true);
  });

  it("doesn't report sync_token_expired for a 410 without a sync token", async () => {
    const calendar = createGoogleCalendarClient({
      fetch: async () => gone(),
      getAccessToken: async () => "access",
    });

    const error = await rejection(calendar.events.list("primary"));

    expect(isMeshlyError(error)).toBe(true);
    expect(isMeshlyError(error, "sync_token_expired")).toBe(false);
  });
});

describe("authorization", () => {
  it("retries a 401 once with a forced refresh", async () => {
    const getAccessToken = vi.fn(
      async (options?: { forceRefresh?: boolean; rejectedToken?: string }) =>
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
      rejectedToken: "access-old",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe("errors", () => {
  it("never include the access token Google echoes back", async () => {
    const accessToken = "ya29.access-token-that-must-not-leak";
    const calendar = createGoogleCalendarClient({
      fetch: async () =>
        json(
          {
            error: {
              code: 400,
              message: `Bad request for token ${accessToken}`,
            },
          },
          400,
        ),
      getAccessToken: async () => accessToken,
    });

    const error = await rejection(calendar.events.get("primary", "event-1"));

    expect(isMeshlyError(error, "api_error")).toBe(true);
    for (const output of [
      String(error),
      JSON.stringify(error),
      (error as Error).stack ?? "",
    ]) {
      expect(output).not.toContain(accessToken);
    }
  });
});

describe("environment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses to create a client in a browser-like runtime", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});

    let error: unknown;
    try {
      createGoogleCalendarClient({
        getAccessToken: async () => "access",
      });
    } catch (caught) {
      error = caught;
    }

    expect(isMeshlyError(error, "unsupported_environment")).toBe(true);
  });
});

describe("conferences", () => {
  const meet = {
    conferenceId: "abc-defg-hij",
    conferenceSolution: {
      iconUri:
        "https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png",
      key: {
        type: "hangoutsMeet",
      },
      name: "Google Meet",
    },
    createRequest: {
      conferenceSolutionKey: {
        type: "hangoutsMeet",
      },
      requestId: "request-1",
      status: {
        statusCode: "success",
      },
    },
    entryPoints: [
      {
        entryPointType: "video",
        label: "meet.google.com/abc-defg-hij",
        meetingCode: "abc-defg-hij",
        uri: "https://meet.google.com/abc-defg-hij",
      },
      {
        entryPointType: "phone",
        label: "+1 555-0100",
        pin: "123456789",
        regionCode: "US",
        uri: "tel:+1-555-0100",
      },
    ],
    notes: "Bring the slides",
  };

  const capture = (response: unknown) => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      json(response),
    );
    const calendar = createGoogleCalendarClient({
      fetch,
      getAccessToken: async () => "access",
    });
    const sent = () => {
      const [url, init] = fetch.mock.calls[0] ?? [];
      return {
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        query: new URL(String(url)).searchParams,
      };
    };
    return {
      calendar,
      sent,
    };
  };

  it("parses an event with full conference data", async () => {
    const { calendar } = capture({
      conferenceData: meet,
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      id: "event-1",
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event?.conferenceData).toEqual(meet);
    expect(event?.hangoutLink).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("parses an event whose Meet is still pending", async () => {
    const { calendar } = capture({
      conferenceData: {
        createRequest: {
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
          requestId: "request-1",
          status: {
            statusCode: "pending",
          },
        },
      },
      id: "event-1",
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event?.conferenceData?.createRequest?.status?.statusCode).toBe(
      "pending",
    );
    expect(event?.conferenceData?.entryPoints).toBeUndefined();
  });

  it("parses an event without a conference", async () => {
    const { calendar } = capture({
      id: "event-1",
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event).not.toBeNull();
    expect(event?.conferenceData).toBeUndefined();
  });

  it("insert with a create request sends conferenceDataVersion=1 and the conference data", async () => {
    const { calendar, sent } = capture({
      conferenceData: meet,
      id: "event-1",
    });
    const conferenceData = {
      createRequest: {
        conferenceSolutionKey: {
          type: "hangoutsMeet" as const,
        },
        requestId: "request-1",
      },
    };

    await calendar.events.insert("primary", {
      conferenceData,
      summary: "Design review",
    });

    expect(sent().query.get("conferenceDataVersion")).toBe("1");
    expect(sent().body).toHaveProperty("conferenceData", conferenceData);
  });

  it("patch with conferenceData: null sends conferenceDataVersion=1 and null", async () => {
    const { calendar, sent } = capture({
      id: "event-1",
    });

    await calendar.events.patch("primary", "event-1", {
      conferenceData: null,
    });

    expect(sent().query.get("conferenceDataVersion")).toBe("1");
    expect(sent().body).toHaveProperty("conferenceData", null);
  });

  it("patch without conferenceData sends neither the param nor the field", async () => {
    const { calendar, sent } = capture({
      id: "event-1",
    });

    await calendar.events.patch("primary", "event-1", {
      location: "Room 4",
    });

    expect(sent().query.has("conferenceDataVersion")).toBe(false);
    expect(sent().body).not.toHaveProperty("conferenceData");
  });

  it("an explicit conferenceDataVersion overrides the default", async () => {
    const { calendar, sent } = capture({
      id: "event-1",
    });

    await calendar.events.patch(
      "primary",
      "event-1",
      {
        conferenceData: null,
      },
      {
        conferenceDataVersion: 0,
      },
    );

    expect(sent().query.get("conferenceDataVersion")).toBe("0");
  });
});

describe("guests", () => {
  const capture = (response: unknown) => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      json(response),
    );
    const calendar = createGoogleCalendarClient({
      fetch,
      getAccessToken: async () => "access",
    });
    const sentBody = () =>
      JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as Record<
        string,
        unknown
      >;
    return {
      calendar,
      sentBody,
    };
  };

  it("keeps resource on rooms among the attendees", async () => {
    const { calendar } = capture({
      attendees: [
        {
          displayName: "Room 4",
          email: "c_room4@resource.calendar.google.com",
          resource: true,
          responseStatus: "accepted",
        },
        {
          email: "ana@example.com",
          responseStatus: "needsAction",
        },
      ],
      id: "event-1",
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event?.attendees?.map((attendee) => attendee.resource)).toEqual([
      true,
      undefined,
    ]);
  });

  it("parses the guestsCan* flags", async () => {
    const { calendar } = capture({
      guestsCanInviteOthers: false,
      guestsCanModify: true,
      guestsCanSeeOtherGuests: false,
      id: "event-1",
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event).toMatchObject({
      guestsCanInviteOthers: false,
      guestsCanModify: true,
      guestsCanSeeOtherGuests: false,
    });
  });

  it("leaves missing guestsCan* flags undefined", async () => {
    const { calendar } = capture({
      id: "event-1",
    });

    const event = await calendar.events.get("primary", "event-1");

    expect(event?.guestsCanInviteOthers).toBeUndefined();
    expect(event?.guestsCanModify).toBeUndefined();
    expect(event?.guestsCanSeeOtherGuests).toBeUndefined();
  });

  it("insert sends the guestsCan* flags that are passed", async () => {
    const { calendar, sentBody } = capture({
      id: "event-1",
    });

    await calendar.events.insert("primary", {
      guestsCanInviteOthers: false,
      guestsCanModify: true,
      guestsCanSeeOtherGuests: false,
      summary: "Design review",
    });

    expect(sentBody()).toMatchObject({
      guestsCanInviteOthers: false,
      guestsCanModify: true,
      guestsCanSeeOtherGuests: false,
    });
  });

  it("patch sends only the guestsCan* flags that are passed", async () => {
    const { calendar, sentBody } = capture({
      id: "event-1",
    });

    await calendar.events.patch("primary", "event-1", {
      guestsCanModify: false,
    });

    expect(sentBody()).toEqual({
      guestsCanModify: false,
    });
  });
});
