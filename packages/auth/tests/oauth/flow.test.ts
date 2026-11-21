import { describe, expect, it, vi } from "vitest";
import { isMeshlyError } from "../../src/index";
import {
  createAuthorizationRequest,
  defineOAuthProvider,
  exchangeCode,
  refresh,
} from "../../src/oauth/index";

const provider = defineOAuthProvider({
  clientAuth: "client_secret_post",
  endpoints: {
    authorization: "https://auth.acme.test/authorize",
    token: "https://auth.acme.test/token",
  },
  id: "acme",
  issuer: "https://auth.acme.test",
});
const client = {
  clientId: "client-1",
  clientSecret: "client-secret-value",
};
const redirectUri = "http://127.0.0.1:53682/callback";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });

const base64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
};

describe("createAuthorizationRequest", () => {
  it("uses PKCE S256 and a fresh state", async () => {
    const request = await createAuthorizationRequest(provider, client, {
      redirectUri,
      scopes: [
        "calendar",
      ],
    });
    const params = new URL(request.url).searchParams;
    const challenge = base64Url(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(request.codeVerifier),
      ),
    );

    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBe(challenge);
    expect(params.get("state")).toBe(request.state);
    expect(request.state.length).toBeGreaterThanOrEqual(32);
    expect(params.get("redirect_uri")).toBe(redirectUri);
    expect(request.nonce).toBeNull();
  });

  it.each([
    "state",
    "code_challenge",
    "code_challenge_method",
  ])("refuses to let extraParams override %s", async (key) => {
    const error = await rejection(
      createAuthorizationRequest(provider, client, {
        extraParams: {
          [key]: "attacker-value",
        },
        redirectUri,
        scopes: [
          "calendar",
        ],
      }),
    );

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
  });
});

describe("exchangeCode", () => {
  it("rejects a mismatched state before contacting the provider", async () => {
    const fetch = vi.fn();
    const error = await rejection(
      exchangeCode(provider, client, {
        callbackUrl: `${redirectUri}?code=auth-code&state=attacker-state`,
        codeVerifier: "verifier",
        expectedState: "expected-state",
        fetch,
        redirectUri,
      }),
    );

    expect(isMeshlyError(error, "invalid_state")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      callback: `${redirectUri}?code=auth-code`,
      case: "the callback has no state",
      expectedState: "expected-state",
    },
    {
      callback: `${redirectUri}?code=auth-code&state=`,
      case: "the stored state is empty",
      expectedState: "",
    },
  ])("rejects when $case", async ({ callback, expectedState }) => {
    const fetch = vi.fn();
    const error = await rejection(
      exchangeCode(provider, client, {
        callbackUrl: callback,
        codeVerifier: "verifier",
        expectedState,
        fetch,
        redirectUri,
      }),
    );

    expect(isMeshlyError(error, "invalid_state")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the code, verifier and client secret out of a failed exchange", async () => {
    const code = "auth-code-that-must-not-leak";
    const codeVerifier = "verifier-that-must-not-leak";
    const error = await rejection(
      exchangeCode(provider, client, {
        callbackUrl: `${redirectUri}?code=${code}&state=expected-state`,
        codeVerifier,
        expectedState: "expected-state",
        fetch: async () =>
          json(
            {
              error: "invalid_grant",
              error_description: `Bad code ${code} for verifier ${codeVerifier} and secret ${client.clientSecret}`,
            },
            400,
          ),
        redirectUri,
      }),
    );

    expect(isMeshlyError(error, "invalid_grant")).toBe(true);
    for (const output of [
      String(error),
      JSON.stringify(error),
      (error as Error).stack ?? "",
    ]) {
      expect(output).not.toContain(code);
      expect(output).not.toContain(codeVerifier);
      expect(output).not.toContain(client.clientSecret);
    }
  });

  it("sends the code and PKCE verifier and returns the tokens", async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) =>
      json({
        access_token: "access-1",
        expires_in: 3600,
        refresh_token: "refresh-1",
        scope: "calendar email",
        token_type: "Bearer",
      }),
    );
    const tokens = await exchangeCode(provider, client, {
      callbackUrl: `${redirectUri}?code=auth-code&state=expected-state`,
      codeVerifier: "verifier",
      expectedState: "expected-state",
      fetch,
      redirectUri,
    });

    const [url, init] = fetch.mock.calls[0] ?? [];
    const body = new URLSearchParams(String(init?.body));
    expect(url).toBe("https://auth.acme.test/token");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe("verifier");
    expect(body.get("redirect_uri")).toBe(redirectUri);
    expect(tokens).toMatchObject({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      scopes: [
        "calendar",
        "email",
      ],
      tokenType: "bearer",
    });
  });
});

describe("refresh", () => {
  it("maps invalid_grant to a typed error without leaking the token", async () => {
    const refreshToken = "refresh-token-that-must-not-leak";
    const error = await rejection(
      refresh(provider, client, refreshToken, {
        fetch: async () =>
          json(
            {
              error: "invalid_grant",
              error_description: `Token ${refreshToken} has been revoked`,
            },
            400,
          ),
      }),
    );

    expect(isMeshlyError(error, "invalid_grant")).toBe(true);
    expect(JSON.stringify(error)).not.toContain(refreshToken);
    expect(String(error)).not.toContain(refreshToken);
    expect(String(error)).not.toContain(client.clientSecret);
  });
});
