import { isMeshlyError, MeshlyError } from "@usemeshly/auth";
import { describe, expect, it, vi } from "vitest";
import { createNagerDateClient } from "../src/index";
import {
  API_KEY,
  community,
  empty,
  json,
  mockFetch,
  pro,
  rejection,
} from "./helpers";

describe("error mapping", () => {
  it.each([
    [
      400,
      "bad_request",
    ],
    [
      401,
      "unauthorized",
    ],
    [
      403,
      "unauthorized",
    ],
    [
      404,
      "not_found",
    ],
    [
      429,
      "rate_limited",
    ],
    [
      500,
      "server_error",
    ],
    [
      503,
      "server_error",
    ],
    [
      418,
      "api_error",
    ],
  ] as const)("maps %i to %s", async (status, code) => {
    const fetch = mockFetch(() => empty(status));

    const error = await rejection(pro(fetch).countries.get("US"));

    expect(isMeshlyError(error, code)).toBe(true);
    expect(error).toMatchObject({
      provider: "nager-date",
      status,
    });
  });

  it("includes the validation details of a 400", async () => {
    const fetch = mockFetch(() =>
      json(
        {
          errors: {
            year: [
              "The specified year '1800' is not supported.",
            ],
          },
          status: 400,
          title: "One or more validation errors occurred.",
        },
        400,
      ),
    );

    const error = await rejection(community(fetch).holidays.list("US", 1800));

    expect(isMeshlyError(error, "bad_request")).toBe(true);
    expect((error as Error).message).toBe(
      "GET /api/v4/Holidays/US/1800 failed with 400: One or more validation errors occurred. (year: The specified year '1800' is not supported.)",
    );
  });

  it("includes the title of a 404 problem", async () => {
    const fetch = mockFetch(() =>
      json(
        {
          status: 404,
          title: "Not Found",
          type: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
        },
        404,
      ),
    );

    const error = await rejection(community(fetch).countries.get("XX"));

    expect(isMeshlyError(error, "not_found")).toBe(true);
    expect((error as Error).message).toContain("Not Found");
  });

  it("never leaks the API key into errors", async () => {
    const fetch = mockFetch(() =>
      json(
        {
          detail: `The key ${API_KEY} is not valid`,
          title: `Unauthorized ${API_KEY}`,
        },
        401,
      ),
    );

    const error = await rejection(pro(fetch).holidays.next("US"));

    expect(isMeshlyError(error, "unauthorized")).toBe(true);
    expect(error).toBeInstanceOf(MeshlyError);
    const meshly = error as MeshlyError;
    expect(meshly.message).not.toContain(API_KEY);
    expect(JSON.stringify(meshly)).not.toContain(API_KEY);
    expect(meshly.cause).toBeUndefined();
    expect(meshly.stack ?? "").not.toContain(API_KEY);
  });

  it("does not follow a redirect", async () => {
    const fetch = mockFetch(
      () =>
        new Response(null, {
          headers: {
            location: "https://elsewhere.example/api",
          },
          status: 301,
        }),
    );

    const error = await rejection(pro(fetch).versions());

    expect(isMeshlyError(error, "api_error")).toBe(true);
    expect(error).toMatchObject({
      status: 301,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports a body that fails validation", async () => {
    const fetch = mockFetch(() =>
      json([
        {
          date: "2026-12-25",
          name: "Christmas Day",
        },
      ]),
    );

    const error = await rejection(community(fetch).holidays.list("US", 2026));

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });

  it("reports a body that is not JSON", async () => {
    const fetch = mockFetch(() => new Response("<html>"));

    const error = await rejection(community(fetch).versions());

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });
});

describe("transport", () => {
  it("maps a network failure", async () => {
    const fetch = mockFetch(() => {
      throw new TypeError("fetch failed");
    });

    const error = await rejection(community(fetch).versions());

    expect(isMeshlyError(error, "network_error")).toBe(true);
  });

  it("maps the caller's abort", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      init.signal?.throwIfAborted();
      return json([]);
    });

    const error = await rejection(
      createNagerDateClient({
        fetch,
        plan: "community",
      }).countries.available({
        signal: controller.signal,
      }),
    );

    expect(isMeshlyError(error, "aborted")).toBe(true);
  });

  it("maps the deadline", async () => {
    const fetch = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );

    const error = await rejection(
      createNagerDateClient({
        fetch,
        plan: "community",
        timeoutMs: 5,
      }).versions(),
    );

    expect(isMeshlyError(error, "timeout")).toBe(true);
  });
});
