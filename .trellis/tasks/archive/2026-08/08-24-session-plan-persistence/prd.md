# Persist coach session plans across API restarts

## Goal

Make coach-selected training projects survive an API restart without changing the existing mini-program route contract.

## Requirements

- Persist each `SessionPlan` in SQLite with club scoping and stable ID upsert semantics.
- Load persisted plans into `PersistentApiStore` during startup so existing event detail and training-project endpoints read them after restart.
- Preserve the complete domain payload: catalog scope, name, objective IDs, metric IDs, ordered blocks, block notes, estimated minutes, and timestamps.
- Keep seed behavior safe: seeded plans remain available, and a persisted plan with the same ID is authoritative after restart.
- Keep SQL inside `apps/api/src/persistence/*`; route handlers continue to use the store.
- Add a file-backed close/reopen regression proving the training-project PUT result can be read after reopening the API store.

## Acceptance criteria

- A training-project PUT creates or updates one SQLite row for its session plan.
- Reopening the same SQLite file returns the same selected project IDs, order, notes, and estimated duration.
- Repeating the same PUT is idempotent by session-plan ID.
- API typecheck, API tests, and the root quality gate pass.
- Only task-owned persistence, store, migration, and test files are staged.

## Out of scope

- No mini-program UI change.
- No Figma change.
- No production database write or deployment in this implementation batch.

## Goal

TBD.

## Requirements

- TBD

## Acceptance Criteria

- [ ] TBD

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
