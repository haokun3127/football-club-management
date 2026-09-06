# Parent club announcement banner semantics

## Goal

Distinguish the parent homepage club announcement banner from account-specific bell reminders. User approved design and implementation on 2026-09-06.

## Requirements

- Label the homepage banner 俱乐部公告; publication/display expiry must not look like a parent action deadline.
- Keep real article titles and prefer editorial subtitles for summaries; open the full article on tap.
- Preserve brand-red decoration without unread or acknowledgement semantics.
- Show only notice-category articles within their publication/expiry window; keep history available through existing content reads.
- Bell reminders keep their independent account-scoped source.
- Update current Figma Parent V6 week/month announcement cards before code.

## Acceptance Criteria

- [x] Figma week/month cards read back with the new announcement label and sample copy.
- [x] Banner selection tests cover future, expired, active, and absent publication timestamps.
- [x] Parent schedule tests, TypeScript and template/style compilation pass.
- [x] Record scope and evidence; commit only owned paths.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
