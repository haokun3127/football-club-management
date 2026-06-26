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

## Auth headers

开发环境使用 `x-user-id` 模拟登录用户。生产接入真实身份后，API 仍应解析为同一个 membership context：

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
