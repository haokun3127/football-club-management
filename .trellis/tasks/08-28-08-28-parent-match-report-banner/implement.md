# Parent growth active-student consistency — implementation plan

### Task 1: Write the regression tests

**Files:**
- Create: `apps/miniprogram-cq-talent/pages/parent/training-history/index.test.mjs`
- Create: `apps/miniprogram-cq-talent/pages/parent/milestones/index.test.mjs`

- [x] Add a test where `requireRole("parent")` returns `currentStudentId: "student-2"`, two children are returned, and the page asserts the calendar/growth calls use `student-2`.
- [x] Run the focused tests and confirm they fail because the implementation currently selects `children[0]`.

### Task 2: Resolve the active child in both pages

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/parent/training-history/index.ts`
- Modify: `apps/miniprogram-cq-talent/pages/parent/milestones/index.ts`

- [x] Replace the unconditional first-child selection with the session-aware fallback from the design document.
- [x] Keep the existing API calls, filtering, view models, and empty/error states unchanged.

### Task 3: Verify and record

**Files:**
- Modify: `docs/current/progress.md`

- [x] Run the focused tests.
- [x] Run mini-program typecheck and the full repository check.
- [x] Run `git diff --check`.
- [x] Record the selected-student consistency fix and its verification evidence in the progress log.
- [ ] Commit only the task artifacts, the two page implementations/tests, and the progress entry.
