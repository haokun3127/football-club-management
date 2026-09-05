# “点名即销课”现状数据流调查（2026-08-31）

## 已确认的现状

1. 教练工作台 `apps/miniprogram-cq-talent/pages/coach/event/index.ts` 当前已将常规入口收敛为直接点名：`toggleAttendance` 只调用 `saveCoachAttendance`，并且 `buildActionCards` 不再加入独立 `lesson` 卡片。
2. 点名页 `apps/miniprogram-cq-talent/pages/coach/attendance/index.ts` 当前通过 `PUT /coach/events/:eventId/attendance` 保存参与人状态，提交成功后进入 `attendance-success`。
3. 课时确认页 `apps/miniprogram-cq-talent/pages/coach/lesson/index.ts` 仍通过 `GET workbench` + `GET lesson-confirmation` 读取，并通过 `POST /lesson-confirmation` 写入扣课台账；页面文案仍是“销课处理 / 待处理销课”。
4. 后端 `apps/api/src/routes/app-client.routes.ts` 仍保留独立的 `GET/POST/PATCH /coach/events/:eventId/lesson-confirmation` 契约。当前点名 `PUT /attendance` 路由本身只调用 `recordEventParticipants`，没有在该路由内触发 `recordLessonAdjustment`。
5. `utils/api.ts`、`utils/types.ts`、任务列表和部分测试仍保留 `lesson` 任务动作与 `pendingLessonConfirmation` 字段；这些是旧流程残留，不能直接当作当前产品入口。

## 当前根因判断

“点名即销课”尚未成为跨层统一契约。前端工作台的视觉入口已经接近目标，但实际扣课仍依赖另一个页面和接口，因此页面、任务状态和真实台账存在两套语义。

## 待用户确认的产品边界

- 是否保留历史记录与纠正能力：建议保留，但将其改名为“点名记录/出勤纠正”，纠正点名时由同一业务链反向修正对应课时台账；不再暴露“销课处理/课时确认”作为日常入口。
- 若确认保留，旧 `/lesson-confirmation` 接口可先作为兼容层，新增或调整 attendance 写入事务，待迁移完成后再评估废弃接口；不能在没有迁移和回归验证前直接删除。
