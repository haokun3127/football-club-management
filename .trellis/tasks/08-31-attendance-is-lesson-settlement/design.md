# 点名即扣课，移除课时更正流程 — 设计

## Boundary

本任务仅收口出勤、课时账本、教练待办和旧路由。不重写赛事、训练计划、评测、战术板、认证或生产演示数据。历史 `lesson_credit_ledger` 记录保留，但小程序正式流程不再新增独立 lesson-confirmation 记录。

## User Flow

1. 教练从日程或训练工作台进入点名。C4 显示“点名”，C2 保持四列头像；绿色勾为已到、灰色为未到。
2. 教练点头像时，前端只调用 `PUT /coach/events/:eventId/attendance` 保存整份当前名单；失败立即恢复点击前的 view model。
3. store 以当前名单为唯一事实：`present`/`late` 确保一条 `attendance` 来源扣课；其他状态撤销这一来源。重复点名不会叠加扣课。
4. 教练首页任务不再产生 `lesson`。旧销课页面带 ID 时跳到点名；历史页回到日程。旧 API 返回 `410 legacy_lesson_flow_retired`。

## Cross-layer Contract

`C2/C4` → `updateCoachAttendance` → attendance route → `recordEventParticipants` → participant snapshot + attendance ledger reconciliation → workbench/home read model。

账务 owner 只有 store：前端不推算余额，路由不直接写 ledger。固定 source 为 `attendance` 和 `${eventId}-${studentId}`。到课时保持 `debit/-1`；未到时移除或逻辑撤销该 source，使余额读取不再计入它。历史 `app-client-lesson-*` 不删除，但新代码绝不写入。

## Figma Contract

- 正式点名板：`4:7 / 93:665 / C4 点名（点名即扣课）`，文案为“点名”“已到”“未到”“点名即扣课”。
- C2 快速点按板：`93:606`。
- C5 `537:2`、C5.1 `93:765`、历史 `537:79`、详情 `537:156` 已作为历史归档；不再映射为当前路由验收。

## Error and Rollback

- C2 请求期间防重复点按；失败回滚。C4 保存失败保留当前编辑数据。
- 旧路由缺少活动 ID 时不调 API，直接回日程。
- 每个逻辑批次独立提交；默认不部署生产。若 API 有变化，先 build/restart 再运行小程序验证。
