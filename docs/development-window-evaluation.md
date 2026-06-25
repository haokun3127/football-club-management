# 开发窗口评估

## 评估时间

2026-06-25

## 结论

三个开发窗口单独验收通过，但整体集成验收未通过。

不能直接进入下一轮功能开发。下一步必须先做集成整理，把窗口 A 的持久化和 API 契约作为基础，再把窗口 B/C 的业务服务接入同一套服务、路由和存储边界。

## 窗口结果

| 窗口 | 提交 | 结果 | 说明 |
| --- | --- | --- | --- |
| A 平台基础与持久化 | `151bbae chore: add persistence foundation` | 单独通过 | 增加 migration、SQLite persistence、auth context、schema 和基础测试。 |
| B 活动、球队与训练服务 | `459970a feat: add activity and training services` | 单独通过 | 增加 activity/training service、合同接口和 API 测试。 |
| C 比赛、评测与指标服务 | `8fd6bc8 feat: add match assessment and metric services` | 单独通过 | 增加 match/assessment/metric service、领域测试和 API 测试。 |

三个窗口均已验证：

```bash
pnpm check
pnpm build
```

## 未通过原因

集成冲突集中在 API 中央文件：

- `apps/api/src/server.ts`
- `apps/api/src/store.ts`
- `apps/api/src/seed.ts`

冲突原因：

1. 窗口 A 引入持久化、auth context 和 API schema。
2. 窗口 B 在同一批 API 文件中加入 activity/training routes 和内存服务接口。
3. 窗口 C 在同一批 API 文件中加入 match/assessment/metric routes 和内存服务接口。
4. B/C 尚未基于 A 的 persistence/auth/schema 重新接线。

因此单独运行通过不等于可合并通过。

## 风险评估

### P0：API 路由集中导致并行开发冲突

`server.ts` 已经变成多个窗口共同修改的热点。继续并行开发会反复冲突。

处理方式：

- 拆分 route modules。
- 每个业务域只注册自己的 routes。
- `server.ts` 只负责装配。

### P0：存储接口不统一

A 引入 persistence，B/C 仍偏内存 adapter 思路。必须统一应用服务依赖的 repository contracts。

处理方式：

- 保留 A 的 persistence foundation。
- 把 B/C service 改成依赖 repository/service contracts。
- API 层不直接操作 seed data。

### P1：Seed 数据继续膨胀

三个窗口都改 `seed.ts`，后续会越来越难合。

处理方式：

- 按领域拆 seed：platform、training、match、assessment。
- demo seed 由一个组合入口导出。

### P1：API 契约未统一

A 增加 schema 基础，B/C 新增接口还没有接入同一套 schema 风格。

处理方式：

- 所有新 routes 必须带请求/响应 schema。
- OpenAPI 输出应覆盖新增业务接口。

## 集成通过标准

下一步集成工作完成后，必须满足：

- A/B/C 三个窗口的功能都在同一代码线上。
- 没有 merge conflict。
- `pnpm check` 通过。
- `pnpm build` 通过。
- API routes 被拆成模块，避免继续集中修改 `server.ts`。
- 业务服务使用统一 repository contracts。
- 多俱乐部隔离仍然有效。
- 没有微信小程序或 UI 代码。

## 下一步计划

### 集成窗口 D：后端集成与路由重构

目标：把 A/B/C 的结果合成一个可继续开发的后端基线。

任务：

1. 以窗口 A 为基础合入持久化、schema、auth context。
2. 拆分 API route modules：
   - `platform.routes`
   - `calendar.routes`
   - `training.routes`
   - `match.routes`
   - `assessment.routes`
   - `metrics.routes`
3. 将窗口 B 的 activity/training service 接入统一 contracts。
4. 将窗口 C 的 match/assessment/metric service 接入统一 contracts。
5. 拆分 seed 数据，避免单文件持续膨胀。
6. 补集成测试：
   - club scoped calendar query
   - training session creation
   - match event to metric record
   - assessment score creation
   - derived metric lineage
7. 跑 `pnpm check && pnpm build`。

通过后，才能进入下一阶段功能开发。

## 集成后下一阶段

如果集成窗口 D 通过，下一阶段建议只开 2 个窗口：

1. 管理端 API 完整化：球队、学员、教练、活动、训练计划、比赛记录的 CRUD 和查询。
2. 数据质量与权限：club-scoped authorization、审计日志、输入校验覆盖、OpenAPI 完整输出。

仍然不启动微信小程序前端。小程序应等待后端 API 契约稳定后再进入。
