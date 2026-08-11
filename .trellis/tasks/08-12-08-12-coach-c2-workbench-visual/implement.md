# C2 implementation plan

1. Add a failing C2 test asserting the online Figma in-flow tab strip and
   neutral icon-led action tiles; retain assertions preventing unsupported
   timer/finish/sample values.
2. Replace the C2 page-local navigation/template/style composition only.
   Wire the existing `openCoachRoot` handler to its three allowlisted routes.
3. Update the action-card view model with precomputed verified local icon
   paths; do not change the API or action routing.
4. Run the focused C2 test and mini-program typecheck. Then run the root
   check and `git diff --check`.
5. Record Figma/data/visual-evidence boundaries in progress and commit only
   this page, its task, and documentation.

## Execution record

- RED: the C2 focused test failed because the existing page still had a fixed
  bottom `role-tabbar`, no in-flow route tabs, and coloured action tile
  variants.
- GREEN: C2 now renders only its page-local Figma tab strip, uses the existing
  allowlisted `openCoachRoot` handler, and projects a verified local icon for
  each already-authorized action. API inputs, workbench action availability,
  and action routes were not changed.
- Checks: focused C2 Vitest `8/8`, mini-program typecheck, root check
  (domain `19/19`, mini-program `306/306`, API `85/85`), and `git diff --check`
  passed. The current simulator is unauthenticated, so the batch has no new
  coach runtime screenshot and does not claim visual acceptance.
