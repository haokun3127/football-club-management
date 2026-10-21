# 执行计划与检查点

## 顺序
- [x] 安全核对主目录、起点分支/HEAD/脏状态、实际40提交；读取现有任务和权威入口。
- [x] 用户已批准规划并激活任务。
- [x] 阶段1：保存逐提交清单，审查全部累计变更；复现关键风险，记录P0–P3证据。
- [x] 阶段2：按根因修复确认P0/P1及门禁阻塞；每次相关回归/差异审阅后隔离提交。
- [x] 阶段3：Node24/pnpm锁文件完整性、`pnpm check:delivery`、`pnpm check:miniprogram-policy`，适用定向检查及依赖审查；日志保存仓库外。
- [x] 阶段4：安全fetch/祖先检查，推送当前同名分支并回读；官方微信工具确认主项目路径和强制重编译，记录源码SHA、配置及结果。
- [x] 阶段5：盘点文档、修复当前入口和断链、隔离历史权威表述，写治理报告。
- [x] 阶段6：按确认需求ID和在线设计建立产品差距矩阵，形成有边界的下一周期建议。
- [ ] 最终：文档提交后补做受影响检查及三端SHA/编译回读，写A–E报告及最终执行回执；Trellis质量/规范/收尾流程，不把外部阻塞标已完成。

## 验证入口
Node `/opt/homebrew/opt/node@24/bin`；pnpm 10.33.0。读取包脚本和包级spec后执行实际命令。完整门禁 `pnpm check:delivery`，平台检查 `pnpm check:miniprogram-policy`。定向回归跟随实际发现，原生工具运行与Figma截图单独留证。

## 进度检查点（2026-10-21，报告收口）
主目录 `/Users/dongjun/projects/football-club-management`，分支 `feature/ui-batch-1-p01`。起点c98c7c37；baseline70f26151后40提交/103文件已核实。用户已批准计划、同名分支push，完成微信工具登录。
修复7个根因提交 dac0b19e、32b1509f、a9900001、787f0cef、4769069f、617c2065、68921a8d：请求幂等与空错误体、撤假历史、伪token限流、空偏好、错误成长口径/对比、原生首页兼容、依赖。全部已push；本地/ls-remote=68921a8d759501a0a26456f25373c543b5d74b2e。
完整门禁通过964例/1个Windows测试skip，额外9脚本和3启动检查；frozen-lockfile通过，生产audit从31告警降为1个UUID中危（ExcelJS只用不受影响v4）。没有独立lint命令。最后radar改动另跑mini674+typecheck通过。官方清编译缓存后cli auto成功；P08/C34原生合成渲染/字段断言通过，恢复函数/登录页，不改业务身份和数据。
A–E报告、52REQ矩阵、40提交目录、文档盘点在docs/current/post-optimization-audit-2026-10-21。Figma当前P01/P08/C34已在线读取；旧架构/Figma/根handoff保留归档并移除当前权威竞争；隐私实现现状纠正，需求C/P/O/E未改。
未闭合：真实业务/真机B01/B02，旧无action历史核查R03，风险和产品缺口见报告。审计阶段已执行，不宣称产品稳定或真实验收完成。task保留in_progress，不通过finish-work自动归档伪装这些验收已通过；已读取finish-work并按用户“不得虚标完成”约束保留任务。其他28项任务不动。
下一步：最终文档/治理提交、最终相同SHA全门禁/远端/原生回读，回执写仓库外避免自引用。CI已对代码基线手动dispatch（只检查、不部署），待实际结果；日志在/private/tmp/fcm-post-optimization-audit-20261021。按trellis记录会话但不把阻塞项标complete。
