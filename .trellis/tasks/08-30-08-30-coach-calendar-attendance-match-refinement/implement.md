# 双端日历、出勤、比赛与演示数据收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让双端关键演示流程按在线 Figma 可稳定运行，且全部从真实接口和可读演示数据驱动。

**Architecture:** 复用现有页面和 API 契约，以页面 view model 处理视觉字段。按日历、出勤、比赛/战术板、演示数据四批实施，任一批的 API 重读和真实模拟器截图通过后再进入下一批。

**Tech Stack:** TypeScript、WXML、WXSS、Vitest、Node、微信开发者工具 MCP、Docker Compose API。

## Global Constraints

- Online Figma `zZ6wKyOHKcO4UYXDd9jGwv` is authoritative.
- WXML has no JS method calls; all display fields are precomputed in TypeScript.
- Stage exact paths only; never use `git add -A`.
- No secrets, phone numbers, tokens or database paths in output, code, docs or commits.
- Every production data write is backed up first, then API restart and readback are mandatory.

### Task 1: 双端日历与家长 TabBar 运行态收口

**Files:**
- Modify if needed: `apps/miniprogram-cq-talent/pages/parent/schedule/index.ts`, `index.wxml`, `index.wxss`
- Modify if needed: `apps/miniprogram-cq-talent/pages/coach/schedule/index.ts`, `index.wxml`, `index.wxss`
- Modify if needed: `apps/miniprogram-cq-talent/components/role-tabbar/index.ts`, `index.wxml`, `index.wxss`
- Test: `apps/miniprogram-cq-talent/pages/parent/schedule/month-v2.test.mjs`, `apps/miniprogram-cq-talent/pages/coach/schedule/index.test.mjs`, `apps/miniprogram-cq-talent/components/role-tabbar/index.test.mjs`

- [ ] Write failing tests asserting the collapsed control uses a centered 16rpx image inside a separate affordance, and parent tabs are `日程/成长/发现/我的孩子`.
- [ ] Run only those tests and confirm each failure reflects the missing behavior, not test setup.
- [ ] Make the smallest view-model/WXML/WXSS adjustment; preserve date range APIs and arrow semantics.
- [x] Run the focused tests, mini-program TypeScript check, WXML/WXSS compilation, `git diff --check`, then capture P1/C1 at 375×812 and exercise previous/next week, expand, month change, date selection and collapse.
- [ ] Commit only changed Task 1 paths.

### Task 2: C2 点按出勤与训练/比赛区分

**Files:**
- Modify if needed: `apps/miniprogram-cq-talent/pages/coach/event/index.ts`, `index.wxml`, `index.wxss`
- Modify if needed: `apps/miniprogram-cq-talent/pages/coach/schedule/index.ts`, `index.wxml`, `index.wxss`
- Test: `apps/miniprogram-cq-talent/pages/coach/event/index.test.mjs`, `apps/miniprogram-cq-talent/pages/coach/schedule/index.test.mjs`

- [x] Write failing tests for `displayName` truncation, direct avatar toggle behavior, and preservation of untouched RSVP statuses.
- [x] Run the C2/API adapter tests and confirm RED: the old page converted untouched rows to `absent`, while the adapter collapsed `confirmed`/`invited` to non-writable `pending`.
- [x] Implement the smallest view-model and transport correction; do not reintroduce status workflows,销课, or “查看详情”.
- [x] Keep existing focused tests for the training/match visual distinction and C6 route entry.
- [x] Run focused tests, mini-program type/compile gate, `git diff --check`, then click a present avatar in real C2 and verify write/readback while untouched RSVP rows remain unchanged.
- [ ] Commit only changed Task 2 paths.

### Task 3: C6 比赛录入与 C7 战术板读写

**Files:**
- Modify if needed: `apps/miniprogram-cq-talent/pages/coach/match/**`, `pages/coach/match-edit/**`, `pages/coach/match-event-add/**`, `pages/coach/tactical-board/**`
- Test: `apps/miniprogram-cq-talent/pages/coach/match/index.test.mjs`, `pages/coach/match-edit/index.test.mjs`, `pages/coach/match-event-add/index.test.mjs`, `pages/coach/tactical-board/index.test.mjs`

- [x] Run targeted C6/C7 tests first and record existing results.
- [ ] If a routing/event-save behavior is missing, add one failing test per behavior: direct entry to full-screen record form, event type/actor/assist or fault persistence, and saved C7 board reload.
- [ ] Implement only failures discovered from the running page and real API readback.
- [ ] Build/restart local API when its contract changes; on production use backup → deploy → restart → readback.
- [x] Capture C6/C7 real 375×812 evidence. C7 runtime verification exposed a 19-player roster overlap: the fixed 520px `movable-area` clipped lower rows when `out-of-bounds=false`. The page now derives `workspaceHeight` from the precomputed roster row count; 19 players use 787px and retain distinct roster coordinates. A regression test covers the final row.
- [x] Back up production before the C7 write, save one minimal real position change, restart the API, and reopen the same board. The saved normalized position and the 19-player / 11-starter / 8-substitute composition persisted across restart. Evidence screenshots: `tmp/c7-before-save-2026-08-30.png` and `tmp/c7-after-restart-readback-2026-08-30.png` (both 375×812).
- [ ] Commit only changed Task 3 paths after the final repository gate.

### Task 4: 七账号近三周中文演示数据审计与补齐

**Files:**
- Modify if needed: controlled scripts under `tmp/prod-verify/` and the API seed source they explicitly use
- Modify: current task record and `docs/current/progress.md` only when the audit is complete

- [x] Execute a read-only aggregate audit for the seven pre-authorized accounts without printing raw phone numbers.
- [x] Verify each account has three consecutive recent weeks of Chinese training/match/attendance/assessment/tactical data and check data relationships (event roster → attendance → match events → tactical board).
- [ ] For each detected gap, write a failing audit assertion, back up production data, add the minimal deterministic data, deploy/restart API, and re-run audit/readback.
- [ ] Record only count/range/account-index evidence in docs; never include sensitive values.
- [x] Run `npx --yes pnpm@10.33.0 run check` and `git diff --check`; stage only exact updated source/docs paths for the pending documentation commit.

#### 2026-08-30 legacy venue compatibility release

- [x] Release the legacy `location_id` compatibility repair after a restricted SQLite backup, then run confirmed importer refresh and restart the API.
- [x] Run the aggregate seven-slot audit after release. The initial false failure was traced to a prefix-only activity query that included another team's old rows; audit scope is now `club_id + primary_team_id + controlled ID namespace`.
- [x] Re-run read-only audit: all seven slots have known Chinese venues and all required aggregate data.

## Final Integration Check

- [x] Re-read each acceptance criterion in `prd.md` against current code, API readback and simulator evidence.
- [x] Run repository gate `npx --yes pnpm@10.33.0 run check` and `git diff --check`.

## 2026-08-30 runtime acceptance addendum

- Current online Figma was re-read before the audit: C1 `1293:8`, C2 `93:606`, C6 `93:796`, and C7 `1040:9`. Parent navigation remains `日程 / 成长 / 发现 / 我的孩子`.
- Real `375×812` WeChatIDE MCP evidence was refreshed for parent P1 (collapsed and month-expanded), coach C1 (month-expanded), C2 workbench, C6 match detail, C6 score editor, C6.1 event editor, and C7. The C2 route was exercised by toggling one avatar to absent, reopening it to prove API readback, then restoring it to present and reopening again.
- A production 403 observed while opening legacy unit-test fixture IDs was investigated through the simulator network log. The API correctly rejected a current scoped coach session for an unrelated historical event. Runtime checks must use activity IDs supplied by that signed-in coach's current schedule; do not weaken event-access authorization or treat the 403 as a page-rendering failure.
- Read-only seven-slot audit passed with no identity data in output: all slots have a three-week rolling window, Chinese display copy, nineteen-player coaching scope, two guardian children, assessments/radar, two matches/eight match events, and an eleven-starter/eight-substitute tactical board.
- [x] Update task artifacts and current progress without staging unrelated dirty files.

## 2026-08-31 C2 attendance persistence hardening

- Root cause: C2 posts the complete roster to the real attendance endpoint. The previous page implementation converted every non-green display row to `absent`, so clicking one avatar could rewrite untouched RSVP rows. The mini-program adapter also turned valid backend `confirmed`/`invited` values into display-only `pending`, which its own save normalizer rejects.
- Correction: C2 now submits each row's semantic status unchanged except for the tapped row; the adapter preserves `confirmed` and `invited` and accepts them for the complete-roster write contract. The presentation remains intentionally binary: only present/late are green; RSVP rows are grey.
- Evidence: two new API-adapter tests were first red, then the targeted C2/API suite passed `31/31`; mini-program TypeScript, C2 WXML, C2 WXSS, and the scoped diff check passed. Real WeChatIDE MCP at `375×812` showed the 19-member four-column grid, then a single tap persisted one present member as absent while the eleven untouched confirmed members remained confirmed after reopening.
- Production demo integrity: the controlled demo activity was restored through a restricted backup, API restart, HTTPS health recovery, and aggregate readback. Final baseline contains 19 participants: 6 present, 2 late, and 11 confirmed. No identity data, sessions, credentials, or database locations are recorded here.
