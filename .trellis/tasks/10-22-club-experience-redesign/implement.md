# 分批实施、验收与回退计划

状态：2026-10-22用户已批准，**按独立子任务逐批实施**。本文件为执行清单；勾选仅表示有本次证据，不能把设计目标写成完成项。

## 0. 实施启动前

- [x] 用户同意创建任务并规划；友谊赛最小记录范围已确认。
- [x] 读取当前业务需求、Git分支/HEAD和已有交付记录；没有覆盖其他修改。
- [x] 6款产品的一手资料研究、62路由盘点、14原生页面截图与源码交叉定位。
- [x] PRD收敛、设计与批次计划成形，技术/渲染待验项明确。
- [x] 用户已审阅最终方案并同意进入实施。
- [x] 开工再读 `python3 .trellis/scripts/get_context.py`、Git状态与当前HEAD，确认没有把本次基线当作最新状态；实际批次使用子任务 start。
- [x] 沿用当前 inline 模式，由主执行者分批完成；本规划不启动并行子代理。可把实施批次拆成 Trellis 子任务，保持同一个父需求和验收编号。

工作目录固定 `/Users/dongjun/projects/football-club-management`；不在Documents链接、旧worktree或报告副本开发。临时截图、日志与缓存放仓库外；不复制登录缓存或写敏感令牌。

## 1. 分批范围与完成条件

依赖：B0→B1→B2；B3依赖B0/B1，B4依赖B0/B1/B2/B3；B5依赖B0的事实与视觉契约；B6汇总全部。按批次串行交付，每批先做一个代表页的原生/浏览器验收，再推广同类页面。

### B0 事实投影与对象范围（R1；A1、A9）

- [x] 建立同一课程的教练/家长响应对照；核查 venue/coach/training block 来源和可见范围；修复当前缺字段。
- [x] 在既有 application 层完成有类型投影，保持原 envelope 兼容；页面不再通过中文文案取业务字段。
- [x] 明确 selectedStudentId，覆盖双孩子同场、无效孩子、无队伍/场地/内容与接口失败；不再隐式取 participants[0]。
- [x] 同一eventId双端回读正确；未经授权的数据不出接口；新增字段不暴露联系人/其他孩子。

涉及 `apps/api/src/routes/app-client.routes.ts`、聚焦 application 投影、API schema、`utils/api.ts` 和 `pages/parent/event`。这是行为修复，需要契约与授权回归，不能只改占位文案。回退前端字段消费时保留兼容API，不回滚领域事实。

### B1 共享页面结构与教练课堂执行（R2、R3部分、R8；A2、A3、A7）

- [x] 收敛角色导航定义，统一一级页/详情/编辑壳；保留深链与返回；先迁移日程→训练→计次三页。
- [x] 复用现有 token/app-header/status/submit-bar，基于实际重复再提取context-bar；逐页排查内联样式和底部重叠。
- [x] 训练详情内容/下一步优先；人员摘要与例外列表；头像停止直接写计次；更正明确旧值、新值、原因、历史和冲突。
- [x] 球队工作台增加真实近期/待办；统一单队上下文和名单搜索；保留日程多队筛选。
- [x] 内容选择/复制/战术/课堂表现入口随课可达，原模板和自由摆放规则不变。

涉及 role-tabbar/navigation、共享header、coach schedule/event/lesson/training/team、相关样式。回退为单批UI差异，不修改计次历史。完成条件是原生页面与原计次/权限测试共同通过。

### B2 测评录入主路径（R5；A5、A7）

- [x] 任务待办优先和单一创建；项目计数口径分开。
- [x] 重排输入行为两层，单位/姓名/课程/状态可读，键盘可完成连续录入；旧值合法0与缺失分开。
- [x] 保存、下一项、核对、确认和修订完整衔接；失败保留输入，409显式处理；不新增自动发布。
- [x] 旧test-entry/assessment-submit调用方逐一核对，兼容或转发必须保留语义；不要先删旧页面。
- [x] 用有效测试活动完成至少一次草稿→确认→家长回读，以及修订/并发失败/跨课关联验证，并记录数据清理方法。

涉及教练测评页面与API client，后端仅在已证明契约缺口时小范围修复。先复用现有assessment-workflow；不重写评分或确认引擎。未保存本地状态在部署切换时须有明确提示，禁止直接重载覆盖。

### B3 训练内友谊赛最小闭环（R4；A4、A9）

- [x] 读训练内容块真实标识与生命周期，确认 source block 和内容快照方案；核查旧friendly/internal结构并用隔离持久化fixture验证迁移；未读部署库，不推断全量历史覆盖。
- [x] 依design中的4类对象完成增量domain/仓储/迁移与授权应用服务；审计设施可复用则不新建平行机制。
- [x] 实现草稿/完成/修订/作废、请求去重与expectedRevision；比分不由部分事件自动改写。
- [x] 原生编辑页支持实际人员、双方标签、可空比分和进球/助攻/扑救；课程与球队目录共用同一记录。
- [x] 家长只读完成结果与自己孩子事件；汇总注明“已记录”覆盖，不伪造历史0场。
- [x] 证明原训练计次、请假、正式赛事数据与模板复制未变化；迁移前后既有数据可读，重启后新记录仍在。

涉及 packages/domain、API application/routes/repositories/migrations、coach training-game新页与比赛读取投影。高风险点为新增持久化/事务、范围权限、历史源块变动。先API兼容与迁移，再入口；回退关闭入口并保留新增记录，不做破坏性down migration。

### B4 家长体验与其余原生页面（R6、R8；A1、A6、A7、A9）

- [ ] 首页完整日期/孩子/地点与下一步，保留品牌/卡片/4快捷位/Banner能力。
- [ ] 成长先解释已确认数据与评价，再图表；空/不足比较不补零；我的聚焦账号、绑定、服务与帮助。
- [ ] 多孩子、角色切换、历史/报告/内容/提醒/专业服务及所有剩余route-map项目统一壳与返回，不删除既有可用功能。
- [ ] 给全部62旧路由和新增页补可达性登记；为实质行为改变写必要回归，不为每个纯样式变更造镜像测试。

回退按页面组进行，API继续兼容。保留旧URL与现有可选功能配置，迁移完成前不清理旧映射。

### B5 管理后台信息架构与视觉（R7；A8、A9）

- [ ] 先恢复隔离浏览器可访问性并截图当前工作台、列表、详情、编辑与历史；明确桌面实际问题再改。
- [ ] 在Workspace中分组29数据资源；保持业务四模块、原URL、权限和搜索可达。
- [ ] 调整已有工作台与对象详情的任务优先级，按资源分组表单，复用Management/Drawer。
- [ ] 桌面1440×900和较窄1024视口、键盘/焦点/抽屉滚动、只读/写入/冲突/导出边界验收。

涉及 `apps/backoffice/src/pages/Workspace.tsx`、workbench、management与组件；业务API不因菜单分组改名。回退菜单和展示层即可，不撤销真实操作历史。

### B6 跨端验收与交接

- [ ] 运行相关包检查和根交付门禁；分析每个失败/报告，不把policy检查exit0当成没有问题。
- [ ] 对照A1—A9完成下面任务脚本；记录首次成功、误入、错误理解、未保存损失和点击数，不编造节省百分比。
- [ ] 原生真机/键盘/大字/读屏与后台渲染检查；声明仍未覆盖的设备和网络条件。
- [ ] 回读数据库/接口版本与授权范围，确认无重复计次、无未确认成绩泄露、无跨孩子/俱乐部混用。
- [ ] 更新现有Trellis相关spec和当前交付状态的变更/证据指针，按finish-work记录；不复制整套本任务到新记忆系统。
- [ ] 发布另按实际环境和既有交付流程；本计划不自动授权上传/部署。

## 2. 开发前按批读取的规范

- 共同：`.trellis/workflow.md`、项目业务需求、`trellis-before-dev`；用户指导 `/Users/dongjun/.codex/guidance/ui-quality.md`。非平凡缺陷/关键验证读 `engineering-checks.md`相关段落。
- 小程序：`.trellis/spec/miniprogram/frontend/index.md`及组件、分包配置、隐私、性能、发布相关文件；回腾讯本地正文核对。manifest当前留档2026-10-14，未超过约一月；如实施时过期或发布前，刷新官方留档并比较SHA。
- API：`.trellis/spec/api/backend/index.md`，重点app-client-bff-contracts、coach-team-scope、training-records、assessment-publication、temporary-rosters、training-templates、student-evaluations、public-presentation-results。
- 友谊赛：上述API规范加domain/backend、数据库/错误/质量规范；现有空模板条目不能假装已经给出完整规则，应以实际实现和测试补实证。
- 后台：`.trellis/spec/api/frontend/index.md`及其组件、状态、类型、质量文件；backoffice-authentication/management/integration。

## 3. 验证命令（实施时执行，本规划未运行代码测试）

Node按项目要求24.x、pnpm10.33.0。命令从主仓库根执行，保存完整失败日志到临时目录并检查退出码。

```sh
# 依赖domain类型发生变化时先构建
pnpm --filter @football-club/domain build
# 小程序相关批次
pnpm --filter @football-club/miniprogram-cq-talent typecheck
pnpm --filter @football-club/miniprogram-cq-talent test
# API相关批次；先按文件聚焦，再在批次完成运行包级检查
pnpm --filter @football-club/api typecheck
pnpm --filter @football-club/api test
# 后台批次
pnpm --filter @football-club/backoffice typecheck
pnpm --filter @football-club/backoffice test
pnpm --filter @football-club/backoffice lint
pnpm --filter @football-club/backoffice build
# 小程序规则：报告必须人工读回，脚本exit0不等于零发现
pnpm check:miniprogram-policy
node --test scripts/miniprogram-policy/check.test.mjs
# 跨应用整体验收，包含check/build/交付配置等
pnpm check:delivery
```

优先复用现有测试：

- API：`training-records`、`training-record-routes`、`training-record-leave`、`training-record-job`、`assessment-workflow`、`assessment-workflow-repository`、`app-client-match-detail`、`app-client-match-save`、`formal-matches`、`backoffice-management`、`backoffice-auth`（均为 `apps/api/test/*.test.ts`）。增加当前缺少的投影双角色/多孩子和友谊赛契约用例。
- 原生：`pages/parent/event/index.test.mjs`、`pages/coach/{event,lesson,training,team,assessment-projects,assessment-bulk-entry}/index.test.mjs`及`utils/coach-team-context.test.mjs`。它们使用Vitest，由包test执行；不是纯截图比较。
- 新逻辑只测试可观察行为：权限、字段语义、范围、幂等、事务、修订、缺值与回读。布局主要用渲染证据验收。

## 4. 实际任务脚本与失败场景

| 场景 | 操作 | 必须观察的结果 |
| --- | --- | --- |
| 教练上课前 | 日程找课→看内容→进入测评 | 不反复选队；课程首屏主动作可见；点头像无写入 |
| 课后更正 | 找请假/例外学员→更正→查看历史 | 原规则计次结果不变；原因与revision留痕；并发旧版本拒绝覆盖 |
| 连续录入 | 19人3项目，包含合法0/空值/非法值→保存→核对→确认 | 键盘不遮挡；错误指到具体行；发布前家长不见草稿 |
| 跨课任务 | 从两堂有效课录入同一任务 | 每条课程关联正确，不把全部旧值绑定到最后进入的课 |
| 网络/中断 | 保存时断网→重试；脏表单返回；重启 | 没有重复写入/无提示丢失；服务端成功与本地未确认能重试协调 |
| 友谊赛 | 训练块建两场→名单/比分/少量事件→完成→修订 | 仅一次训练计次；两场各有稳定ID；比分与部分个人事件不互改 |
| 家长双孩子 | 同一活动切孩子→请假/看成绩/比赛 | 仅当前孩子获准内容；事实与教练一致；无其他儿童数据 |
| 管理员/只读人员 | 从工作台进入对象→相关记录→历史 | 原URL可达；只读不能写；当前对象与筛选保持；失败可恢复 |
| 数据缺口 | 未安排场地/内容、0成员、无成绩、旧源块调整 | 文案解释实际状态，不当成0分/0场/教练未录入的假结论 |

## 5. 当前检查点

更新：2026-10-22。用户已批准全方案；B0实现与独立验证完成，证据见子任务。B1教练课堂主流程也已实现验证。B2测评录入已实现验证；B3友谊赛闭环已实现本地验证，下一批B4家长与其余原生页面。父任务保留B4—B6集成清单；没有部署、上传或改正式数据。

## 子任务映射

- B0：[跨端课程事实与孩子上下文](../archive/2026-10/10-22-experience-b0-event-facts/implement.md)，无前置依赖；B1/B4依赖本批。父任务保留集成验收，实际实现/验证记在子任务。

- B1：[教练课堂主流程](../archive/2026-10/10-22-experience-b1-coach-classroom/implement.md)，依赖B0；后续B2/B3依赖本批。

- B2：[测评任务与连续录入](../archive/2026-10/10-22-experience-b2-assessment-flow/implement.md)，依赖B0/B1，已完成独立验证。

- B3：[训练内友谊赛记录](../10-22-experience-b3-training-games/implement.md)，依赖B0/B1，已完成本地独立验证。
