# 点名即扣课，移除课时更正流程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点名成为唯一课时完成动作，旧销课/更正体系不再可以写入或被正常用户访问。

**Architecture:** `recordEventParticipants()` 是唯一账务 owner。attendance 路由保存当前名单并同步固定 attendance source；legacy lesson 路由统一返回 410；前端遗留 route 做无 API 的兼容跳转。

**Tech Stack:** TypeScript、Fastify、持久化 store、Vitest、微信小程序、WeChatIDE MCP。

## Global Constraints

- Figma `zZ6wKyOHKcO4UYXDd9jGwv` 是唯一设计来源，正式点名板为 `93:665`。
- 必须 RED → GREEN；无失败测试不得修改生产代码。
- WXML 禁 JavaScript 方法调用，展示字段预计算。
- 限定路径暂存，禁止 `git add -A`；不包含其他 dirty paths。

### Task 1: 对齐 attendance 课时账本

**Files:** `apps/api/test/server.test.ts`, `apps/api/src/store.ts`

- [x] 写失败测试：同一活动/学员首次 `present` 后只有一条 `sourceId === "${eventId}-${studentId}"` 的 attendance debit；重复 `present` 后条数与余额不变；提交 `absent` 后该 source 不再计入余额。
- [x] Run: `npx --yes pnpm@10.33.0 --filter @football-club/api test -- server.test.ts`，确认 RED 仅因 present→absent 未撤销 attendance source。
- [x] 在 `PersistentApiStore.recordEventParticipants()` 按最终 participant status 对齐固定 attendance source；不得修改或删除 `app-client-lesson-*` 历史 source。
- [x] 重跑测试确认 GREEN；运行 `git diff --check`；仅暂存这两个 API 文件。

### Task 2: 关闭 legacy lesson API 和 lesson 待办

**Files:** `apps/api/test/server.test.ts`, `apps/api/src/routes/app-client.routes.ts`, `apps/api/src/store.ts`

- [x] 写失败测试：`GET`、`POST`、`PATCH /lesson-confirmation` 都断言 HTTP 410 和 `{ code: "legacy_lesson_flow_retired" }`；教练 home/task 响应不包含 `action: "lesson"` 或“确认销课”。
- [x] 运行同一 API 测试，确认旧端点仍可读写或 task builder 仍返回 lesson 而失败。
- [x] 旧端点在授权后统一返回 `context.sendError(reply, 410, "legacy_lesson_flow_retired", "请通过点名完成课时同步")`，不触发旧 store 写入；移除 `pendingLessonConfirmation` 的任务分支。
- [x] 重跑测试，build/restart 本地 API，`/health` 成功后继续；仅暂存本批 API 路径。

### Task 3: 点名页面收口和旧链接兼容

**Files:** `apps/miniprogram-cq-talent/pages/coach/attendance/**`, `pages/coach/event/**`, `pages/coach/lesson/**`, `pages/coach/lesson-correction/**`, `pages/coach/lesson-detail/**`, `pages/coach/lesson-history/**`

- [x] 写失败测试：C4 不暴露 `lessonAction`、待确认文案或 correction mode；C2 action map 不包含 lesson；有 ID 的 legacy route 调 `wx.redirectTo('/pages/coach/attendance/index?id=...')`，history 调 `wx.reLaunch('/pages/coach/schedule/index')`，且不调用 legacy API。
- [x] Run: `npx --yes pnpm@10.33.0 --filter @football-club/miniprogram-cq-talent test -- pages/coach/attendance/index.test.mjs pages/coach/event/index.test.mjs`，确认 RED。
- [x] C4 只保留点名、已到/未到汇总和提交。C2 保持直接点头像和失败回滚，但不生成 lesson action。legacy page `onLoad` 首行完成兼容跳转并停止旧数据读取；保留 `app.json` route 登记。
- [x] 重跑小程序定向测试、TypeScript、WXML、WXSS 编译和 `git diff --check`。
- [x] 用 WeChatIDE MCP 在严格 375×812 获取 C2 点按、C4 提交和一个旧 route 跳转；图片写 `%TEMP%\\cq-talent-visual-evidence`。

### Task 4: 最终核验和提交计划

- [x] Run: `npx --yes pnpm@10.33.0 run check`；全仓通过（domain `21/21`、小程序 `442/442`、API `123/123`），未出现既有 API fixture 失败。
- [x] 复核唯一 attendance source、410 legacy API、无 lesson task、C2/C4 UI、legacy redirect、Figma 节点与运行截图。
- [x] 更新任务记录与 `docs/current/progress.md`；提交前仍须按路径限定暂存，默认不 push。
