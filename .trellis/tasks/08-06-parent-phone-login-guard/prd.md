# Parent phone authorization single-flight guard

## Goal

Prevent repeated native `getPhoneNumber` calls during one physical login attempt while preserving the real WeChat login, role, session, and `binding_required` contracts.

## Scope

- `apps/miniprogram-cq-talent/pages/login/index.ts`
- `apps/miniprogram-cq-talent/pages/login/index.wxml`
- `apps/miniprogram-cq-talent/pages/login/index.test.mjs`

No API, database, seed, role, session, Figma, or unrelated worktree changes.

## Acceptance criteria

- Synchronous instance-level lock is acquired at the touch entrypoint before the native authorization call.
- The callback checks the same lock and ignores duplicate callbacks without calling `wx.login`, `wechatLogin`, or navigation twice.
- Empty code, cancellation, missing login code, and native frequency errors do not auto-retry; only explicit user retry releases the lock.
- `binding_required` and authenticated parent with no children remain restricted; no session or role is fabricated.
- Error UI uses fixed safe states and never renders raw error messages, phone numbers, tokens, or response payloads.
- Login tests run RED then GREEN, followed by mini-program test, typecheck, and diff check.
