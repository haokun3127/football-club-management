# C12.1 Coach Assessment Autosave State

## Goal

Implement the C12.1 autosave-resume state for the existing coach assessment-entry page using current local assessment drafts only. The visual authority is `zZ6wKyOHKcO4UYXDd9jGwv / 93:1061 / C12.1 Autosave State`.

## Requirements

- Keep the existing `/pages/coach/test-entry/index?eventId=<eventId>` route, existing API calls, and `assessment-draft` storage contract unchanged.
- After a coach has loaded a writable workbench and a matching form version, display the resume modal only when a local draft entry has all four properties: the current event/version storage tuple, a current roster student, a current form test item, and a status other than `empty`.
- The modal labels the newest valid entry as a local draft. It never uses a fixed relative time or implies server persistence. Missing or invalid timestamps use a safe local-draft label.
- While the modal is visible, its full-screen event mask and page-local guards prevent entry, field navigation, submission, and tab interaction. Continue closes the modal without deleting data. Exit returns once without deleting data.
- A per-load token prevents an older workbench/form request from committing an obsolete modal or error after a later load.
- Do not add requests, alter `utils/assessment-draft`, delete drafts, invent scores, or expose untrusted API error text.

## Scope

Allowed files:

- `apps/miniprogram-cq-talent/pages/coach/test-entry/index.ts`
- `apps/miniprogram-cq-talent/pages/coach/test-entry/index.wxml`
- `apps/miniprogram-cq-talent/pages/coach/test-entry/index.wxss`
- `apps/miniprogram-cq-talent/pages/coach/test-entry/index.test.mjs`
- `apps/miniprogram-cq-talent/assets/icons/c121-check.svg` from the referenced Figma node
- `.trellis/tasks/08-10-coach-autosave-state-figma-alignment/**`
- The parent task child pointer automatically maintained by `task.py`

Excluded: API, storage helpers, shared tab bar, app configuration, all backend/persistence files, and other working-tree changes.

## Acceptance Criteria

- [x] A valid in-scope local draft opens the modal after the matching workbench and form load.
- [x] Empty, stale-roster, stale-field, other-event, and other-version entries do not open it.
- [x] Continue unlocks the existing page without clearing the draft; Exit navigates back exactly once without clearing it.
- [x] Page-local input, field navigation, submit, and navigation actions do nothing while the modal is visible; no API call or storage write is introduced by the modal.
- [x] The latest valid local `updatedAt` is shown safely; no fixed time or server-save claim is rendered.
- [x] A stale success or failure from an earlier load cannot replace the later event's state or modal.
- [x] Focused tests, mini-program typecheck, full mini-program tests, task validation, and diff check pass.
