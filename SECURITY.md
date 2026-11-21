# Security

## Reporting vulnerabilities

Email **sebasurdanegui@gmail.com** only. Do not open public GitHub issues for security bugs.

Please include:

- The affected package (`@usecalendar/core` or `@usecalendar/react`) and version
- Steps to reproduce (a minimal snippet is ideal)
- Impact (what an attacker could do)
- Whether the issue is already public

We will acknowledge your report and work on a fix. Please do not file a public issue for unfixed vulnerabilities.

## Other contact

- General support: **sebasurdanegui@gmail.com**
- Maintainer: **sebasurdanegui@gmail.com**

## Scope

This policy covers the npm packages published from **this repository**:

- `@usecalendar/core`
- `@usecalendar/react` (including the `@usecalendar/react/mini` entry and its stylesheets)

usecalendar is a client-side UI library. It renders the events an app passes in and reports user actions through callbacks. It holds no credentials, and it never fetches, stores or sends calendar data anywhere.

Examples of in-scope issues:

- Event content (titles, labels, formatter output) rendered as HTML or script instead of text, leading to cross-site scripting
- Network requests, storage access (cookies, `localStorage`, IndexedDB) or logging of event data made by the library
- Code that crashes or misbehaves during server rendering in a way that exposes data from another request
- A compromised or tampered published package (e.g. contents that don't match this repository or its npm provenance)

Out of scope:

- Content the consuming app renders itself through render props (`renderEvent`, `renderEventWrapper`, `renderDay`, …) or custom `labels` and `formatters`
- How the consuming app loads, authorizes, validates or saves events (the library only proposes changes through callbacks)
- The app's Content Security Policy, styling, or its own dependencies (the runtime dependencies are `clsx` and `tailwind-merge`; `react` and `react-dom` are peer dependencies)
- Bugs in browsers, React, or the `Temporal` implementation or polyfill the app provides

## Supported versions

Security fixes are released for the latest published version of each package. Older versions are not patched; please upgrade.

There is no bug bounty program at this time.