# Parent growth active-student consistency — design

## Decision

Use the existing `requireRole("parent")` session as the source of truth. Both `pages/parent/milestones/index.ts` and `pages/parent/training-history/index.ts` already load bound children; they will resolve the active child with the same rule already used by `pages/parent/growth/index.ts` and `pages/parent/child/index.ts`:

```ts
const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
```

The selected student's id is then used for the existing `getParentCalendar` range requests and the student-membership filter. No API contract changes are needed.

## Data flow

`setCurrentStudentId` → persisted session → `requireRole("parent")` → child resolution → bounded calendar/growth requests → existing P4.1/P4.2 view models.

## Error and fallback behavior

- No session: existing `requireRole` redirect remains unchanged.
- No bound children: existing empty state remains unchanged.
- Selected student removed from the bound list: use the first returned child and keep the existing page behavior.
- API failure: retain each page's existing error state.

## Verification

- Add page-level tests that set `currentStudentId` to the second child and assert all calendar/growth calls use that child's id.
- Run the focused parent tests, mini-program TypeScript check, full `npx --yes pnpm@10.33.0 run check`, and `git diff --check`.
