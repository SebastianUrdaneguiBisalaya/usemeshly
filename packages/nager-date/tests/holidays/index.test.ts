import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import {
  calledUrl,
  community,
  communityHoliday,
  empty,
  json,
  mockFetch,
  pro,
  proHoliday,
  rejection,
} from "../helpers";

describe("holidays.list", () => {
  it("returns Community holidays", async () => {
    const fetch = mockFetch(() =>
      json([
        communityHoliday,
      ]),
    );

    const holidays = await community(fetch).holidays.list("US", 2026);

    expect(holidays).toEqual([
      communityHoliday,
    ]);
    expect(calledUrl(fetch).pathname).toBe("/api/v4/Holidays/US/2026");
  });

  it("returns Pro holidays", async () => {
    const fetch = mockFetch(() =>
      json([
        proHoliday,
      ]),
    );

    const holidays = await pro(fetch).holidays.list("US", 2026);

    expect(holidays).toEqual([
      proHoliday,
    ]);
    expect(calledUrl(fetch).pathname).toBe("/api/pro/v1/Holidays/US/2026");
  });

  it.each([
    [
      "community",
      community,
    ],
    [
      "pro",
      pro,
    ],
  ] as const)("returns [] on 204 (%s)", async (_plan, create) => {
    const fetch = mockFetch(() => empty(204));

    await expect(create(fetch).holidays.list("US", 2026)).resolves.toEqual([]);
  });

  it("rejects an unknown holiday type", async () => {
    const fetch = mockFetch(() =>
      json([
        {
          ...communityHoliday,
          holidayTypes: [
            "Religious",
          ],
        },
      ]),
    );

    const error = await rejection(community(fetch).holidays.list("US", 2026));

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });

  it.each([
    2026.5,
    0,
    Number.NaN,
  ])("rejects year %s before any request", async (year) => {
    const fetch = mockFetch(() => json([]));

    const error = await rejection(community(fetch).holidays.list("US", year));

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("holidays.next", () => {
  it.each([
    [
      "community",
      community,
      communityHoliday,
      "/api/v4/Holidays/DE/Next",
    ],
    [
      "pro",
      pro,
      proHoliday,
      "/api/pro/v1/Holidays/DE/Next",
    ],
  ] as const)(
    "returns the upcoming holidays (%s)",
    async (_plan, create, holiday, path) => {
      const fetch = mockFetch(() =>
        json([
          holiday,
        ]),
      );

      await expect(create(fetch).holidays.next("DE")).resolves.toEqual([
        holiday,
      ]);
      expect(calledUrl(fetch).pathname).toBe(path);
    },
  );

  it("returns [] on 204", async () => {
    const fetch = mockFetch(() => empty(204));

    await expect(community(fetch).holidays.next("DE")).resolves.toEqual([]);
  });
});

describe("holidays.isToday", () => {
  it.each([
    [
      200,
      true,
    ],
    [
      204,
      false,
    ],
  ] as const)("maps %i to %s", async (status, expected) => {
    const fetch = mockFetch(() => empty(status));

    await expect(community(fetch).holidays.isToday("AT-1")).resolves.toBe(
      expected,
    );
    expect(calledUrl(fetch).pathname).toBe(
      "/api/v4/IotHolidays/AT-1/IsToday/0",
    );
  });

  it("sends the offset on Pro", async () => {
    const fetch = mockFetch(() => empty(204));

    await expect(
      pro(fetch).holidays.isToday("US", {
        offset: -8,
      }),
    ).resolves.toBe(false);
    expect(calledUrl(fetch).pathname).toBe(
      "/api/pro/v1/IotHolidays/US/IsToday/-8",
    );
  });

  it("rejects another 2xx", async () => {
    const fetch = mockFetch(() => empty(202));

    const error = await rejection(community(fetch).holidays.isToday("US"));

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });

  it.each([
    -13,
    13,
    1.5,
  ])("rejects offset %s before any request", async (offset) => {
    const fetch = mockFetch(() => empty(200));

    const error = await rejection(
      community(fetch).holidays.isToday("US", {
        offset,
      }),
    );

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    -12,
    12,
  ])("accepts offset %s", async (offset) => {
    const fetch = mockFetch(() => empty(200));

    await expect(
      community(fetch).holidays.isToday("US", {
        offset,
      }),
    ).resolves.toBe(true);
  });

  it.each([
    "A",
    "AT-",
    "AT-1234",
    "AT/1",
  ])("rejects isoCode %j", async (isoCode) => {
    const fetch = mockFetch(() => empty(200));

    const error = await rejection(community(fetch).holidays.isToday(isoCode));

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
