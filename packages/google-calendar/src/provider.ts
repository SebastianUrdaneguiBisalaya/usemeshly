import { defineOAuthProvider } from "@usemeshly/auth/oauth";

/**
 * Google's OAuth 2.0 descriptor for `@usemeshly/auth/oauth`.
 *
 * - `access_type=offline` and `prompt=consent`, so Google issues a refresh token (also on a repeat sign-in).
 * - `include_granted_scopes=true`, for incremental authorization.
 * - `client_secret_post`: Google requires the client secret even with PKCE, also for installed (desktop) apps.
 * - Refresh tokens are not rotated; revocation goes to `https://oauth2.googleapis.com/revoke`.
 *
 * Bring your own client ID and secret from the Google Cloud console; none ship with this package.
 */
export const googleOAuthProvider = defineOAuthProvider({
  clientAuth: "client_secret_post",
  endpoints: {
    authorization: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
  },
  extraAuthParams: {
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
  },
  id: "google",
  issuer: "https://accounts.google.com",
  revocationEndpoint: "https://oauth2.googleapis.com/revoke",
  rotatesRefreshToken: false,
});

/** Google Calendar OAuth scopes. Request the narrowest set your app needs. */
export const GOOGLE_CALENDAR_SCOPES = {
  /** Full access to calendars and events. */
  calendar: "https://www.googleapis.com/auth/calendar",
  /** Read the list of calendars the user is subscribed to. */
  calendarListReadonly:
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  /** Read calendars and events. */
  calendarReadonly: "https://www.googleapis.com/auth/calendar.readonly",
  /** Read and write events on all calendars. */
  events: "https://www.googleapis.com/auth/calendar.events",
  /** Read events on all calendars. */
  eventsReadonly: "https://www.googleapis.com/auth/calendar.events.readonly",
} as const;

export type GoogleCalendarScope =
  (typeof GOOGLE_CALENDAR_SCOPES)[keyof typeof GOOGLE_CALENDAR_SCOPES];
