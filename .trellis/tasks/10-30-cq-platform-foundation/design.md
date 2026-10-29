# CQ-00 平台边界与部署制品设计

权威方案：[域与共享合同](../10-22-club-experience-redesign/optimization-plan-2026-10-30.md)；证据：[评审核对](../10-22-club-experience-redesign/review-response-2026-10-30.md)。

先核对运行环境、认证、制品及现有发布脚本。完成镜像和初始化隔离、制品记录、健康/客户端版本回读；同步 schema/OpenAPI。公共 UI/API 无必要不制造新抽象。提交 CQ-00 后报告接口、SHA 和证据；后续后台优化由总控安排。

保留应用服务、仓储、事务、授权和旧路由；随实际改动拆职责，不批量搬目录/数据。原始值/分值/等级、计次/财务、课堂表现/队伍评价/测评、友谊赛/正式赛各自独立。新DTO须同步schema/OpenAPI及测试。外部建议不是新增业务规则。

## CQ-23 bounded follow-up

总控2026-10-30明确授权；保留四业务模块、29数据资源、服务端权限及既有AntD结构。先从实际descriptor/group/resource service生成资源权限映射，使用disposable fixture真实cookie验证工作台→对象、详情/保存/历史/错误恢复。若复现任务详情读取失败缺少原位重试，只在同任务上下文增加重读动作；不要将保存/发布错误自动转换为重新加载或重发。身份授权、expectedRevision/requestId、确认发布分离保持原样。没有实测缺陷的模块不改写。
