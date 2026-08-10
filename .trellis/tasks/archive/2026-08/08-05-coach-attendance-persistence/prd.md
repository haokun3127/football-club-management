# Coach attendance persistence

## Goal

Persist coach attendance participant updates to SQLite and prove write-restart-readback without touching unrelated worktree changes.

## Requirements

- 复用 `0002_data_capability_foundation.sql` 已有 `calendar_events` 与 `event_participants` 表，不新增或修改 migration。
- 教练签到 PUT 契约保持不变：`PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance`，请求为 `{ participants: [{ studentId, status, note? }] }`，状态集合为 `invited|confirmed|present|absent|late|leave_requested|excused`，响应保持 `{ clubId, client, eventId, participants }`。
- 文件型 SQLite 下保存签到 `status` 与非空 `note` 后，关闭 app/database，以同一路径 `seed:true` 重建，再读取时状态、备注和其他 participant 均保持；同一自然键仅保留一行。
- 保留 coach 权限、parent/无范围 coach 拒绝、相同 `Idempotency-Key` 幂等、冲突 payload `409`，以及 `present/late` 课时 debit 的 `sourceId`。
- `PersistentApiStore` 的签到 participant 写读、event detail 和 student timeline 必须走 SQLite repository；seed 使用 insert-if-absent，不覆盖既有签到状态或备注。
- 小程序只调整 `utils/api.ts` 与对应 `api.test.mjs` 的 workbench roster `participant.status`/`note` 规范字段映射；不修改签到页面 WXML/WXSS/index.ts。

## Acceptance Criteria

- [x] RED：文件型 SQLite 重启回读测试在旧实现下失败，证明签到只留在内存。
- [x] GREEN：repository、platform seed 和 `PersistentApiStore` 接入后，目标 persistence/server 测试通过。
- [x] API build 后，以已确认 PID 安全停止服务，用同一 `DATABASE_URL` 启动 `dist/index.js`，GET/readback 保留 `status` 与 `note`。
- [x] API typecheck/build、API persistence/server tests、小程序 test/typecheck、`git diff --check` 通过；不笼统报告全仓通过，并保留两个已知 fixture 差异。
- [ ] C4 真实 coach 会话回读状态与备注；无可信 375×812 截图时明确视觉验收未完成。
  API 层状态/备注读回已验证，但 DevTools/真机视觉验收仍待完成。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
