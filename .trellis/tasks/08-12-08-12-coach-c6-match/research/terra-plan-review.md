# Terra plan review — RETURN

## Decision

**RETURN.** The intended boundaries are sound (API-backed C6/C6.1, device-local C6.2, and fresh-database-only seed verification), but the task is not implementation-ready until the corrections below are made.

## Required corrections

1. **Make one seed aggregate canonical and remove the contradiction.** `prd.md` and `design.md` require the existing completed match to be a 16-player, 3:2 friendly with goal, assist, yellow-card, and save rows. `research/sol-data-plan.md` instead specifies six players, 2:1, and three rows. The current acceptance seed is already 16-player/3:2 with the goal and assist (`apps/api/src/seed/cq-talent-acceptance.ts`). Update the research and implementation plan to use only the 16-player/3:2 aggregate; add yellow-card and save records at distinct minutes for students present in both the event participants and match roster. The test must assert that membership intersection, allowed event types, stable match id, score, and the four required timeline types. Do not infer the 3:2 score from the partial timeline or invent opponent/per-half events.

2. **Turn the existing C6.1 contract into explicit no-regression gates.** State that this task does not change the route/body/schema/authorization/idempotency/persistence contract, migrations, or production database. C6.1 must continue to send only `{ studentId, type, minute?, note? }` plus its stable 8–128-character `Idempotency-Key`; only the API helper's exact `201` is success; all validation, network, conflict, or ambiguous outcomes retain the draft and do not navigate. C6 must navigate back then re-read the exact match-detail GET in `onShow`, with no POST payload, opener channel, or optimistic timeline update. Add these assertions to the focused Mini Program/API test plan.

3. **Make the isolation and restart proof executable.** The command list does not run the required file-backed restart assertion. Name and run the focused test that creates a new temporary SQLite file, performs GET → idempotent POST/replay/conflict → GET, closes/reopens the same file, and re-GETs exactly one new event. It must assert its resolved path is the newly created temporary directory and must never run a broad seed, migration, reset, or write against the normal development/deployed database. Seed changes remain insert-if-absent for fresh isolated databases only.

4. **Refresh and record the three Figma nodes before claiming current alignment.** The task says “current online Figma,” while `sol-data-plan.md` records that `93:796`, `93:827`, and `93:858` were not live-read and may be stale. Fetch/inspect each node and record the visual facts being adopted. Treat every sample name, opponent, score, minute, period score, and timeline row as visual-only unless supplied by the match-detail response. If the nodes cannot be refreshed, narrow the claim to the existing recorded specifications rather than “current online Figma.”

5. **Add explicit C6.2 and WXML regression criteria.** C6.2 may display only a compatible unsent device-local draft: no remote auto-save wording, fake clock, pause/end control, score, or sample event. Continue opens C6.1; exit navigates back; neither writes a server record. Keep all display labels, colours, period-chip state, and timeline projection precomputed in TypeScript/API data; WXML may use bindings, `wx:if`/`wx:for`, static `data-*`, and event bindings, but no helper/method invocation or hard-coded Figma business facts. Add source-level tests for these constraints.

## Evidence reviewed

- Active task PRD/design/implementation/research/manifests.
- Current C6/C6.1 pages and focused tests, including the existing local-draft overlay.
- Match BFF contract: exact `201`, idempotent replay/conflict, and C6 re-read (`.trellis/spec/api/backend/app-client-bff-contracts.md`).
- Current acceptance seed and recorded Figma specifications for `93:796`, `93:827`, and `93:858`.
