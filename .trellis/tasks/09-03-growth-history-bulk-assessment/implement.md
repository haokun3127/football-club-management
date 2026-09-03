# Execution Plan

## Validation baseline

- Mini-program targeted tests for each touched page and utilities.
- API route tests covering timeline, match detail, assessment task/project rows, and saved assessment linkage.
- `npx --yes pnpm@10.33.0 run check` when the final full-scope change is ready; report the two known unrelated blockers precisely if they remain.
- `git diff --check` before every commit.

## Ordered batches

1. **Figma V7 design first**: complete — non-destructive Parent V7 nodes `1967:2` / `1967:164` / `1967:198` and Coach V7 nodes `1973:2` / `1973:91` / `1973:131` / `1973:181` / `1973:302` were written and screenshot-read back.
2. **Parent timeline data and navigation**: in progress — API and page tests now cover per-lesson progress; the first unit exposes and renders it. Ability-history and match-detail navigation are complete, with the match route now using the P4.2 V7 full-screen hierarchy.
3. **Parent visual cleanup**: add page-level tests for card classes and view-model fields, remove the Growth card border artifact, align the full-screen history and match detail layouts to V7, then commit.
4. **Coach visual shell**: in progress — C11 creation wording is synchronized to V7 and verified; C13/C14 code shells now match the V7 white radar/team-overview layouts, and obsolete C14 layers were hidden in Figma. Runtime visual acceptance remains pending a real coach session and strict `375×812` screenshots.
5. **Coach bulk project entry**: C12.1 code complete for this batch — the task→project chooser now opens a full-screen roster batch page. Each project keeps a task+project-scoped local draft, renders every real team member with precomputed WXML-safe metric rows, and saves filled students through the existing `submitCoachAssessment` contract. The V7 top bar and `保存本项目 → 下一项目` action order are synchronized; remaining work is API-backed existing-score hydration and runtime visual acceptance.
6. **Integration and documentation**: targeted suites and typecheck are green; full gate has the two unrelated mini-program failures recorded in `docs/current/progress.md`. Inspect diffs, make a limited-path work commit, push to `origin/dev`, then establish a real coach session and complete C12.1/C13/C14 screenshot revalidation before marking the visual units complete.

## High-risk files

- `apps/api/src/routes/app-client.routes.ts`: preserve role authorization and existing response compatibility.
- `apps/miniprogram-cq-talent/pages/parent/growth/*`, `milestones/*`, `match-history/*`, `event/*`: do not put array transforms in WXML.
- `apps/miniprogram-cq-talent/pages/coach/test-tasks/*`, `test-entry/*`, `assessment-entry/*`, `team-ability/*`, `student-radar/*`: keep fixed controls above `role-tabbar` and safe-area padding.
