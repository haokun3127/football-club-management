# Test metric persistence and P5 radar

## Goal

Batch A persists coach test-metric assessments in SQLite and proves that parent metric readbacks survive an API restart. The existing coach app-client assessment POST and parent growth-summary/ability-metrics contracts remain unchanged.

## Requirements

- Persist the assessment aggregate and its four result layers: `player_assessments`, `assessment_raw_results`, `assessment_scores`, and `player_metric_records`, together with required `metric_lineages`.
- Reuse the tables and constraints from `0002_data_capability_foundation.sql`; do not add or change a migration unless a pre-implementation schema check proves the existing tables cannot satisfy the contract and a new approval is obtained.
- Keep both assessment write paths unchanged: coach app-client POST and the generic assessment POST, including route shape, request/response fields, app-client selection, and authorization.
- Preserve coach `201`, parent `403`, no-scope coach `403`, cross-child parent `403`, and authorized parent readback behavior.
- Assessment POST currently has no `Idempotency-Key` contract. Do not invent duplicate-request idempotency or claim that stable primary keys/insert-if-absent provide it; every request's assessment relationships must be retained.
- Do not change P5 WXML/WXSS/TS or radar presentation in Batch A. Batch B is blocked until the current Figma file provides real P5/radar and metric-entry nodes plus screenshots.

## Acceptance Criteria

- [ ] RED: a file-backed SQLite regression shows that the current implementation loses assessment data after close/reopen with the same path and `seed:true`; the test covers coach app-client POST followed by parent growth-summary and ability-metrics reads.
- [ ] GREEN: repositories, platform persistence/seed, and `PersistentApiStore` preserve assessment, raw-result, score, metric-record, and lineage rows across close/reopen without overwriting existing rows.
- [ ] Contract tests preserve coach `201`, parent/no-scope/cross-child `403`, authorized parent `200`, both app-client and generic assessment routes, and existing route payloads.
- [ ] API build, same-database `dist/index.js` restart, and HTTP readback prove the submitted assessment and metric values survive; no duplicate assessment relation is introduced by the persistence layer.
- [ ] Small-program tests/typecheck pass; `utils/api.ts` and `api.test.mjs` change only if the normalizer drops backend fields.
- [ ] `git diff --check` passes, with known historical API fixture differences reported separately rather than calling the whole repository green.
- [ ] Batch B C4/P5 visual work remains unchecked until a trusted current Figma P5 source exists; no visual completion claim is allowed in Batch A.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
