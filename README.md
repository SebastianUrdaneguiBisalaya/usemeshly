# usemeshly

Typed, storage-free SDKs for third-party integrations, with authentication shared across all of them.

| Package | What it does |
| --- | --- |
| [`@usemeshly/auth`](./packages/auth) | OAuth 2.0 + PKCE (`@usemeshly/auth/oauth`) and Basic, Bearer and API key headers (`@usemeshly/auth/basic`). |
| [`@usemeshly/google-calendar`](./packages/google-calendar) | Google Calendar API v3 client with incremental sync, plus the Google OAuth descriptor. |

Outlook, Notion and other integrations will follow as separate packages, so you only install the ones you use.

> **Run these packages on a trusted server, CLI or desktop app only.** They work with client secrets and OAuth tokens. Never bundle them, or the credentials you pass them, into code shipped to a browser or a mobile client.

## Principles

- **You own storage.** No package stores tokens, keys or secrets. You pass `load` and `save` functions, and they decide where tokens live: your database, a keychain, a file.
- **You bring the credentials.** No client IDs or secrets ship with the packages, and they never read `process.env`.
- **Any runtime.** Only Web APIs are used (`fetch`, Web Crypto, `AbortSignal`), so they run on Node.js 20.3+ and any other runtime that provides them. `fetch` is injectable.
- **Validated and typed.** Every response from a provider is validated with zod. Every failure is a `MeshlyError` with a typed `code`, and its message is redacted so it never contains tokens or secrets.
- **Small footprint.** The only runtime dependencies are `oauth4webapi` and `zod`. ESM and CommonJS builds ship with types.

## Quick start: Google Calendar

```bash
pnpm add -E @usemeshly/auth @usemeshly/google-calendar
```

```ts
import { createTokenManager } from "@usemeshly/auth/oauth";
import { createGoogleCalendarClient, googleOAuthProvider } from "@usemeshly/google-calendar";

const tokens = createTokenManager({
  provider: googleOAuthProvider,
  client: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
  load: () => tokenStore.read(userId), // your storage
  save: (next) => tokenStore.write(userId, next),
});

const calendar = createGoogleCalendarClient({ getAccessToken: tokens.getAccessToken });
const { items, nextSyncToken } = await calendar.events.list("primary");
```

For the sign-in flow that produces those tokens, see the [Google Calendar README](./packages/google-calendar#connect-a-google-account).

## Development

Requirements: Node.js 20.3+ and pnpm 12.3.4 (pinned in `devEngines.packageManager`).

```bash
pnpm install          # also installs the git hooks
pnpm run typecheck    # tsc --noEmit in every package
pnpm run lint         # biome check (pnpm run lint:fix to apply fixes)
pnpm run test         # vitest, every package
pnpm run build        # tsup: ESM + CJS + types in each packages/*/dist
pnpm run smoke:pack   # after build: installs the packed tarballs and checks every export (ESM, CJS, types)
```

The git hooks run `lint` + `typecheck` and check the commit message (Conventional Commits) on commit, and `test` + `build` on push.

To try a package in another project before it's released, run `pnpm pack` inside `packages/<name>` and install the tarball there (`npm install /path/to/usemeshly-<name>-x.y.z.tgz`).

Before opening a pull request, run all of the commands above. If the change should ship in a release, add a changeset (`pnpm changeset`). See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

### Releasing

Publishing happens only through `.github/workflows/publish.yml`, when a GitHub Release is published. The workflow runs the full gate, then publishes every package whose version isn't on npm yet, with `@usemeshly/auth` first. Never run `npm publish` locally. Versioning rules are in [AGENTS.md](./AGENTS.md#before-and-after-the-first-npm-release).

## Security

Report vulnerabilities privately as described in [SECURITY.md](./SECURITY.md).

## License

[ISC](./LICENSE)
