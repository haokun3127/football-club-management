# Implement: Test-Metric SQLite Persistence (Batch A)

## Planning gate

- Keep this task in `planning` while the artifacts are reviewed. Do not run `task.py start` in this document-only preparation step.
- Read `AGENTS.md`, the task PRD/design, `.trellis/spec/api/backend/app-client-bff-contracts.md`, `.trellis/spec/api/backend/quality-guidelines.md`, `.trellis/spec/domain/backend/database-guidelines.md`, and `.trellis/spec/guides/cross-layer-thinking-guide.md` before implementation.
- Verify `0002_data_capability_foundation.sql` contains the five required assessment/lineage tables and usable foreign keys before choosing repository SQL.

## Ordered TDD steps

1. Add a file-backed SQLite RED regression in `apps/api/test/persistence.test.ts`: use the coach app-client assessment POST with the existing seed, close the app/database, reopen the same path with `seed:true`, then call parent growth-summary and ability-metrics reads. Assert the old implementation loses the submitted assessment/raw result/score/metric record/lineage or returns seed-only values.
2. Run the focused persistence test and record the exact RED assertion before changing implementation.
3. Add the smallest assessment repository boundary needed by the existing persistence architecture; register it in `platform-persistence.ts` and seed in dependency order with insert-if-absent. Persist all four result layers plus `metric_lineages` in one transaction. Do not add a migration.
4. Route `PersistentApiStore.recordAssessment` and `getStudentMetrics` (including growth-summary and ability-metrics callers) through SQLite. Preserve the generic assessment POST and app-client route paths, authorization, response mapping, and existing ID generation semantics. Do not add assessment idempotency.
5. Add server contract coverage for coach `201`, parent `403`, no-scope coach `403`, cross-child parent `403`, authorized parent `200`, and both route forms. Assert metric lineage/source relationships are retained.
6. Inspect the mini-program normalizer. Only if backend `participant`/metric fields are dropped, make the smallest `utils/api.ts` and `api.test.mjs` change; do not touch P5 page files.
7. Re-run the focused tests for GREEN, then API persistence/server tests, API typecheck/build, mini-program tests/typecheck, and `git diff --check`. Report known historical API fixture differences separately; never claim whole-repository green.

## Restart acceptance

- Create a new temporary file `DATABASE_URL` outside the repository.
- Submit an assessment containing non-empty metric values and required lineage, then capture the confirmed API PID.
- Build the API, stop only that confirmed PID, start `dist/index.js` with the same database, and use HTTP parent growth-summary/ability-metrics requests to read back the exact values and lineage.
- Confirm the readback is not seed-only and that no duplicate relation was created by the persistence layer. Remove only the temporary database after evidence is recorded.

## Review and stop conditions

- Do not modify P5 WXML/WXSS/TS, migrations, Figma, screenshot tooling, project configuration, icons, WPS, or unrelated dirty paths.
- Batch B cannot start until the current Figma file provides real P5/radar and metric-entry nodes plus screenshots. Without a trusted coach/parent `375x812` screenshot, visual acceptance remains pending.
- If schema inspection or same-database restart readback fails, stop with the exact evidence and do not update visual claims.

## Batch A verification record (2026-08-05)

- [x] RED regression reproduced assessment loss after file-backed SQLite close/reopen.
- [x] GREEN persistence tests passed; assessment, raw result, score, metric record, and lineage are stored through the SQLite repository.
- [x] API contract/typecheck/build passed. Focused persistence/server run: `59/59` with `--testTimeout 15000`; the default 5-second run still reports the known `serves parent content slices` timeout.
- [x] Same-database `dist/index.js` restart readback passed: `/health`, parent `growth-summary`, and `ability-metrics` returned `200`; `assessment-2` was present after restart. Confirmed PID `29432` was stopped and port `3417` was released.
- [ ] P5/radar visual implementation and trusted `375x812` visual acceptance remain blocked because the current Figma file has no verified P5/radar or metric-entry source nodes.

## Batch B visual-audit pointer (2026-08-07)

- Figma 节点阻塞已于 2026-08-07 解除（`93:278 / P5 Ability Radar` 在线），首次设计↔运行对照取证完成，记录见 `visual-audit-2026-08-07.md`（D0–D3 分级差异清单；发现 2 个 D3 级差异待修复批复测；措辞上限「已对照，差异见清单」，判定权留用户）。
