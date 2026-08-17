# C15 implementation plan

1. [x] Re-read online Figma node `93:1132`, route C15 using a planted real coach session and a real template id, then capture a strict 375×812 runtime baseline with `devtools-simulator-capture.py`.
2. [x] Compare the baseline with the Figma export and classify differences as data-only, native-control-only, or implementation defects.
3. [x] Add narrowly targeted failing page/component tests for each reproducible implementation defect; make the smallest C15-local change that makes them pass.
4. [x] Verify targeted Vitest, miniprogram typecheck, `git diff --check`, and root `npx --yes pnpm@10.33.0 run check`.
5. [x] Rely on the DevTools hot compile, recapture 375×812, create a side-by-side comparison, then commit only C15 code, tests, and task artifacts with explicit `git add` paths and push.

## Rollback point

If the real data path or slider behavior regresses, revert the single C15 commit rather than altering shared API or component contracts.
