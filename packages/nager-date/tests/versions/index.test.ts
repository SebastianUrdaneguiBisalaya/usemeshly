import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import { community, json, mockFetch, pro, rejection } from "../helpers";

const version = {
  name: "Nager.Date",
  version: "2.45.7",
};

describe("versions", () => {
  it("returns one object on Community", async () => {
    const fetch = mockFetch(() => json(version));

    await expect(community(fetch).versions()).resolves.toEqual(version);
  });

  it("returns an array on Pro", async () => {
    const fetch = mockFetch(() =>
      json([
        version,
        {
          name: "Nager.LongWeekend",
          version: "1.0.0",
        },
      ]),
    );

    await expect(pro(fetch).versions()).resolves.toHaveLength(2);
  });

  it("rejects an array on Community", async () => {
    const fetch = mockFetch(() =>
      json([
        version,
      ]),
    );

    const error = await rejection(community(fetch).versions());

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });
});
