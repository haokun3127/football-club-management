# 持久化基础

## MVP 选择

当前后端 MVP 使用 SQLite 和纯 SQL migration。

选择原因：

- 本地开发不需要额外数据库服务。
- `node:sqlite` 可直接运行，避免早期引入 native ORM 依赖和复杂连接配置。
- schema 使用标准 SQL 和显式索引，后续迁移到 Postgres 时可以平滑重写 migration。
- 当前项目仍处于领域骨架阶段，repository 层比完整 ORM 更容易保持 `clubId` 查询约束。

## 迁移命令

默认数据库文件：

```bash
pnpm --filter @football-club/api db:migrate
```

指定数据库文件：

```bash
DATABASE_URL=apps/api/data/dev.sqlite pnpm --filter @football-club/api db:migrate
```

迁移 runner 使用 `schema_migrations` 记录已执行文件，重复执行会跳过已应用版本。

## 当前覆盖表

- `clubs`
- `user_accounts`
- `club_user_memberships`
- `parent_profiles`
- `student_profiles`
- `coach_profiles`
- `teams`
- `team_members`

除 `clubs` 和 `user_accounts` 外，俱乐部内实体都带 `club_id`，并为高频查询建立包含 `club_id` 的索引。

## 下一阶段覆盖目标

当前数据库还只是平台基础持久化，不应被理解为最终字段能力。第一个俱乐部的 WPS 表格暴露了青训运营必须前置承接的字段和事实。

下一阶段 migration 应优先补齐三类表：

### 1. 标准运营字段

- `student_contacts`
- `student_operational_profiles`
- `regions`
- `schools`
- `acquisition_channels`

这些字段支撑渠道、区域、学校、学员状态、微信、联系人、负责教练和沟通阶段等高频查询。

### 2. 业务事实表

- `calendar_events`
- `event_participants`
- `payment_events`
- `payment_reviews`
- `lesson_credit_ledger`
- `insurance_policies`
- `communication_logs`
- `attachments`
- `player_assessments`
- `assessment_scores`
- `ability_metrics`
- `player_metric_records`
- `derived_metric_definitions`
- `metric_lineages`

收费、保险、出勤和评测不要只存汇总字段。列表需要的余额、保险到期和签到次数可以作为快照，但权威来源应是事实表和流水表。

### 3. 扩展与同步表

- `custom_field_definitions`
- `custom_field_values`
- `external_system_connections`
- `external_table_mappings`
- `external_field_mappings`
- `external_sync_runs`
- `external_raw_records`
- `external_record_links`

自定义字段值应使用类型化存储，支持筛选、导入校验、权限和报表。外部同步表负责承载 WPS、Excel 或未来其他表格系统的来源记录，不把外部表格形状写死进核心业务表。

## Club Scope 约束

俱乐部内 repository 暴露：

- `listByClub(clubId)`
- `getByClubAndId(clubId, id)`

`getById(id)` 在俱乐部内 repository 上会直接报错，避免调用方绕过租户边界。

API 层使用最小 auth context：

- `x-user-id` 模拟当前登录用户。
- 未传时默认使用 `API_DEMO_USER_ID` 或 `user-coach-1`。
- `/clubs/:clubId/*` 请求必须解析到 active membership。
