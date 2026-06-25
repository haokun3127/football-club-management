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

## Club Scope 约束

俱乐部内 repository 暴露：

- `listByClub(clubId)`
- `getByClubAndId(clubId, id)`

`getById(id)` 在俱乐部内 repository 上会直接报错，避免调用方绕过租户边界。

API 层使用最小 auth context：

- `x-user-id` 模拟当前登录用户。
- 未传时默认使用 `API_DEMO_USER_ID` 或 `user-coach-1`。
- `/clubs/:clubId/*` 请求必须解析到 active membership。
