# CQ-12 家长安排与成长事实设计

权威方案：[域与共享合同](../10-22-club-experience-redesign/optimization-plan-2026-10-30.md)；证据：[评审核对](../10-22-club-experience-redesign/review-response-2026-10-30.md)。

阅读评审 V03/V04/V05。保留 Banner/四快捷位/球员卡/里程碑/分享/咨询。活动显示类型、孩子、完整日期；撤销后按服务端事实展示。CQ-12已提交；成长CQ-20于2026-10-30获总控后续授权，按下述边界实施。

保留应用服务、仓储、事务、授权和旧路由；随实际改动拆职责，不批量搬目录/数据。原始值/分值/等级、计次/财务、课堂表现/队伍评价/测评、友谊赛/正式赛各自独立。新DTO须同步schema/OpenAPI及测试。外部建议不是新增业务规则。

## CQ-20 现状与修正边界

已满足：confirmed-results复用已确认投影，包含原始值/单位/映射与版本，按同项目版本单位展示历史；队伍评价按teamId链接；共用radar-canvas已有绘制失败提示。保留这些合同。

确认缺口：growth同孩子刷新清空且只对本机失效标记刷新；child与semester-report将计次比例称出勤；semester-report从最多4个维度平均制造综合分；ability-history把单项历史箭头当综合分且缺前值写持平；metric在无版本和方向信息时称数值增加为提升，缺max补10且硬编码林教练。复用现有guardian confirmed-results API与assessmentValueText，不改共享DTO/计算。旧指标历史缺版本时保留逐条来源/日期/单位，停止合并趋势和优劣推断；可靠同版本历史留给现有已确认成绩入口。
