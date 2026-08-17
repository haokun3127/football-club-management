# C15.1 implementation plan

1. Re-read Figma node `93:1163`, navigate with a real C15-compatible route, and capture a 375×812 baseline.
2. Separate real route-data differences from visual implementation defects.
3. Add a focused failing test before each page-local correction, then run it green.
4. Run targeted test, miniprogram typecheck, `git diff --check`, root check, and a fresh runtime recapture.
5. Update progress/evidence, commit only C15.1 task/page paths, push, and archive the task.
