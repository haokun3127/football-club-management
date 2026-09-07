# Seven-account demo data consistency repair

## Goal

Prepare seven dual-role accounts for customer testing without resetting authentication.

## Requirements

- Correct credit/attendance, calendar, match and assessment consistency in the authorized demo scopes.
- Preserve real phone bindings, source catalogs and unrelated data; back up before production mutation.

## Acceptance Criteria

- [ ] Positive credits; attendance agrees with ledger and operational profile.
- [ ] Every date in current and next China-local calendar week has usable activities.
- [ ] Scheduled matches have no results; finished matches have consistent event records.
- [ ] Database integrity, focused tests and post-restart role-scoped reads pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
