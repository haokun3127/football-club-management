# Coach C16.4 runtime visual alignment

## Goal

Align `pages/coach/help/index` with the live C16.4 Coach Help design at Figma file `zZ6wKyOHKcO4UYXDd9jGwv`, node `93:1286`, using a real 375×812 WeChat DevTools simulator capture.

## Confirmed facts

- The live Figma node specifies an 88px pink top-navigation region. Its search bar begins immediately below that region.
- The runtime baseline captured on 2026-08-17 has `c164-nav` at `height: 176rpx` with `box-sizing: content-box` and inline `navInset` padding. The search bar is visibly pushed below the Figma composition.
- The page's FAQ categories and questions come from the real `/content/faqs` response. Their data values may differ from Figma's sample content and must not be replaced with fabricated sample data.
- The DevTools screenshot script previously ran inside the mini-program root and generated `scripts/__pycache__`; WeChat ignores that reserved-directory content. Screenshot invocations must use Python bytecode suppression and the existing cache directory must be removed.

## Requirements

- Keep the custom top navigation, back action, FAQ loading, local search/filter, expansion behaviour, unavailable-support copy, and coach tab bar intact.
- Make the smallest top-navigation geometry change that restores the Figma vertical composition in the 375×812 simulator capture.
- Add a regression assertion for the intended safe-area-compatible navigation height before changing the production WXSS, observe that assertion fail against the baseline, then make it pass.
- Remove only the generated `apps/miniprogram-cq-talent/scripts/__pycache__` cache directory and prevent its re-creation during this acceptance workflow; do not edit `project.config.json`.
- Do not add sample customer-service actions, contact details, official-account behaviour, fake API fields, or unrelated visual refactors.

## Acceptance Criteria

- [x] Targeted C16.4 test first fails on the old `176rpx` navigation contract and passes after the scoped correction.
- [x] The runtime screenshot is a genuine 375×812 simulator image and the top-navigation/search-bar vertical structure matches live Figma node `93:1286`; data-only FAQ differences are explicitly recorded as exempt.
- [x] `apps/miniprogram-cq-talent/scripts/__pycache__` is absent after capture, and the WeChat reserved-directory warning no longer has an in-project cache directory to report.
- [x] The C16.4 targeted test, miniprogram typecheck, `git diff --check`, and serial root quality gate pass.
- [ ] Only task records, C16.4 source/test, and the necessary progress evidence are staged in this task's commit.
