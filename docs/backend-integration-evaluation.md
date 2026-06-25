# 后端集成评估

## 结论

`FCM-D｜后端集成与路由重构` 已通过总控验收，并已合入 `master`。

本次集成把 A/B/C 三个窗口的有效成果合到同一条后端基线：

- A：平台基础、持久化、auth context、API schema。
- B：活动、球队、训练服务。
- C：比赛、评测、指标服务。

## 已完成

- 建立 SQLite migration 基础。
- 新增平台持久化 adapter 和 repository。
- 新增 auth context 和 membership resolver。
- 拆分 route modules：
  - `platform.routes`
  - `calendar.routes`
  - `training.routes`
  - `match.routes`
  - `assessment.routes`
  - `metrics.routes`
- 拆分 seed 数据：
  - platform
  - training
  - match
  - assessment
- 合入活动/训练应用服务。
- 合入比赛/评测/指标领域服务。
- 保留多俱乐部隔离。
- 收紧 Fastify/Ajv 配置，未知字段不会被静默剔除。
- 收紧比赛记录接口 schema，避免 `roster`/`rosters` 这类契约错误被吞掉。

## 验证

已通过：

```bash
pnpm check
pnpm build
```

测试覆盖：

- club scoped calendar query
- training session creation
- match event to metric record
- assessment score creation
- derived metric lineage
- persistence foundation
- club membership authorization
- misspelled match roster payload rejection

运行时抽查：

- `GET /health`
- `GET /clubs/:clubId/config`
- `GET /clubs/:clubId/calendar/events`
- `POST /clubs/:clubId/training/sessions`
- `POST /clubs/:clubId/matches`
- `POST /clubs/:clubId/assessments`
- `POST /clubs/:clubId/students/:studentId/derived-metrics/attacking-contribution`

## 剩余问题

### 1. API 契约还不完整

部分接口已有 schema，但不是所有复杂对象都有完整 response schema。下一步需要补 OpenAPI 输出和更严格的响应契约。

### 2. 训练目录查询不足

当前训练服务有创建训练 session 的接口，但课程计划、训练练习、训练目标等管理端查询接口还不完整。

### 3. 持久化覆盖范围仍偏平台基础

当前 persistence foundation 主要覆盖平台基础实体。训练、比赛、评测、指标服务仍需要进一步接入真实 repository。

### 4. 权限仍是最小实现

已有 membership resolver，但还没有细分角色权限，例如管理员、教练、家长可访问范围。

## 下一步计划

短期只建议开 2 个窗口：

### FCM-E：管理端 API 完整化

目标：补齐后台管理所需的核心 CRUD 和查询接口。

范围：

- 俱乐部配置查询
- 学员、家长、教练、球队管理
- 球队成员管理
- 活动日历查询与创建
- 训练目录查询
- 训练 session 和参与记录查询
- 比赛记录查询
- 评测记录查询

验收：

- API routes 不再集中修改 `server.ts`。
- 所有新增接口带 schema。
- `pnpm check && pnpm build` 通过。

### FCM-F：权限、数据质量与 API 契约

目标：让 API 进入可被前端稳定依赖的状态。

范围：

- club scoped authorization policy
- role-based access baseline
- OpenAPI 输出
- response schema 补齐
- 输入校验补齐
- 审计字段和错误格式统一
- 数据隔离测试增强

验收：

- 管理员、教练、家长的基础访问边界清楚。
- OpenAPI 可生成。
- 错误响应格式统一。
- `pnpm check && pnpm build` 通过。

## 暂不启动

- 微信小程序前端。
- 管理后台 UI。
- 支付课包。
- CRM 招生。
- AI 视频剪辑。
- 媒体矩阵发布。
