import { describe, expect, it, vi } from "vitest";
import type { OAuthTokens } from "../../src/oauth/index";
import { createTokenManager, defineOAuthProvider } from "../../src/oauth/index";

const endpoints = {
  authorization: "https://auth.acme.test/authorize",
  token: "https://auth.acme.test/token",
};
const client = {
  clientId: "client-1",
  clientSecret: "client-secret-value",
};

const expired: OAuthTokens = {
  accessToken: "access-old",
  expiresAt: Date.now() - 1000,
  idToken: null,
  idTokenClaims: null,
  refreshToken: "refresh-old",
  scopes: [
    "calendar",
  ],
  tokenType: "bearer",
};

const tokenResponse = (body: Record<string, unknown>) =>
  new Response(
    JSON.stringify({
      access_token: "access-new",
      expires_in: 3600,
      token_type: "Bearer",
      ...body,
    }),
    {
      headers: {
        "content-type": "application/json",
      },
    },
  );

describe("createTokenManager", () => {
  it("shares one refresh between concurrent calls", async () => {
    const fetch = vi.fn(async () => tokenResponse({}));
    const save = vi.fn(async () => {});
    const tokens = createTokenManager({
      client,
      fetch,
      load: async () => expired,
      provider: defineOAuthProvider({
        clientAuth: "client_secret_post",
        endpoints,
        id: "acme",
        issuer: "https://auth.acme.test",
      }),
      save,
    });

    const results = await Promise.all(
      Array.from(
        {
          length: 5,
        },
        () => tokens.getAccessToken(),
      ),
    );

    expect(results).toEqual(Array(5).fill("access-new"));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    // Kept from the stored grant when the provider neither rotates nor lists scopes.
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: "refresh-old",
        scopes: [
          "calendar",
        ],
      }),
    );
  });

  it("saves a rotated refresh token before handing out the access token", async () => {
    const events: string[] = [];
    const save = vi.fn(async (next: OAuthTokens) => {
      events.push(`save:${next.refreshToken}`);
    });
    const tokens = createTokenManager({
      client,
      fetch: async () =>
        tokenResponse({
          refresh_token: "refresh-rotated",
        }),
      load: async () => expired,
      provider: defineOAuthProvider({
        clientAuth: "client_secret_basic",
        endpoints,
        id: "acme",
        issuer: "https://auth.acme.test",
        rotatesRefreshToken: true,
      }),
      save,
    });

    const accessToken = await tokens.getAccessToken();
    events.push(`token:${accessToken}`);

    expect(events).toEqual([
      "save:refresh-rotated",
      "token:access-new",
    ]);
  });
});
