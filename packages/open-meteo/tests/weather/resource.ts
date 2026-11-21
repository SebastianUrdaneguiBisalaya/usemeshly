import { describe, expect, it } from "vitest";
import type { OpenMeteoClient } from "../../src/index";
import {
  API_KEY,
  calledUrl,
  commercial,
  free,
  json,
  type MockFetch,
  mockFetch,
  weather,
} from "../helpers";

type Case = {
  /** The client method, called with `params`. */
  call: (client: OpenMeteoClient, params: never) => Promise<unknown>;
  params: Record<string, unknown>;
  /** `section → variable → value` in the mocked response. */
  sections: Record<string, Record<string, unknown>>;
  free: string;
  commercial: string;
  path: string;
};

/** Happy path on both plans: the right host and path, the key only on commercial, the body parsed. */
export const describeWeatherResource = (name: string, test: Case): void => {
  describe(name, () => {
    const run = async (create: (fetch: MockFetch) => OpenMeteoClient) => {
      const fetch = mockFetch(() => json(weather(test.sections)));
      const result = await test.call(create(fetch), test.params as never);
      return {
        result,
        url: calledUrl(fetch),
      };
    };

    it("calls the free host without a key and parses the response", async () => {
      const { result, url } = await run(free);

      expect(url.origin).toBe(test.free);
      expect(url.pathname).toBe(test.path);
      expect(url.searchParams.has("apikey")).toBe(false);
      for (const [section, values] of Object.entries(test.sections)) {
        expect(result).toHaveProperty(section, values);
        // Member keys come back next to what was requested; they are never requested themselves.
        expect(url.searchParams.get(section)?.split(",").sort()).toEqual(
          Object.keys(values)
            .filter((key) => key !== "time" && !key.includes("_member"))
            .sort(),
        );
      }
    });

    it("calls the customer- host with the key", async () => {
      const { url } = await run(commercial);

      expect(url.origin).toBe(test.commercial);
      expect(url.pathname).toBe(test.path);
      expect(url.searchParams.get("apikey")).toBe(API_KEY);
    });
  });
};
