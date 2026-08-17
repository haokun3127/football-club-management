# C16.2 private interest — implementation plan

1. Re-read Figma `93:1238`, inspect source/test, navigate the existing DevTools session to the route, and capture a route-confirmed baseline.
2. Change the C16.2 geometry assertion to require `88rpx` content height and run the target test to observe the expected failure.
3. Apply the minimal WXSS correction; rerun the target test and preserve all no-fabrication assertions.
4. Wait for DevTools rebuild, route-check again, capture strict 375×812 via `PrintWindow`, and compare with `docs/design/reference/figma/c16-2-private-interest.png`.
5. Record runtime evidence and the honest configured-sample versus server-feature-state distinction in `docs/current/progress.md`; run `git diff --check` and one serial root `check`.
6. Stage only C16.2 source/test, progress, and task files; commit/push, then archive and journal in separate bookkeeping commits.

## Validation commands

```powershell
npx --yes pnpm@10.33.0 --dir apps/miniprogram-cq-talent exec vitest run pages/coach/private-interest/index.test.mjs
python apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py --output tmp/coach-runtime-acceptance/C162-acceptance-phone-final.png --logical-width 375 --logical-height 812
npx --yes pnpm@10.33.0 run check
git diff --check
```
