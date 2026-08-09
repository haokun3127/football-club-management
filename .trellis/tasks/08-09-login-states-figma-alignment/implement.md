# Execution plan

1. Re-read the four exact Figma nodes and inspect the page-owned source and current focused tests.
2. Add focused failing tests for each repaired presentation or navigation contract. Run them and record the expected RED result.
3. Apply the smallest page-local WXML/WXSS/TypeScript changes that make those tests pass, preserving all real auth and parent-child data flows.
4. Run focused tests, Mini Program package tests, TypeScript check and `git diff --check`.
5. Perform a code review against this task and the Figma nodes. Do not call static checks or an emulator screenshot a claim of pixel-perfect visual acceptance.
6. Update task records, explicitly stage only B1-owned paths, and make a standalone commit after review.

## File allowlist

- `apps/miniprogram-cq-talent/pages/launch/index.{ts,wxml,wxss}`
- `apps/miniprogram-cq-talent/pages/login/index.{ts,wxml,wxss}`
- `apps/miniprogram-cq-talent/pages/parent/binding/index.{ts,wxml,wxss}`
- Page-owned tests created or updated for these routes
- `.trellis/tasks/08-09-login-states-figma-alignment/**`

No other path is in scope without a revised plan and review.
