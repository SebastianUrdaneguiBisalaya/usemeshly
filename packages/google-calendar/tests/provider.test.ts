import { createAuthorizationRequest } from "@usemeshly/auth/oauth";
import { describe, expect, it } from "vitest";
import {
  GOOGLE_CALENDAR_SCOPES,
  googleOAuthProvider,
  missingScopes,
} from "../src/index";

describe("googleOAuthProvider", () => {
  it("adds Google's offline-access parameters to the authorization URL", async () => {
    const request = await createAuthorizationRequest(
      googleOAuthProvider,
      {
        clientId: "client.apps.googleusercontent.com",
        clientSecret: "secret",
      },
      {
        redirectUri: "http://127.0.0.1:53682/callback",
        scopes: [
          GOOGLE_CALENDAR_SCOPES.events,
        ],
      },
    );
    const url = new URL(request.url);

    expect(`${url.origin}${url.pathname}`).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      access_type: "offline",
      code_challenge_method: "S256",
      include_granted_scopes: "true",
      prompt: "consent",
      scope: GOOGLE_CALENDAR_SCOPES.events,
    });
  });

  it("keeps Google's parameters next to the caller's extra parameters", async () => {
    const request = await createAuthorizationRequest(
      googleOAuthProvider,
      {
        clientId: "client.apps.googleusercontent.com",
        clientSecret: "secret",
      },
      {
        extraParams: {
          login_hint: "user@example.com",
        },
        redirectUri: "http://127.0.0.1:53682/callback",
        scopes: [
          GOOGLE_CALENDAR_SCOPES.events,
        ],
      },
    );

    expect(Object.fromEntries(new URL(request.url).searchParams)).toMatchObject(
      {
        access_type: "offline",
        include_granted_scopes: "true",
        login_hint: "user@example.com",
        prompt: "consent",
      },
    );
  });
});

describe("missingScopes", () => {
  it("reports scopes the user didn't grant", () => {
    expect(
      missingScopes(`openid ${GOOGLE_CALENDAR_SCOPES.calendarReadonly}`, [
        GOOGLE_CALENDAR_SCOPES.calendarReadonly,
        GOOGLE_CALENDAR_SCOPES.events,
      ]),
    ).toEqual([
      GOOGLE_CALENDAR_SCOPES.events,
    ]);
  });
});
