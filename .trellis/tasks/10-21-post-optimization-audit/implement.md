# 执行计划与检查点

## 顺序
- [x] 安全核对主目录、起点分支/HEAD/脏状态、实际40提交；读取现有任务和权威入口。
- [x] 用户已批准规划并激活任务。
- [ ] 阶段1：保存逐提交清单，审查全部累计变更；复现关键风险，记录P0–P3证据。
- [ ] 阶段2：按根因修复确认P0/P1及门禁阻塞；每次相关回归/差异审阅后隔离提交。
- [ ] 阶段3：Node24/pnpm锁文件完整性、`pnpm check:delivery`、`pnpm check:miniprogram-policy`，适用定向检查及依赖审查；日志保存仓库外。
- [ ] 阶段4：安全fetch/祖先检查，推送当前同名分支并回读；官方微信工具确认主项目路径和强制重编译，记录源码SHA、配置及结果。
- [ ] 阶段5：盘点文档、修复当前入口和断链、隔离历史权威表述，写治理报告。
- [ ] 阶段6：按确认需求ID和在线设计建立产品差距矩阵，形成有边界的下一周期建议。
- [ ] 最终：文档提交后补做受影响检查及三端SHA/编译回读，写A–E报告及最终执行回执；Trellis质量/规范/收尾流程，不把外部阻塞标已完成。

## 验证入口
Node `/opt/homebrew/opt/node@24/bin`；pnpm 10.33.0。读取包脚本和包级spec后执行实际命令。完整门禁 `pnpm check:delivery`，平台检查 `pnpm check:miniprogram-policy`。定向回归跟随实际发现，原生工具运行与Figma截图单独留证。

## 进度检查点（2026-10-21）
主目录 `/Users/dongjun/projects/football-club-management`，分支 `feature/ui-batch-1-p01`，起点 `c98c7c37`，baseline `70f26151` 后40提交/103文件。用户已批准计划、当前同名分支push、已完成微信登录。无部署授权需求，也不部署。
已读累计生产代码/UI变更、需求入口及相关spec；复现幂等键重启碰撞/4xx重放、空私教偏好被20默认时段覆盖、撤假丢历史。修复在工作区，尚未提交：上述问题、伪造token绕过限流、测评数误用点评数量、无依据同队对比。完整基线门禁通过；首轮修复后check:delivery也通过（mini673/API248/domain38/backoffice2，另9脚本测试及3启动检查；1skip）。新增撤假展示/历史测试待跑。
依赖审查31条生产告警（23high/8moderate），正在兼容升级Fastify并核对可达性。微信官方工具登录已恢复，主路径open/refresh成功，当前login页面可运行、error console空；尚非最终SHA编译证明。Figma当前权威文件EyQtDtILGDZDf6neLBL6vs，已读P08截图。真实业务登录/真机验证未完成。
日志目录 `/private/tmp/fcm-post-optimization-audit-20261021/`。下一步：收敛依赖+补充回归→完整门禁→隔离提交→官方微信编译和远端同SHA→文档治理/52需求矩阵→最终提交同步回读。历史档案、其他任务、未部署环境保留。
