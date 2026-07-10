# 技术设计

## 边界与原则

本任务只修正重庆天才验收 seed、契约测试、smoke 和相关验收文档，不修改生产领域模型或 app-client API。200 名学员仍是俱乐部整体数据规模，家长端权限始终从 `UserAccount -> ParentProfile -> StudentGuardianBinding` 推导。

## 家庭分配

- 在 `cq-talent-test-data.ts` 中集中定义 200 人家庭分布：178 个 1 人家庭、8 个 2 人家庭、2 个 3 人家庭。
- 使用固定 seed 的轻量确定性洗牌打散家庭规模，避免每次测试结果变化。
- 保证第一个家庭是双孩家庭，作为稳定 dev/验收账号；其余 187 个家庭规模再确定性打散。
- 先生成家庭规模列表和 `studentIndex -> familyIndex` 映射，再生成家庭与学员。业务表中的渠道等家庭属性直接从学员关联家庭读取，不再重复调用旧的区间映射函数。

## 验收家长去特殊化

- 保留 `user-parent-cq-talent-acceptance` 与 `parent-cq-talent-acceptance` 两个稳定 ID，避免修改小程序 dev 配置和人工命令。
- 这两个 ID 不再代表额外的“万能验收家长”，而是直接作为第一个真实生成家庭的 user/profile ID；姓名、手机号、微信和关系均来自该家庭。
- 删除第二组覆盖 200 人的非主要 guardian bindings。每名导入学员只保留一个主要家庭绑定。
- 登录手机号因此唯一，且可解析到真实家庭；不再与 `user-coach-1` 共用 `13900000000`。

## 球队与教练完整性

沿用现有 8 支球队的轮转分配以及少数学员第二训练组规则。新增契约断言覆盖：

- 每名学员至少一个 active team membership，且恰好一个 primary team。
- membership 的 team、team 的 default coach、活动的 owner coach、活动参与者引用均存在。
- 每个导入教练都有 user、club membership 和 coach profile；基础 `coach-1` 继续承接 U10 发展队。

## Smoke 与文档

- smoke 仍用稳定家长 ID，但断言该家长返回 2 名孩子，并验证两个 child ID 均出现在家庭聚合日历的可见范围内。
- 200 人覆盖改由 fixture/seed 契约和整体数据库计数承担，不能再用单一家长 children API 证明。
- README、人工验收和 release readiness 删除“家长绑定 200 人”描述，分别记录俱乐部整体 200 人与验收家庭 2 人。

## 兼容、回滚与风险

- API 路径、响应类型、小程序运行时身份 ID均不变。
- 数据库使用 seed 初始化；已有本地 sqlite 不会自动重写，验收需删除临时 sqlite 后重建。
- 主要风险是测试仍隐含依赖 200-child 家长、文档计数过期或引用完整性遗漏。通过全仓搜索、fixture 强断言和隔离 smoke 控制。
- 回滚可整体撤销 seed、test、smoke 和文档改动，不涉及 schema migration。
