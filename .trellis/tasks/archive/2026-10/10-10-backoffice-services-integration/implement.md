# 后台专业服务及最终集成验收执行清单

## 激活门禁
- [x] 用户于 2026-10-10 确认“开始开发”，批准规划实施。
- [x] 前置依赖达到验收；运行 task.py start 激活本子任务。
- [x] 加载 trellis-before-dev 及相关层 spec，核对当前代码与未提交工作。

## 实施
- [x] 确认服务现有对象；补最小持久化与权限；目录/需求/负责人/来源历史；球探观察跟进；关联共同活动/结果；补服务 BI 对账；全仓检查/迁移恢复/浏览器验收矩阵；更新 spec 和提交计划。
- [x] 将实际端点、schema、对象动作、迁移与受影响测试写回设计及验收矩阵。

## 验证
- [x] 真实目录/需求/负责人和状态更新回读，内部意见权限正确；各模块导航、详情关联、跨租户与共享事实一致；全仓检查和交付包通过，浏览器关键流程与恢复验证有证据。
- [x] 运行父任务 implement.md 所列与本变化相关的 API/domain/backoffice 检查；跨边界跑 check:delivery。
- [x] 在隔离浏览器和可销毁真实数据库验证关键交互，检查截图及输入/权限/冲突状态。
- [x] 检查完整子任务差异；trellis-check 和 update-spec；更新最后验证命令、源码状态及缺口。

## 恢复记录
以下为过程恢复记录；当前最终状态以父任务 implement.md 和 docs/current/backoffice-delivery-2026-10-10.md 为准。

2026-10-10 已激活并沿用先前授权。0041复用私教真实咨询状态，增加分派/候选/沟通/承接依据/跟进/内部意见/共同活动；目录、培养测评需求、球探观察为用途明确的文档表。service和sensitive分别检查，分派不等于承接，承接必须有明确依据；球探关联活动必须存在真实参与关系。0042管理队徽、Banner、分享模板、评价用语与固定可选功能目录，content/presentation BFF沿用角色/client隔离，仅返回启用且未过期内容；capabilities继承主题，未修改小程序源码。0043球探导入复用密钥加密暂存与HMAC来源，raw/batch/audit/receipt不留身份证明文；文件重启确认、自然去重、撤权通过。
最后验证：管理23 tests通过（legacy外部标识、测评组失败/审计回滚与原UUID重试、标准/不测评file reopen）；此前相关38 tests通过；完整API225 tests暴露循环import与迁移预期清单，已修复并针对性复验。backoffice typecheck/lint通过，初版服务/内容/导入/BI build通过；后新增workbench/deep links/display history尚未最终build和browser验收。临时fixture 53009，实际Excel预览200（1 pending+1必填失败），CSP=[]。下一步：确认/下载/BI/服务/展示浏览器补验、最终门禁/diff/spec/矩阵，不能标完成。

## 2026-10-10 最终本地集成状态
本子任务业务代码与本地检查已完成，详见父任务 BO 验收矩阵和交付报告。全仓 check:delivery 退出0；API228/domain35/小程序563+1skip/管理端2，以及构建与环境启动通过。backoffice实际ESLint通过；规格已同步 backoffice-management.md / backoffice-integration.md。工作树原有282项改动保持；未提交、未归档、未生产部署。最后新增快捷入口的浏览器回读与临时服务清理在父任务收口，不将历史阶段的“待完成”当作当前结论。
