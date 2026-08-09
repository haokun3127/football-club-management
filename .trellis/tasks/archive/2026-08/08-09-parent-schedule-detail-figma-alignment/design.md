# Technical design

`getParentActivityDetail` is the data boundary. It must normalize a successful API response and rethrow request failures. `pages/parent/event` owns all view models and uses `status-view` for error/loading states. CODE frames specify fields only when response-backed; P nodes define visual layout. No additional route or backend contract is introduced.

## Allowlist

- `apps/miniprogram-cq-talent/utils/api.ts`
- `apps/miniprogram-cq-talent/utils/api.test.mjs`
- `apps/miniprogram-cq-talent/pages/parent/event/index.{ts,wxml,wxss,test.mjs}`
- This task directory

Rollback is the single B3 work commit only.
