# C16 coach profile visual alignment — implementation plan

**Goal:** Align the C16 coach profile top bar with online Figma and prove it with a real simulator image.

**Architecture:** A WXSS-only geometry correction changes the Figma content height. The existing presentation helper continues to provide native top/right insets, so no API, session, or WXML data contract changes.

**Tech stack:** WeChat Mini Program WXML/WXSS/TypeScript, Vitest, pnpm 10.33.0, WeChat DevTools automator plus `PrintWindow` simulator capture.

## Global constraints

- Figma node `93:1182` is the design authority.
- Do not stage any unrelated dirty file.
- WXML must not call JavaScript array/string methods.
- Visual completion requires a strict 375×812 real simulator screenshot; tests alone are insufficient.

### Task 1: Prove and correct the C16 top-bar height

**Files:**
- Modify: `apps/miniprogram-cq-talent/pages/coach/me/index.test.mjs`
- Modify: `apps/miniprogram-cq-talent/pages/coach/me/index.wxss`

**Interfaces:**
- Consumes: `.c16-bar` rendered by `pages/coach/me/index.wxml` with inline `navInset` and `menuInset`.
- Produces: an 88rpx Figma-content bar with native inset handled outside its declared height.

- [ ] **Step 1: Change only the source-contract assertion to the expected Figma geometry.**

```js
expect(stylesheet).toMatch(/\.c16-bar\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
```

- [ ] **Step 2: Run the targeted test and confirm it fails because production CSS still says `176rpx`.**

Run:

```powershell
npx --yes pnpm@10.33.0 --dir apps/miniprogram-cq-talent exec vitest run pages/coach/me/index.test.mjs
```

Expected: one assertion failure identifying missing `height: 88rpx`.

- [ ] **Step 3: Apply the one-line production correction.**

```css
.c16-bar {
  height: 88rpx;
  box-sizing: content-box;
  padding-left: 32rpx;
}
```

- [ ] **Step 4: Re-run the same targeted test.**

Run the Step 2 command. Expected: all C16 tests pass.

### Task 2: Prove runtime geometry and close the task

**Files:**
- Create (ignored local evidence): `tmp/coach-runtime-acceptance/C16-acceptance-phone-final.png`
- Create (ignored local evidence): `tmp/coach-runtime-acceptance/C16-acceptance-compare-final.png`
- Modify: `docs/current/progress.md`
- Modify: `.trellis/tasks/08-17-coach-c16-runtime-visual/*`

**Interfaces:**
- Consumes: foreground WeChat DevTools iPhone X simulator and a service-confirmed coach session.
- Produces: runtime screenshot evidence and a concise progress record.

- [ ] **Step 1: Navigate the existing DevTools session to `/pages/coach/me/index`, wait for the ready state, and capture with the foreground screen-capture scripts.**

Run the repository capture chain with `MP_AUTO_PORT=9420`; preserve the original simulator window and never kill or relaunch DevTools.

- [ ] **Step 2: Check that the resulting phone crop is exactly 375×812 and compare its vertical landmarks with Figma.**

Expected: the pink bar ends at Figma's bar boundary; profile card starts after the intended body padding; tabbar remains visible. Native capsule and live-data text may differ.

- [ ] **Step 3: Run the full repository gate.**

```powershell
npx --yes pnpm@10.33.0 run check
```

Expected: exit code 0.

- [ ] **Step 4: Record the evidence and prepare a path-limited commit only if the full gate exits 0.**

The `tmp/` evidence is ignored and remains local; record its paths in `docs/current/progress.md` instead of force-adding it. With the full gate exiting 0, stage only the C16 page/test, task artifacts and `docs/current/progress.md`; inspect `git diff --check`, commit using the established `fix(coach): align C16 coach profile runtime` style, then push `dev` to `origin`. Run no second root gate until the first has exited: parallel SQLite workers can cause artificial reopen timeouts.
