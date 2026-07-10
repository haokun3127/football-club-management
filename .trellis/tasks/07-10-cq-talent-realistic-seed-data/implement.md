# 执行计划

1. 重构 `createCqTalentSyntheticFixture` 的家庭规模生成和学员家庭映射，产出固定的 178/8/2 分布并保持 200 行业务表。
2. 将稳定验收家长 ID映射到首个真实双孩家庭，删除额外 200 人 guardian bindings。
3. 扩充 fixture 契约测试：家庭规模、唯一关系、用户/会员/家长链路、手机号、球队/教练/活动/参与者引用完整性。
4. 修正 app-client smoke：家长 children 期望 2 人，家庭日历验证该家庭可见范围；保留教练读写、训练项目、比赛、评测和雷达覆盖。
5. 更新小程序 README、人工验收和 release readiness 中所有“单一家长 200 人”的错误描述与历史结论。
6. 全仓搜索旧断言和技术文案，确认没有遗留 `children.length === 200` 或“绑定 200 人”口径。
7. 运行 API fixture 定向测试、API 全测试、domain 测试、小程序 typecheck；启动隔离 sqlite API 后运行 200 人 app-client smoke。
8. 使用 Trellis check 复核需求与差异，按需更新 durable spec，提交并归档任务。

## 验证命令

```bash
pnpm --filter @football-club/api test -- cq-talent-fixtures.test.ts
pnpm --filter @football-club/api test
pnpm --filter @football-club/domain test
pnpm --filter @football-club/api typecheck
pnpm --filter @football-club/domain typecheck
pnpm --filter @football-club/miniprogram-cq-talent typecheck
pnpm --filter @football-club/miniprogram-cq-talent smoke:app-client
```

Smoke 使用全新 `/tmp` sqlite；验证后终止本地 API，不复用旧 seed 数据库。

## 回滚点

- 家庭生成器与 acceptance seed 同一提交修改，避免中间状态产生孤立 user/profile/binding。
- smoke 和文档必须与数据语义同批提交。
- 不创建数据库迁移；出现问题时回滚该任务提交并重建临时 sqlite 即可。

## 验证结果

- `pnpm check`：通过；domain 6 个文件 / 14 项测试，API 5 个文件 / 54 项测试，全部 TypeScript 检查通过。
- 全新 `/tmp/fcm-cq-talent-family-final.sqlite` 上 `smoke:app-client`：19/19 通过。
- 家长链路：2 名同家庭孩子、4 个家庭活动，活动 child IDs 只包含这 2 名孩子。
- 教练链路：25 人 roster；点名、销课、训练项目保存/回填、比赛和 62 项评测提交通过。
- 数据库计数：201 个 student profile（200 导入 + 1 基础样例）、189 个 parent profile（188 导入家庭 + 1 基础样例）。
