# API 契约基线

## Club scope

业务接口以 `/clubs/:clubId` 作为租户边界。前端必须从当前用户的 active membership 选择 `clubId`，不要缓存或拼接其他俱乐部 ID。

`clubId` 用于：

- 解析当前用户在该俱乐部的 membership。
- 过滤活动、球队、比赛、评测、指标等业务数据。
- 校验 request body 中嵌套的 `studentId`、`teamId`、`coachId`、`eventId` 是否属于同一俱乐部。

## Role baseline

| 角色 | 访问边界 |
| --- | --- |
| admin/operator | 俱乐部管理写入，包括球队、队员、活动、训练、比赛、评测和指标计算。`owner`、`admin`、`operator` 都按 admin baseline 处理。 |
| coach | 可读取俱乐部训练数据，可写入活动、训练、比赛、评测和指标计算；不能管理球队基础档案和队员关系。 |
| parent | 可读取俱乐部公开目录和日历；学生个人时间线、指标只限 guardian binding 绑定的学生；不能写入训练、比赛、评测或派生指标。 |

## 微信手机号登录契约（当前客户端）

```text
POST /clubs/:clubId/app-clients/:clientId/wechat-login
```

- `wxLoginCode` 必填，`phoneCode` 可选；`roleHint` 不是可信身份来源，不能决定访问权限或前端分流。
- 返回 `binding_required` 时，`role`、`session`、`profile` 都为 `null`；只能提示核对登记手机号，不能伪造角色、手机号或 session。
- 只有返回 `authenticated`、真实 `role`、`session` 和 `profile` 后，客户端才可按 parent/coach 分流。
- 正式微信 connector 依赖服务器 `WECHAT_MINIPROGRAM_APP_ID` 与 `WECHAT_MINIPROGRAM_APP_SECRET`。本地 `x-user-id` smoke 只验证 API 边界，不能代替真实微信登录。

## Auth headers

> 2026-08-12 安全边界：生产/release 的业务 app-client API 只接受经校验的 `Authorization: Bearer <app-client-session>` 身份。`X-User-Id` 不是生产认证方式，反向代理不得依赖、注入或转发它来建立身份。

`x-user-id` 仅限显式启动的本地开发/测试 API（`apps/api/src/dev.ts`）做隔离 smoke。它不能发送到公网域名，也不能替代真实微信登录、Bearer session 或真机验证。

无论身份来自已校验 Bearer session，还是本地开发 smoke，API 最终都应解析为同一个 membership context：

- `user`
- `clubId`
- `membership.roles`

没有 active membership 时，club-scoped API 返回 `403`。

## Error format

错误响应统一为：

```json
{
  "error": {
    "code": "bad_request",
    "message": "Request validation failed",
    "details": []
  }
}
```

`details` 只在校验失败等需要结构化调试信息时返回。前端展示时优先使用 `error.message`，分支处理时使用 `error.code`。

## Schedule contract

普通活动使用 `startsAt` / `endsAt`。重复训练额外传入 `recurrence`：

```json
{
  "frequency": "weekly",
  "interval": 1,
  "count": 8,
  "byWeekday": ["MO"]
}
```

后端用 Temporal 语义保留单次活动时长，并用 rrule 展开为多个具体 `CalendarEvent`。参与记录、训练扩展和冲突检测都基于展开后的事实活动。

## Assessment and metric graph

评测模板不要依赖旧的模板内指标 ID 列表或树节点模型。当前契约使用：

- `MetricGraphVersion`
- `MetricDependency`
- `MetricView`
- `MetricViewNode`
- `AssessmentTemplateVersion`
- `AssessmentMetricBinding`

评测输入写入 `AssessmentScore` 和 `PlayerMetricRecord`。图谱计算输出仍写入 `PlayerMetricRecord`，并用 `MetricLineage` 记录输入记录和公式版本。

## OpenAPI

最小 OpenAPI 输出位于：

```text
GET /openapi.json
```

当前输出来自 route schema registry，覆盖现有 route、request body、常用 response 和统一错误格式。
