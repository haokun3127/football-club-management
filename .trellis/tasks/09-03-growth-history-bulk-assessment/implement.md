# Execution Plan

## Validation baseline

- Mini-program targeted tests for each touched page and utilities.
- API route tests covering timeline, match detail, assessment task/project rows, and saved assessment linkage.
- `npx --yes pnpm@10.33.0 run check` when the final full-scope change is ready; report the two known unrelated blockers precisely if they remain.
- `git diff --check` before every commit.

## Ordered batches

1. **Figma V7 design first**: complete — non-destructive Parent V7 nodes `1967:2` / `1967:164` / `1967:198` and Coach V7 nodes `1973:2` / `1973:91` / `1973:131` / `1973:181` / `1973:302` were written and screenshot-read back.
2. **Parent timeline data and navigation**: complete for this task — API and page tests cover per-lesson progress; ability-history and match-detail navigation use the P4.2 V7 full-screen hierarchy.
3. **Parent visual cleanup**: add page-level tests for card classes and view-model fields, remove the Growth card border artifact, align the full-screen history and match detail layouts to V7, then commit.
4. **Coach visual shell**: code/design batch complete — C11 creation wording is synchronized to V7 and verified; C13/C14 code shells match the V7 white radar/team-overview layouts, and obsolete C14 layers were hidden in Figma. Runtime visual acceptance remains pending a real coach session and strict `375×812` screenshots.
5. **Coach bulk project entry**: code complete for this batch — the task→project chooser opens a full-screen roster batch page. Each project keeps a task+project-scoped local draft, hydrates existing saved entries from the API, renders every real team member with precomputed WXML-safe metric rows, and saves filled students through the existing `submitCoachAssessment` contract. The V7 top bar and `保存本项目 → 下一项目` action order are synchronized; runtime visual acceptance remains pending.
6. **Integration and documentation**: targeted suites, API full suite, and typecheck are green. The full gate still has the two unrelated mini-program failures recorded in `docs/current/progress.md`. This batch is ready for a limited-path commit; after commit, establish a real coach session and complete C12.1/C13/C14 screenshot revalidation before marking the visual units complete.

## 2026-09-03 final implementation check

- Fixed API batch-entry hydration: once the assessment task team has passed coach authorization, roster membership is the source of truth; the endpoint no longer incorrectly applies the unrelated recent-30-day activity filter.
- Fixed post-save UX: saved scores remain visible with `已保存` status, only pending changed values are submitted on a repeat save, successful students lose their local draft, and failed students retain a retryable draft.
- Verification: API and mini-program TypeScript checks passed; API assessment-task regression `1/1`; C12.1/C13/C14 mini-program tests `22/22`; API full suite `126/126`; `git diff --check` passed.
- Root `corepack pnpm run check` remains blocked only by the two pre-existing, out-of-scope mini-program failures: `scripts/devtools-screenshot.test.mjs` has a collection-time syntax error, and `pages/parent/content/index.test.mjs` has an LF/CRLF-sensitive exact CSS-string assertion. No code in either file is part of this task.
- Trusted WeChat DevTools/device `375×812` runtime screenshots for C12.1/C13/C14 are still outstanding; static/type/API evidence must not be labeled visual acceptance.

## 2026-09-03 production compatibility recovery

- A first production deployment of `a4d9542` exposed a legacy-data compatibility issue: `0019_assessment_task_scope.sql` had added nullable `team_id`/`term_label`, while the repository decoder treated both as required and the API restart looped on an older unscoped task row. No production data was written; a file-consistent SQLite backup was taken before the release attempt.
- The prior image was restored immediately and both internal and HTTPS health returned `200`. The corrective repository query now excludes only unscoped legacy tasks from the new scope-bound workflow; it does not infer or write a team for any historic task.
- A new file-SQLite regression first reproduced the exact startup exception, then passed after the fix. API full suite is `127/127` and API build passes. Production redeployment and WeChat DevTools C12.1 readback remain the next required steps.

## 2026-09-03 C12.1 completed-task readback recovery

- Online Figma was updated before code: a non-destructive C12.1 completed-state board, `1985:2` (`C12.1 · Team Batch Entry · V7 · Completed Read-only`), was added to file `zZ6wKyOHKcO4UYXDd9jGwv` and screenshot-read back.
- Production API evidence confirmed the final team submission transitions a scoped task to `completed` (the acceptance task has 19 completed students). The previous C11/C12/C12.1 client gate treated this valid state as unavailable, so a coach could not review the results just saved.
- The task list, project chooser and batch page now accept `in_progress` and `completed`. The completed page hydrates persisted rows, marks the page read-only, prevents input and save writes, and replaces the forward action with `返回项目`.
- `getCoachAssessmentTasks({ forceRefresh: true })` appends a unique cache-busting query value for post-write reads, avoiding stale DevTools task-list status without altering BFF payloads or creating fake data.
- Fresh verification: targeted mini-program Vitest `37/37`, mini-program TypeScript `--noEmit`, and `git diff --check` all pass. Runtime DevTools navigation was still routing back to the coach schedule, so no screenshot from that state is claimed as C12.1 visual acceptance.

## 2026-09-03 C12.1 saved-state label correction

- Figma board `1985:2` was updated first so completed roster rows show the explicit `已保存` state beside each real raw result; the board was re-read at native `375×812`.
- A real DevTools run with the correct project id `dimension-technical` loaded 19 persisted scores. It exposed a presentation mismatch: the page data had `row.statusLabel = 已保存`, but WXML rendered the metric helper `待提交` instead.
- WXML now renders the precomputed row status. Fresh runtime evidence is `C:\Users\ASUS\AppData\Local\Temp\cq-talent-c121-completed-saved-status-reroute-390x844.png`; it shows all visible persisted rows as `已保存`. The simulator was `390×844`, so this is runtime evidence, not strict `375×812` acceptance.
- The earlier blank direct route was also explained: `fitness` was a debug-only invalid project id; the real form dimension id is `dimension-technical`, and the API correctly returns no bindings for an unknown project id.

## 2026-09-03 C13 six-axis radar projection and runtime readback

- Online Figma Coach V7 C13 `1973:302` was re-read before code verification at native `375×812`; it defines six visible axes: 协作、速度、射门、体能、防守、传球.
- The coach student radar view now projects the existing real metric response onto those six configured metric IDs for display, preserving each metric's real value, max value, metric ID, and timestamp. The extra “整体战术” and “精神” metrics are not shown in the V7 radar when all six configured axes are available; no score is invented or recalculated.
- Runtime verification through the WeChat DevTools MCP loaded a real coach student (`student-cq-talent-secure-test-1-1`) after opening `/pages/coach/student-radar/index?student=...`. Screenshot evidence: `C:\Users\ASUS\AppData\Local\Temp\cq-talent-c13-runtime-20260903.png` (`390×844`, so runtime evidence only, not strict `375×812` acceptance). The screenshot shows six complete labels and the fixed top bar.
- Fresh verification: C13/C14/C12.1/C11/C12/C15 targeted Vitest `57/57`; mini-program TypeScript passed; `git diff --check` passed. Root `pnpm run check` still reports only the two recorded out-of-scope blockers: `scripts/devtools-screenshot.test.mjs` collection-time syntax error and `pages/parent/content/index.test.mjs` LF/CRLF-sensitive exact CSS assertion.

## High-risk files

- `apps/api/src/routes/app-client.routes.ts`: preserve role authorization and existing response compatibility.
- `apps/miniprogram-cq-talent/pages/parent/growth/*`, `milestones/*`, `match-history/*`, `event/*`: do not put array transforms in WXML.
- `apps/miniprogram-cq-talent/pages/coach/test-tasks/*`, `test-entry/*`, `assessment-entry/*`, `team-ability/*`, `student-radar/*`: keep fixed controls above `role-tabbar` and safe-area padding.
