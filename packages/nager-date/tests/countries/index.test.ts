import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import {
  calledUrl,
  community,
  json,
  mockFetch,
  pro,
  rejection,
} from "../helpers";

const germany = {
  borders: [
    {
      commonName: "Austria",
      countryCode: "AT",
      nativeName: "Österreich",
      officialName: "Republic of Austria",
      region: "Europe",
    },
  ],
  commonName: "Germany",
  countryCode: "DE",
  nativeName: "Deutschland",
  officialName: "Federal Republic of Germany",
  region: "Europe",
};

describe("countries.get", () => {
  it.each([
    [
      "community",
      community,
      "/api/v4/Countries/DE",
    ],
    [
      "pro",
      pro,
      "/api/pro/v1/Countries/DE",
    ],
  ] as const)(
    "returns the country with its borders (%s)",
    async (_plan, create, path) => {
      const fetch = mockFetch(() => json(germany));

      const country = await create(fetch).countries.get("DE");

      expect(country).toEqual(germany);
      expect(calledUrl(fetch).pathname).toBe(path);
    },
  );

  it("accepts null borders", async () => {
    const fetch = mockFetch(() =>
      json({
        ...germany,
        borders: null,
      }),
    );

    const country = await community(fetch).countries.get("de");

    expect(country.borders).toBeNull();
  });

  it.each([
    "",
    "D",
    "DEU",
    "../Versions",
    "D1",
  ])("rejects %j before any request", async (code) => {
    const fetch = mockFetch(() => json(germany));

    const error = await rejection(community(fetch).countries.get(code));

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("countries.available", () => {
  it("returns Community countries", async () => {
    const fetch = mockFetch(() =>
      json([
        {
          countryCode: "AD",
          name: "Andorra",
        },
      ]),
    );

    const countries = await community(fetch).countries.available();

    expect(countries).toEqual([
      {
        countryCode: "AD",
        name: "Andorra",
      },
    ]);
    expect(calledUrl(fetch).pathname).toBe("/api/v4/Countries/Available");
  });

  it("returns Pro countries with their extra fields", async () => {
    const andorra = {
      commonName: "Andorra",
      countryCode: "AD",
      nativeName: "Andorra",
      officialName: "Principality of Andorra",
      region: "Europe",
      subRegion: "Southern Europe",
    };
    const fetch = mockFetch(() =>
      json([
        andorra,
      ]),
    );

    const countries = await pro(fetch).countries.available();

    expect(countries).toEqual([
      andorra,
    ]);
    expect(calledUrl(fetch).pathname).toBe("/api/pro/v1/Countries/Available");
  });

  it("rejects a Community shape on the Pro plan", async () => {
    const fetch = mockFetch(() =>
      json([
        {
          countryCode: "AD",
          name: "Andorra",
        },
      ]),
    );

    const error = await rejection(pro(fetch).countries.available());

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
  });
});
