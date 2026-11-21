import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import { calledUrl, empty, json, mockFetch, pro, rejection } from "../helpers";

const weekend = {
  bridgeDays: [
    "2026-05-15",
  ],
  dayCount: 4,
  endDate: "2026-05-17",
  needBridgeDay: true,
  startDate: "2026-05-14",
};

describe("longWeekends.list", () => {
  it("returns the long weekends", async () => {
    const fetch = mockFetch(() =>
      json([
        weekend,
      ]),
    );

    const weekends = await pro(fetch).longWeekends.list("DE", 2026);

    expect(weekends).toEqual([
      weekend,
    ]);
    const url = calledUrl(fetch);
    expect(url.pathname).toBe("/api/pro/v1/LongWeekends/DE/2026");
    expect(url.searchParams.has("availableBridgeDays")).toBe(false);
  });

  it("sends availableBridgeDays", async () => {
    const fetch = mockFetch(() => json([]));

    await pro(fetch).longWeekends.list("AT-1", 2026, {
      availableBridgeDays: 3,
    });

    expect(calledUrl(fetch).searchParams.get("availableBridgeDays")).toBe("3");
  });

  it("returns [] on 204", async () => {
    const fetch = mockFetch(() => empty(204));

    await expect(pro(fetch).longWeekends.list("DE", 2026)).resolves.toEqual([]);
  });

  it.each([
    0,
    101,
    2.5,
  ])(
    "rejects availableBridgeDays %s before any request",
    async (availableBridgeDays) => {
      const fetch = mockFetch(() => json([]));

      const error = await rejection(
        pro(fetch).longWeekends.list("DE", 2026, {
          availableBridgeDays,
        }),
      );

      expect(isMeshlyError(error, "invalid_argument")).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    1,
    100,
  ])("accepts availableBridgeDays %s", async (availableBridgeDays) => {
    const fetch = mockFetch(() => json([]));

    await expect(
      pro(fetch).longWeekends.list("DE", 2026, {
        availableBridgeDays,
      }),
    ).resolves.toEqual([]);
  });
});
