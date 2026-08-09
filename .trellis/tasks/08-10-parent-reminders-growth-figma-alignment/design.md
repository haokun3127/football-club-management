# Technical design

The batch stays inside `parent/reminders` and `parent/growth`. Existing API clients remain source-of-truth; local read state is a device-only UI affordance. Pages must expose empty/unavailable states when P3/P4 design examples have no equivalent API contract.

## Allowlist

- `apps/miniprogram-cq-talent/pages/parent/reminders/index.{ts,wxml,wxss,test.mjs}`
- `apps/miniprogram-cq-talent/pages/parent/growth/index.{ts,wxml,wxss,test.mjs}`
- `apps/miniprogram-cq-talent/utils/{api.ts,api.test.mjs,types.ts}` only if a focused test proves a contract/view-model gap
- this task directory
