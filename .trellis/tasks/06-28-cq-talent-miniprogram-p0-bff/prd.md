# 重庆天才小程序 P0 BFF

## Goal

补齐重庆天才小程序发布前仍缺的 P0 app-client BFF。小程序只能走 `clientKey/appId -> resolve -> capabilities -> /clubs/:clubId/app-clients/:clientId/...`，不得调用 admin API，不得依赖前端硬编码 WPS 字段、评测字段或课时规则。

## Current Evidence

已验证可用：

- `GET /app-clients/resolve?clientKey=cq-talent-wechat-main`
- `GET /clubs/:clubId/app-clients/:clientId/parent/children`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/status-summary`
- `GET /clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary`
- `GET /clubs/:clubId/app-clients/:clientId/coach/home?date=2026-06-28`
- `GET /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench`
- `PUT /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance`
- `GET/POST/PATCH /clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation`
- `POST /clubs/:clubId/app-clients/:clientId/coach/matches`
- `POST /clubs/:clubId/app-clients/:clientId/coach/assessments`

200 人验收数据已在本地 dev seed 中可读，dev 家长 `user-parent-cq-talent-acceptance` 绑定 200 名重庆天才导入学员。

## Required P0

1. 生产微信登录与手机号匹配。
2. 家庭聚合日程。
3. 训练内容树。
4. 活动训练内容保存。

## Acceptance Criteria

- 生产 UI 不允许用户选择家长/教练身份；role 必须由登录匹配结果决定。
- 登录失败、手机号未匹配、手机号多身份冲突、禁用账号都有明确错误码。
- 家庭聚合日程按 parent-child binding 裁剪，不泄露其他孩子。
- 训练内容树由后端按 capabilities/评测图谱输出，不让小程序硬编码重庆天才评测字段。
- 训练内容保存支持 `Idempotency-Key`，只允许有权限的教练写入权限范围内活动。
- OpenAPI/schema/test 同步更新。
