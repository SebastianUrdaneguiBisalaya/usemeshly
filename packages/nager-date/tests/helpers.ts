import { vi } from "vitest";
import { createNagerDateClient } from "../src/index";

export const API_KEY = "pro-key-1234567890";

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

export const empty = (status: number): Response =>
  new Response(null, {
    status,
  });

/** A `fetch` mock answering every request with `respond()`. */
export const mockFetch = (respond: () => Response | Promise<Response>) =>
  vi.fn(async (_url: string, _init: RequestInit) => respond());

export const community = (fetch: ReturnType<typeof mockFetch>) =>
  createNagerDateClient({
    fetch,
    plan: "community",
  });

export const pro = (fetch: ReturnType<typeof mockFetch>) =>
  createNagerDateClient({
    apiKey: API_KEY,
    fetch,
    plan: "pro",
  });

/** The URL of the `index`th call. */
export const calledUrl = (
  fetch: ReturnType<typeof mockFetch>,
  index = 0,
): URL => new URL(fetch.mock.calls[index]?.[0] ?? "");

export const calledHeaders = (
  fetch: ReturnType<typeof mockFetch>,
  index = 0,
): Headers => new Headers(fetch.mock.calls[index]?.[1].headers);

export const rejection = async (
  promise: Promise<unknown>,
): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
};

export const communityHoliday = {
  countryCode: "US",
  date: "2026-12-25",
  holidayTypes: [
    "Public",
    "Bank",
  ],
  name: "Christmas Day",
  nationalHoliday: true,
  subdivisionCodes: null,
};

export const proHoliday = {
  countryCode: "US",
  date: "2026-12-25",
  englishName: "Christmas Day",
  holidayTypes: [
    "Public",
  ],
  id: "us-christmas",
  localName: "Christmas Day",
  nationalHoliday: true,
  observedDate: "2026-12-25",
  subdivisionCodes: null,
};
