# Security

## Reporting vulnerabilities

Email **sebasurdanegui@gmail.com**. Do not open public GitHub issues, discussions or pull requests for security bugs.

Please include:

- The affected package (`@usemeshly/auth` or `@usemeshly/google-calendar`) and version
- Steps to reproduce (a minimal snippet is ideal)
- Impact (what an attacker could do)
- Whether the issue is already public

Never include real tokens, client secrets or API keys in a report. Use placeholders, or revoke the credential first.

You'll get an acknowledgement, and a fix will be worked on before anything is disclosed.

## Scope

This policy covers the npm packages published from **this repository**:

- `@usemeshly/auth` (`@usemeshly/auth`, `@usemeshly/auth/oauth`, `@usemeshly/auth/basic`)
- `@usemeshly/google-calendar`

The packages handle OAuth client secrets, access and refresh tokens, and API keys passed in by the calling application. They never store them, they ship no credentials of their own, and they are meant to run only in trusted server-side, CLI or desktop code.

Examples of in-scope issues:

- Tokens, client secrets, authorization codes, PKCE verifiers, API keys, or sync and page tokens appearing in an error's message, its `JSON.stringify` output or its properties
- A way to complete the OAuth flow with a missing or mismatched `state`, without the PKCE verifier, or with an ID token whose issuer, audience, expiry or nonce is wrong
- Overriding flow-controlled authorization parameters (`state`, `code_challenge`, `redirect_uri`, …) through a provider descriptor or `extraParams`
- Header injection through the Basic, Bearer or API key helpers
- A provider response that skips validation and reaches the caller as an unexpected type
- The token manager handing out an access token before a rotated refresh token was saved, or losing a rotated refresh token
- Requests sent over plain HTTP to a non-loopback host
- A compromised or tampered published package (e.g. contents that don't match this repository or its npm provenance)

Out of scope:

- How the application stores tokens (`load`/`save`), and how it protects its own client secret, sessions and configuration
- Shipping these packages or their credentials in a browser or mobile bundle, against the documentation
- Vulnerabilities in the providers themselves (Google, …), in `oauth4webapi`, `zod` or the JavaScript runtime. Please report those upstream. Report it here if this repository uses them unsafely.
- Denial of service through very large inputs supplied by the application itself

## Supported versions

Security fixes are released for the latest published version of each package. Older versions are not patched; please upgrade.

There is no bug bounty program at this time.
