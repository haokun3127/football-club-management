# Fix parent schedule date handling and add dual-role entry

## Goal

Restore the parent schedule to real calendar time and let authenticated people who are both a parent and a coach deliberately enter either permitted experience.

## Child Deliverables

1. `08-10-parent-schedule-live-date`: live parent dates, inclusive calendar end dates, and historical/future-week navigation.
2. `08-10-active-role-switch`: real membership-derived role availability, login choice, and in-app role switching.

## Shared Constraints

- Figma is not a source for authorization decisions.
- Do not create fake phone numbers, sessions, roles, or API responses.
- `roleHint` remains non-authoritative.
- Keep guardian scope for parent data and coach scope for coach data after a role switch.
- Preserve unrelated dirty paths and stage only task-owned files.

## Integration Acceptance Criteria

- [ ] On Monday, August 10, 2026, the parent schedule defaults to August 10–16 rather than June 22–28.
- [ ] A Sunday activity is returned by a `to=<Sunday>` calendar request, while the following Monday is excluded.
- [ ] A parent-only account keeps its direct parent entry; a coach-only account keeps its direct coach entry.
- [ ] A dual-role membership can choose either permitted entry without a second phone authorization.
- [ ] Neither parent nor coach API authorization can be elevated by editing local mini-program state.
