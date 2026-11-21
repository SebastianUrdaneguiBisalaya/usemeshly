import { describe, expect, it, vi } from "vitest";
import { isMeshlyError } from "../../src/index";
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

const provider = defineOAuthProvider({
  clientAuth: "client_secret_post",
  endpoints,
  id: "acme",
  issuer: "https://auth.acme.test",
});

const rejection = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected a rejection");
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

  it("releases the shared refresh after a failure so the next call retries", async () => {
    const fetch = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockImplementation(async () => tokenResponse({}));
    const tokens = createTokenManager({
      client,
      fetch,
      load: async () => expired,
      provider,
      save: async () => {},
    });

    const [first, second] = await Promise.allSettled([
      tokens.getAccessToken(),
      tokens.getAccessToken(),
    ]);
    expect(first.status).toBe("rejected");
    expect(second.status).toBe("rejected");
    expect(fetch).toHaveBeenCalledTimes(1);

    await expect(tokens.getAccessToken()).resolves.toBe("access-new");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("doesn't hand out the access token when saving fails", async () => {
    const tokens = createTokenManager({
      client,
      fetch: async () =>
        tokenResponse({
          refresh_token: "refresh-rotated",
        }),
      load: async () => expired,
      provider,
      save: async () => {
        throw new Error("disk full");
      },
    });

    await expect(tokens.getAccessToken()).rejects.toThrow("disk full");
  });

  it("rejects a rotating provider that sends no new refresh token, without saving", async () => {
    const save = vi.fn(async () => {});
    const tokens = createTokenManager({
      client,
      fetch: async () => tokenResponse({}),
      load: async () => expired,
      provider: defineOAuthProvider({
        clientAuth: "client_secret_post",
        endpoints,
        id: "acme",
        issuer: "https://auth.acme.test",
        rotatesRefreshToken: true,
      }),
      save,
    });

    const error = await rejection(tokens.getAccessToken());

    expect(isMeshlyError(error, "invalid_response")).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  describe("forceRefresh while another call is in flight", () => {
    const valid: OAuthTokens = {
      ...expired,
      expiresAt: Date.now() + 3_600_000,
    };

    /** A token store whose first `load` waits until `release` is called. */
    const heldStore = (initial: OAuthTokens) => {
      let stored = initial;
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let loads = 0;
      return {
        load: async () => {
          loads += 1;
          if (loads === 1) await held;
          return stored;
        },
        release: () => release(),
        save: vi.fn(async (next: OAuthTokens) => {
          stored = next;
        }),
      };
    };

    it("refreshes even though a plain call is still reading the store", async () => {
      const store = heldStore(valid);
      const fetch = vi.fn(async () => tokenResponse({}));
      const tokens = createTokenManager({
        client,
        fetch,
        load: store.load,
        provider,
        save: store.save,
      });

      const plain = tokens.getAccessToken();
      const forced = tokens.getAccessToken({
        forceRefresh: true,
      });
      store.release();

      await expect(plain).resolves.toBe("access-old");
      await expect(forced).resolves.toBe("access-new");
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(store.save).toHaveBeenCalledTimes(1);
    });

    it("shares one refresh between concurrent forced calls", async () => {
      const store = heldStore(valid);
      const fetch = vi.fn(async () => tokenResponse({}));
      const tokens = createTokenManager({
        client,
        fetch,
        load: store.load,
        provider,
        save: store.save,
      });

      const plain = tokens.getAccessToken();
      const forced = [
        tokens.getAccessToken({
          forceRefresh: true,
        }),
        tokens.getAccessToken({
          forceRefresh: true,
        }),
      ];
      const later = tokens.getAccessToken();
      store.release();

      await expect(plain).resolves.toBe("access-old");
      await expect(
        Promise.all([
          ...forced,
          later,
        ]),
      ).resolves.toEqual([
        "access-new",
        "access-new",
        "access-new",
      ]);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("doesn't refresh again when the in-flight call already refreshed", async () => {
      const store = heldStore(expired);
      const fetch = vi.fn(async () => tokenResponse({}));
      const tokens = createTokenManager({
        client,
        fetch,
        load: store.load,
        provider,
        save: store.save,
      });

      const calls = [
        tokens.getAccessToken(),
        tokens.getAccessToken({
          forceRefresh: true,
        }),
      ];
      store.release();

      await expect(Promise.all(calls)).resolves.toEqual([
        "access-new",
        "access-new",
      ]);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("still refreshes when the in-flight plain call failed", async () => {
      let loads = 0;
      const fetch = vi.fn(async () => tokenResponse({}));
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tokens = createTokenManager({
        client,
        fetch,
        load: async () => {
          loads += 1;
          if (loads === 1) {
            await held;
            throw new Error("storage unavailable");
          }
          return valid;
        },
        provider,
        save: async () => {},
      });

      const plain = tokens.getAccessToken();
      const forced = tokens.getAccessToken({
        forceRefresh: true,
      });
      release();

      await expect(plain).rejects.toThrow("storage unavailable");
      await expect(forced).resolves.toBe("access-new");
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
