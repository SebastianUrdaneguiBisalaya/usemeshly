import { describe, expect, it } from "vitest";
import {
  apiKeyHeader,
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
