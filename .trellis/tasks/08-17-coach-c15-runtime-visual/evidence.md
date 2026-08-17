# C15 evidence

- Online visual authority reread on 2026-08-17: `zZ6wKyOHKcO4UYXDd9jGwv / 93:1132`; current online frame is 375×1002.
- Baseline and final screenshots used the visible DevTools screen-pixel channel with `source: print_window`, output 375×812.
- Final runtime screenshot: `tmp/coach-runtime-acceptance/C15-acceptance-phone-final.png`.
- Final comparison: `tmp/coach-runtime-acceptance/C15-acceptance-compare-final.png`.
- Corrected implementation differences: duplicated custom-header height, fixed bottom controls covering first viewport, native slider chrome/row height, and missing real team label.
- Deliberate data differences: Figma's three sample students, six sample metrics, and filled scores are not injected. The authenticated production form currently returns two students, seven real metrics, real team name, and no draft values.
- Automated evidence: C15 and role-tabbar targeted tests passed 332/332; miniprogram typecheck and scoped `git diff --check` passed before repository gate.
