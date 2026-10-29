# CQ-10/11 教练课堂与连续测评设计

权威方案：[域与共享合同](../10-22-club-experience-redesign/optimization-plan-2026-10-30.md)；证据：[评审核对](../10-22-club-experience-redesign/review-response-2026-10-30.md)。

阅读评审 V01/V02/V06/V07/V08。先 CQ-10 独立提交，再 CQ-11 独立提交。旧入口复用 getCoachAssessmentTaskOptions(sourceEventId, teamId)，不得猜任务或删除后端门禁。主动作无任务时查看训练记录，课堂表现可选；不要把完成任意测评强制为结课。输入仅更新相关行，草稿落盘及隐藏/卸载/提交安全刷新必须保留。

保留应用服务、仓储、事务、授权和旧路由；随实际改动拆职责，不批量搬目录/数据。原始值/分值/等级、计次/财务、课堂表现/队伍评价/测评、友谊赛/正式赛各自独立。新DTO须同步schema/OpenAPI及测试。外部建议不是新增业务规则。
