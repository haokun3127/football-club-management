# C16.1 permission scope — implementation plan

1. Re-read online Figma node `93:1210`, inspect the route WXML/WXSS/test and capture the current real simulator baseline.
2. Change only the C16.1 source-contract test to demand `height: 88rpx`, `box-sizing: content-box`, and `padding-left: 32rpx`; run the target Vitest file and record its expected failure.
3. Apply the corresponding three-declaration WXSS correction. Re-run the target test and confirm the permission projection/no-side-effects coverage remains green.
4. Capture the live route with the current DevTools `PrintWindow` tool. Verify exactly 375×812, create a local Figma comparison image, and classify the empty-state-versus-configured-sample content difference as data-driven rather than a layout defect.
5. Update `docs/current/progress.md` and task evidence records. Run `git diff --check`, then one fully serial root `npx --yes pnpm@10.33.0 run check` and wait for the actual exit code.
6. Use path-limited staging, commit the scoped C16.1 files, task records, and progress entry, push to `origin/dev`, then archive and journal the task in separate bookkeeping commits.

## Validation

```powershell
npx --yes pnpm@10.33.0 --dir apps/miniprogram-cq-talent exec vitest run pages/coach/permissions/index.test.mjs
python apps/miniprogram-cq-talent/scripts/devtools-simulator-capture.py --output tmp/coach-runtime-acceptance/C161-acceptance-phone-final.png --logical-width 375 --logical-height 812
npx --yes pnpm@10.33.0 run check
git diff --check
```

## Rollback

Revert only the C16.1 navigation declaration change from its own commit. Do not alter server-side role entrypoints to make a configured Figma sample appear.
