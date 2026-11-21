import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiKeyHeader,
  basicAuthHeader,
  bearerAuthHeader,
} from "../../src/basic/index";
import { assertServerRuntime, isMeshlyError } from "../../src/index";
import {
  createAuthorizationRequest,
  createTokenManager,
  defineOAuthProvider,
  exchangeCode,
  refresh,
  revoke,
} from "../../src/oauth/index";

const provider = defineOAuthProvider({
  clientAuth: "client_secret_post",
  endpoints: {
    authorization: "https://auth.acme.test/authorize",
    token: "https://auth.acme.test/token",
  },
  id: "acme",
  issuer: "https://auth.acme.test",
  revocationEndpoint: "https://auth.acme.test/revoke",
});
const client = {
  clientId: "client-1",
  clientSecret: "client-secret-value",
};
const redirectUri = "http://127.0.0.1:53682/callback";

const thrown = async (call: () => unknown): Promise<unknown> => {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error("expected an error");
};

const inBrowser = () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("document", {});
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assertServerRuntime", () => {
  it("passes on a server runtime", () => {
    expect(() => assertServerRuntime()).not.toThrow();
  });

  it("passes with a window but no document (e.g. Deno 1.x)", () => {
    vi.stubGlobal("window", {});
    expect(() => assertServerRuntime()).not.toThrow();
  });

  it("throws unsupported_environment in a browser-like runtime", async () => {
    inBrowser();
    const error = await thrown(assertServerRuntime);
    expect(isMeshlyError(error, "unsupported_environment")).toBe(true);
  });

  it.each([
    [
      "createAuthorizationRequest",
      () =>
        createAuthorizationRequest(provider, client, {
          redirectUri,
          scopes: [
            "calendar",
          ],
        }),
    ],
    [
      "exchangeCode",
      () =>
        exchangeCode(provider, client, {
          callbackUrl: `${redirectUri}?code=c&state=s`,
          codeVerifier: "v",
          expectedState: "s",
          redirectUri,
        }),
    ],
    [
      "refresh",
      () => refresh(provider, client, "refresh-token"),
    ],
    [
      "revoke",
      () => revoke(provider, client, "token"),
    ],
    [
      "createTokenManager",
      () =>
        createTokenManager({
          client,
          load: async () => null,
          provider,
          save: async () => {},
        }),
    ],
    [
      "basicAuthHeader",
      () =>
        basicAuthHeader({
          password: "p",
          username: "u",
        }),
    ],
    [
      "bearerAuthHeader",
      () => bearerAuthHeader("token"),
    ],
    [
      "apiKeyHeader",
      () => apiKeyHeader("key"),
    ],
  ])(
    "%s refuses to run in a browser, before any request",
    async (_name, call) => {
      inBrowser();
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);

      const error = await thrown(call);

      expect(isMeshlyError(error, "unsupported_environment")).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
