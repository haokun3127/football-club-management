# Align C8 training management to Figma

## Goal

Implement C8 Training Management (`93:896`) from Figma file `zZ6wKyOHKcO4UYXDd9jGwv` using only existing coach-home and coach-team data. This is a page-local alignment task, not an API or persistence task.

## Requirements

- Route: `/pages/coach/training/index`.
- Compute the current calendar month's bounded `from`/`to` locally and pass it explicitly to coach-home. Training events produce cards and explicit `summary.matches` produces the monthly match count. Coach-team statistics retain their API meaning: near-30-day coach-scoped training, attendance rate, and coached learners.
- Hero uses truthful labels: `近30天训练`, `近30天出勤率`, `近30天执教学员`, and `本月比赛`. It must not relabel a non-existent historical aggregate as Figma's cumulative lessons.
- Cards consume the existing normalizer's safe text fields; participant count is shown only when supplied. The page must not claim to know raw source-field absence that the normalizer does not expose.
- Remove the old C10 project tree, workbench, search, selection, save, assessment/content-selection paths, and their component registrations from C8. C8 navigates only to existing team ability, team management, and true event-detail routes.
- Use page-local TS view data. WXML has no array/string helper calls and no Figma sample values.
- Keep the existing coach role tab bar and status view; do not modify global app configuration, API helpers, or protected backend work.

## Acceptance Criteria

- [x] Two real reads map to truthful C8 hero metrics and training cards; match events do not appear as cards.
- [x] Null attendance and missing participant/venue fields remain truthful safe display states.
- [x] API failure clears prior display data; non-coach state makes no request.
- [x] Navigation passes only an API event ID or uses the two existing fixed team routes.
- [x] Legacy C10 project save/search/selection code is absent from C8, and focused tests/package checks/diff check pass.
- [ ] Device screenshot comparison is non-blocking under the current all-pages goal and is not claimed as complete.

## Notes

- Figma source: `https://www.figma.com/design/zZ6wKyOHKcO4UYXDd9jGwv/?node-id=93-896`.
- Excluded protected work: API routes, Store, persistence, migrations, API tests, project configuration, and all unrelated uncommitted files.
- Verification evidence (2026-08-10): the focused C8 test first failed on the old implicit-range/C10 page, then passed 4/4 after the page-local projection. Mini Program package tests passed 153/153 across 33 files; typecheck passed. Device screenshot comparison remains unperformed and non-blocking.
