import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiKeyHeader,
  apiKeyQueryParam,
  basicAuthHeader,
  bearerAuthHeader,
} from "../../src/basic/index";
import { isMeshlyError } from "../../src/index";

const thrown = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("expected a throw");
};

describe("header builders", () => {
  it("encodes Basic credentials as UTF-8", () => {
    expect(
      basicAuthHeader({
        password: "pässword",
        username: "user",
      }).Authorization,
    ).toBe("Basic dXNlcjpww6Rzc3dvcmQ=");
  });

  it("rejects header injection without echoing the credential", () => {
    const secret = "sk_live_secret\r\nX-Injected: 1";
    for (const run of [
      () => bearerAuthHeader(secret),
      () => apiKeyHeader(secret),
      () =>
        basicAuthHeader({
          password: secret,
          username: "user",
        }),
    ]) {
      const error = thrown(run);
      expect(isMeshlyError(error, "invalid_argument")).toBe(true);
      expect(String(error)).not.toContain("sk_live_secret");
    }
  });
});

describe("apiKeyQueryParam", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets the key with URLSearchParams and leaves the input unchanged", () => {
    const input = new URL(
      "https://api.example.com/v1/data?latitude=52.52&apikey=old",
    );

    const url = apiKeyQueryParam(input, {
      name: "apikey",
      value: "k&y=1#frag",
    });

    expect(url.searchParams.get("apikey")).toBe("k&y=1#frag");
    expect(url.searchParams.getAll("apikey")).toHaveLength(1);
    expect(url.searchParams.get("latitude")).toBe("52.52");
    expect(url.hash).toBe("");
    expect(input.searchParams.get("apikey")).toBe("old");
  });

  it("accepts a string URL", () => {
    expect(
      apiKeyQueryParam("https://api.example.com/v1/data", {
        name: "key",
        value: "secret",
      }).toString(),
    ).toBe("https://api.example.com/v1/data?key=secret");
  });

  it.each([
    "",
    "with space",
    "line\nbreak",
  ])("rejects the key %j without echoing it", (value) => {
    const error = thrown(() =>
      apiKeyQueryParam("https://api.example.com", {
        name: "apikey",
        value,
      }),
    );

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    if (value !== "") expect(String(error)).not.toContain(value);
  });

  it("rejects an invalid name or URL without echoing the URL", () => {
    expect(
      isMeshlyError(
        thrown(() =>
          apiKeyQueryParam("https://api.example.com", {
            name: "a b",
            value: "secret",
          }),
        ),
        "invalid_argument",
      ),
    ).toBe(true);
    const error = thrown(() =>
      apiKeyQueryParam("relative?apikey=leaked", {
        name: "apikey",
        value: "secret",
      }),
    );
    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(String(error)).not.toContain("leaked");
  });

  it("refuses a browser-like runtime", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {});

    expect(
      isMeshlyError(
        thrown(() =>
          apiKeyQueryParam("https://api.example.com", {
            name: "apikey",
            value: "secret",
          }),
        ),
        "unsupported_environment",
      ),
    ).toBe(true);
  });
});
