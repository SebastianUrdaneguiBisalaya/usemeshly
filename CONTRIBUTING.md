# Contributing

Thanks for helping improve usemeshly. Commands and local setup are in the [Development section of the README](./README.md#development). This file covers the workflow.

## Before you start

- Open an issue (or comment on an existing one) before larger changes, so the approach can be agreed first.
- Security bugs go to the maintainer privately: see [SECURITY.md](./SECURITY.md).
- The coding standards for this repo are in [AGENTS.md](./AGENTS.md). They apply to humans and AI agents alike. The essentials:
  - TypeScript `strict`, and no `any` on the public surface.
  - No classes. Use factory functions and plain objects. `MeshlyError` is the only exception.
  - Each package's public API is whatever its `src/index.ts` (or subpath entry) exports, and nothing else.
  - Validate every external response with zod. Every failure throws a `MeshlyError` with a typed `code`. Never put a token or secret in a message.
  - No new runtime dependencies beyond `oauth4webapi` and `zod`. Pin dependencies exactly (`pnpm add -E`).
  - Never store credentials, and never read `process.env` inside a package.

## Workflow

1. Branch from an up-to-date `main`: `type/short-summary` (e.g. `fix/token-refresh-race`).
2. Make the change with tests. Tests live in `packages/<name>/tests/`, mirroring `src/`, and mock `fetch`. They never call a real provider.
3. Run `typecheck`, `lint`, `test`, `build` and `smoke:pack` (see the README). The git hooks run part of this on commit and push, but they can be skipped, so run everything before opening the pull request.
4. If the change should ship, add a changeset with `pnpm changeset`. This isn't needed before a package's first npm release.
5. Open a pull request to `main` that references the issue (`Closes #<n>`).

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), with the package as the scope when there is one. The `commit-msg` hook (`scripts/check-commit-msg.mjs`) rejects anything else:

```
feat(google-calendar): add events.move
fix(auth/oauth): honor forceRefresh while another call is in flight
docs: explain sync token expiry
```

Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `perf`, `build`, `style`, `revert`. The scope is lowercase and optional, and the first line is at most 100 characters. Mark breaking changes with `!` (`feat(auth)!: …`) and a `BREAKING CHANGE:` footer.

## Adding an integration

1. Create `packages/<integration>` with the same layout as `packages/google-calendar`: `tsup` config for ESM + CJS + types, an `exports` map, and `@usemeshly/auth` as a peer dependency (`workspace:^`).
2. Import only the auth subpath it needs, and call `assertServerRuntime()` from `@usemeshly/auth` at the top of the client factory. Only a configuration that holds no secret may skip it, and the README must say so (the Community plan of `@usemeshly/nager-date` is the example). Export the provider's OAuth descriptor (or header helper) from the integration, never from `auth`.
3. Add the package to the publish loop in `.github/workflows/publish.yml`, after `packages/auth`.
4. Write its README: install, setup at the provider, connect flow, one example per resource, and its error codes.

## Releases

Only the maintainer releases, through a GitHub Release, which runs `.github/workflows/publish.yml`. Never run `npm publish` or `pnpm publish` yourself.
