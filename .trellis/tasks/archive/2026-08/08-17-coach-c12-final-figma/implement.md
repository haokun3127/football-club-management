# Implementation plan — Coach C12/C12.1 final alignment

1. Confirm online Figma nodes `93:1030` and `93:1061`, the local reference PNGs, prior C12 task records, current page controller/template/styles, and the existing real assessment/draft contract.
2. Add focused failing test assertions for `navTitle` during normal and draft-resume states, C12.1 continuation restoration, content-box nav, and the 44rpx C12 body/submit gutters.
3. Implement only the presentation changes in `pages/coach/test-entry/index.ts`, `index.wxml`, and `index.wxss`; do not alter API imports, draft helper calls, field navigation, or submit payload construction.
4. Run the focused page test, mini-program typecheck, `git diff --check`, and `npx --yes pnpm@10.33.0 run check`. Attempt a runtime image only if the user-visible DevTools bundle is freshly compiled; record exact evidence.
5. Update `docs/current/progress.md` and C12/C12.1 design specs, then stage only this page/test/task/doc scope, commit, push, and archive this task.

## Risk points and rollback

- Do not reset or mutate drafts merely to select a presentation title.
- Keep the menu inset on the right action and do not reintroduce a fixed 176rpx border-box header.
- Preserve 375px horizontal input behaviour and the existing real `testItemId` binding.
- Revert the isolated follow-up commit if any safe-area regression appears.
