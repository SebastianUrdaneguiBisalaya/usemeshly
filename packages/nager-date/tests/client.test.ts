import { isMeshlyError } from "@usemeshly/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  NagerDateCommunityOptions,
  NagerDateProOptions,
} from "../src/index";
import { createNagerDateClient, NAGER_DATE_BASE_URL } from "../src/index";
import {
  API_KEY,
  calledHeaders,
  calledUrl,
  community,
  json,
  mockFetch,
  pro,
} from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const browserLike = () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {});
};

describe("createNagerDateClient", () => {
  it("returns a plan-specific client", () => {
    const fetch = mockFetch(() => json([]));
    const free = community(fetch);
    const paid = pro(fetch);

    expect(free.plan).toBe("community");
    expect("longWeekends" in free).toBe(false);
    expect(paid.plan).toBe("pro");
    expect(typeof paid.longWeekends.list).toBe("function");
  });

  it("types Pro-only features and the API key by plan", () => {
    const fetch = mockFetch(() => json([]));
    const free = community(fetch);
    // @ts-expect-error longWeekends only exists on the Pro client
    expect(free.longWeekends).toBeUndefined();

    const withKey = {
      apiKey: API_KEY,
      plan: "community",
    } as const;
    // @ts-expect-error the Community plan takes no apiKey
    const communityWithKey: NagerDateCommunityOptions = withKey;
    // @ts-expect-error the Pro plan requires an apiKey
    const proWithoutKey: NagerDateProOptions = {
      plan: "pro",
    };
    expect(communityWithKey).toBeDefined();
    expect(proWithoutKey).toBeDefined();
  });

  it("calls the Community API without credentials", async () => {
    const fetch = mockFetch(() =>
      json({
        name: "Nager.Date",
        version: "2.45.7",
      }),
    );

    await community(fetch).versions();

    expect(calledUrl(fetch).toString()).toBe(
      `${NAGER_DATE_BASE_URL}/api/v4/Versions`,
    );
    const headers = calledHeaders(fetch);
    expect(headers.has("x-api-key")).toBe(false);
    expect(headers.get("accept")).toBe("application/json");
    expect(fetch.mock.calls[0]?.[1].redirect).toBe("manual");
  });

  it("sends the key in x-api-key on Pro only", async () => {
    const fetch = mockFetch(() => json([]));

    await pro(fetch).versions();

    expect(calledUrl(fetch).toString()).toBe(
      `${NAGER_DATE_BASE_URL}/api/pro/v1/Versions`,
    );
    expect(calledHeaders(fetch).get("x-api-key")).toBe(API_KEY);
    expect(fetch.mock.calls[0]?.[1].redirect).toBe("manual");
  });

  it("does not expose the key on the client", () => {
    const client = pro(mockFetch(() => json([])));

    expect(JSON.stringify(client)).not.toContain(API_KEY);
  });

  it("rejects an apiKey on the Community plan", () => {
    const error = (() => {
      try {
        createNagerDateClient({
          apiKey: API_KEY,
          plan: "community",
        } as unknown as NagerDateCommunityOptions);
      } catch (caught) {
        return caught;
      }
      return undefined;
    })();

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(String((error as Error).message)).not.toContain(API_KEY);
  });

  it.each([
    "",
    "has space",
    "line\nbreak",
  ])("rejects an invalid Pro key (%j) without echoing it", (apiKey) => {
    expect(() =>
      createNagerDateClient({
        apiKey,
        plan: "pro",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_argument",
      }),
    );
  });

  it("rejects an unknown plan and a bad timeout", () => {
    expect(() =>
      createNagerDateClient({
        plan: "enterprise",
      } as unknown as NagerDateCommunityOptions),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_argument",
      }),
    );
    expect(() =>
      createNagerDateClient({
        plan: "community",
        timeoutMs: 0,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "invalid_argument",
      }),
    );
  });

  it("refuses the Pro plan in a browser-like runtime", () => {
    browserLike();

    expect(() =>
      createNagerDateClient({
        apiKey: API_KEY,
        plan: "pro",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unsupported_environment",
      }),
    );
  });

  it("allows the Community plan in a browser-like runtime (it holds no secret)", () => {
    browserLike();

    expect(
      createNagerDateClient({
        plan: "community",
      }).plan,
    ).toBe("community");
  });
});
