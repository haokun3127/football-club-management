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
| admin/operator | 按后台授权范围维护资料、队伍和业务；字段和导出权限独立核对。 |
| coach | 仅获授权队伍/活动；主教练编排课程，其他授权教练协同测评、评价和课次更正，不获得主档编辑权限。 |
| parent | 绑定孩子获准资料和已确认结果；可直接请假及更正已有训练事实，不可修改日程、测评或队伍主档。 |

权限产品基准见 [矩阵](product-requirements/03-data-and-permissions.md)，可执行约束见 [active-role 规范](../../.trellis/spec/api/backend/active-role-sessions.md)。

## 微信手机号登录契约（当前客户端）

```text
POST /clubs/:clubId/app-clients/:clientId/wechat-login
```

- `wxLoginCode` 必填，`phoneCode` 可选；`roleHint` 不是可信身份来源，不能决定访问权限或前端分流。
- 返回 `binding_required` 时，`role`、`session`、`profile` 都为 `null`；只能提示核对登记手机号，不能伪造角色、手机号或 session。
- `authenticated` 后仍须核对 `session.activeRole`：双角色客户端声明 `active-role-switch-v1` 时，初始 activeRole 可为 null，先通过 `POST .../session/role` 选择可用角色；不能直接按旧 roleHint 分流。
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

`details` 只在校验失败等需要结构化调试信息时返回。前端通过 `utils/request.ts` 将网络/HTTP错误映射为可恢复提示，分支使用 `error.code`；服务器内部异常统一隐藏细节，不能直接向用户显示堆栈或 SQL。

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

## 2026-10-21 复核：写入身份与训练留痕

- `POST .../session/logout` 撤销当前服务端会话，重复注销可安全处理；当前小程序退出入口尚未全部调用它，见审计剩余项，不能宣称端到端注销闭合。
- 幂等写使用 `Idempotency-Key` 与请求指纹；客户端未决重试复用操作键，明确 HTTP 结果后下次新操作换键。缓存寿命/并发限制见[请求规范](../../.trellis/spec/miniprogram/frontend/performance-and-compatibility.md)。
- 请假 POST `{ action: "request" | "revoke", expectedRevision, reason? }` 与课次 PATCH 共用事实仓储。撤回不删除记录，历史可含 `action` 标识；过期 revision 返回409。具体路径、角色、schema和测试见[训练记录规范](../../.trellis/spec/api/backend/training-records.md)。
- 本文为入口摘要；路由 schema、OpenAPI和回归测试是可执行接口证据，不用旧文档推导额外权限。
