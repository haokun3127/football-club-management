# Backoffice Quality

Use Node 24 and the actual package commands: `pnpm --filter @football-club/backoffice typecheck`, `test`, and `build`; run affected API tests and `pnpm check:delivery` for cross-boundary integration. The legacy fallback may additionally use `node --check`.

Verify actual login, reload, search, mutation/readback, history, conflict input retention, permission failure and logout in an isolated browser against the disposable local fixture. Use real cookie authentication and the configured environment prefix. Inspect screenshots and CSP violations in the current build. Mocks or controller tests do not replace rendered evidence.

Build before starting a fixture that snapshots the asset allowlist. Synthetic fixtures use temporary databases, random credentials and temporary identity keys, and remove their directories on shutdown. Never point a UI test at an existing customer database. Distinguish previous verification from checks run after later source changes; do not claim all modules complete from a shell or data-table test.
