# CQ 集成审计与 develop 交付设计

权威方案：[域与共享合同](../10-22-club-experience-redesign/optimization-plan-2026-10-30.md)；证据：[评审核对](../10-22-club-experience-redesign/review-response-2026-10-30.md)。

启动三个 GPT-6.1-sol 开发 worktree；审计线程对固定 SHA 只读检查。记录线程ID、分支、提交、验证。开发修复交给所有者，集成后按最新版本复验。缺少物理设备/官方包体时保留 B6，不把工具调用当真实用户验收。

保留应用服务、仓储、事务、授权和旧路由；随实际改动拆职责，不批量搬目录/数据。原始值/分值/等级、计次/财务、课堂表现/队伍评价/测评、友谊赛/正式赛各自独立。新DTO须同步schema/OpenAPI及测试。外部建议不是新增业务规则。
