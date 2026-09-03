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

## High-risk files

- `apps/api/src/routes/app-client.routes.ts`: preserve role authorization and existing response compatibility.
- `apps/miniprogram-cq-talent/pages/parent/growth/*`, `milestones/*`, `match-history/*`, `event/*`: do not put array transforms in WXML.
- `apps/miniprogram-cq-talent/pages/coach/test-tasks/*`, `test-entry/*`, `assessment-entry/*`, `team-ability/*`, `student-radar/*`: keep fixed controls above `role-tabbar` and safe-area padding.
