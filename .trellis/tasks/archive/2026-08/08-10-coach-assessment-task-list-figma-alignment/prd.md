# Coach assessment task list Figma alignment

## Goal

Implement the coach assessment-task list as a faithful, data-backed interpretation of online Figma frame C11 Test Task List (`zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1002`) without inventing assessment-task creation or detail capabilities.

## Requirements

- Change only the C11 page, a focused page test, one direct Figma arrow asset, and this task's artifacts.
- Read the existing assessment-task list API. Its task fields are `id`, `title`, `templateId`, `startsOn`, `dueOn`, `status`, `completedStudents`, and `totalStudents`.
- Render Figma's pink custom header and activate the training tab, while preserving safe navigation behavior.
- Use stable view-model filters: `all`, `unfinished`, and `completed`; unfinished includes `not_started` and `in_progress`.
- Precompute all display fields and `visibleTasks` in TypeScript. WXML must not invoke JavaScript array methods.
- Permit navigation to the existing assessment-entry page only for `in_progress` tasks and only with the real `templateId` and title.
- For `not_started` and `completed`, keep the user on C11 and show an honest state message. Do not navigate to a writable form.
- Remove non-functional create affordances; there is no real create-task API in this batch.
- Use safe, non-backend-error UI messaging and refresh successfully loaded data on return to the page.
- Do not modify API, persistence, store, test, project configuration, untracked icon, or unrelated user work.
- Device screenshot review is expressly non-blocking for this programme; do not claim it occurred.

## Acceptance Criteria

- [x] Coach loads the real assessment task list; non-coach does not issue the request.
- [x] API statuses map accurately to labels, progress state and styles; `unfinished` includes both unstarted and in-progress tasks.
- [x] A zero-student task has a zero progress width without invalid arithmetic; visual width is clamped to 0--100 while its label preserves API counts.
- [x] Filtering and empty-filter state work from TypeScript-precomputed fields, with no forbidden WXML methods.
- [x] An in-progress row routes with its real template ID; unstarted and completed rows do not route to the entry form.
- [x] API failures expose a safe generic message, and `onShow` refreshes only after an initial successful load.
- [x] Focused C11 tests, package typecheck and the package test suite pass.
- [x] No protected unrelated path is changed or staged.
