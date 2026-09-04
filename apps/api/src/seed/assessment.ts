import type { SeedData } from "./types.js";
import { createTalentEliteAssessmentCatalog } from "./cq-talent-assessment-model.js";
import { chongqingTalentClubId as clubId, seedNow as now, systemCatalog } from "./types.js";

export function createAssessmentSeed(): Pick<
  SeedData,
  | "assessmentTemplates"
  | "assessmentTemplateVersions"
  | "assessmentMetricBindings"
  | "assessmentTestItems"
  | "playerAssessments"
  | "assessmentRawResults"
  | "assessmentScores"
  | "metricGraphVersions"
  | "metricDependencies"
  | "metricViews"
  | "metricViewNodes"
  | "metricRecords"
  | "metricLineages"
  | "derivedMetricDefinitions"
> {
  const talentElite = createTalentEliteAssessmentCatalog();
  const tableTemplateVersionId = "assessment-template-version-technical-table-20260904";
  const tableInputBindings = talentElite.assessmentMetricBindings
    .filter((binding) => binding.role === "input")
    .map((binding, index) => ({
      ...binding,
      id: `assessment-binding-technical-table-${String(index + 1).padStart(2, "0")}`,
      templateVersionId: tableTemplateVersionId,
    }));

  return {
    metricGraphVersions: [
      ...talentElite.metricGraphVersions,
      {
        id: "metric-graph-version-chongqing-talent",
        catalogScope: systemCatalog,
        name: "重庆天才球员能力指标图谱",
        version: "1.0.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricDependencies: [
      ...talentElite.metricDependencies,
      {
        id: "metric-dependency-finishing-technical-index",
        catalogScope: systemCatalog,
        graphVersionId: "metric-graph-version-chongqing-talent",
        inputMetricId: "metric-finishing",
        outputMetricId: "metric-technical-index",
        formulaId: "derived-technical-index",
        weight: 1,
        role: "primary",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricViews: [
      ...talentElite.metricViews,
      {
        id: "metric-view-technical-basics",
        catalogScope: systemCatalog,
        graphVersionId: "metric-graph-version-chongqing-talent",
        name: "天才精英队评分视图",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricViewNodes: [
      ...talentElite.metricViewNodes,
      {
        id: "metric-view-node-finishing",
        catalogScope: systemCatalog,
        viewId: "metric-view-technical-basics",
        metricId: "metric-finishing",
        label: "射门终结",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-view-node-technical-index",
        catalogScope: systemCatalog,
        viewId: "metric-view-technical-basics",
        metricId: "metric-technical-index",
        label: "技术综合指数",
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentTemplates: [
      ...talentElite.assessmentTemplates,
      {
        id: "assessment-template-technical",
        catalogScope: systemCatalog,
        name: "天才精英队周期评测",
        ageGroup: "U10",
        teamLevel: "development",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentTemplateVersions: [
      ...talentElite.assessmentTemplateVersions,
      {
        id: "assessment-template-version-technical-1",
        clubId,
        templateId: "assessment-template-technical",
        graphVersionId: "metric-graph-version-chongqing-talent",
        version: "1.0.0",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: tableTemplateVersionId,
        clubId,
        templateId: "assessment-template-technical",
        graphVersionId: "metric-graph-version-cq-talent-elite-20260326",
        version: "20260904",
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentMetricBindings: [
      ...talentElite.assessmentMetricBindings,
      ...tableInputBindings,
      {
        id: "assessment-binding-finishing",
        clubId,
        templateVersionId: "assessment-template-version-technical-1",
        metricId: "metric-finishing",
        role: "input",
        testItemId: "assessment-test-finishing-cq-talent",
        maxScore: 5,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "assessment-binding-technical-index",
        clubId,
        templateVersionId: "assessment-template-version-technical-1",
        metricId: "metric-technical-index",
        role: "output",
        formulaId: "derived-technical-index",
        maxScore: 100,
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentTestItems: [
      ...talentElite.assessmentTestItems,
      {
        id: "assessment-test-finishing-cq-talent",
        clubId,
        metricId: "metric-finishing",
        name: "射门终结评分",
        valueKind: "rating_1_5",
        unit: "score",
        protocol: "结合小场景射门、第一脚处理和门前冷静度，由教练按 1-5 分记录；推荐训练：脚内侧推射、移动中射门、接球后快速完成。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "assessment-test-ball-mastery-cq-talent",
        clubId,
        metricId: "metric-finishing",
        name: "1 分钟颠球次数",
        valueKind: "count",
        unit: "count",
        protocol: "来自天才精英队评分表样例，用作测试项目元数据；推荐训练：颠球、踩球拉球、左右脚交替触球。",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "assessment-test-1v1-cq-talent",
        clubId,
        metricId: "metric-finishing",
        name: "1v1 突破与防守观察",
        valueKind: "score_0_100",
        unit: "score",
        protocol: "记录正面突破、横向摆脱、背身转身、防守姿态等原子项，后续通过指标图谱公式组合成上层能力结果。",
        createdAt: now,
        updatedAt: now,
      },
    ],
    playerAssessments: [
      {
        id: "assessment-1",
        clubId,
        studentId: "student-1",
        templateId: "assessment-template-technical",
        templateVersionId: "assessment-template-version-technical-1",
        assessedByCoachId: "coach-1",
        assessedAt: "2026-07-06T10:00:00.000Z",
        summary: "天才精英队周期技术评测",
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessmentRawResults: [],
    assessmentScores: [
      {
        id: "assessment-score-1",
        clubId,
        assessmentId: "assessment-1",
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 4 },
        normalizedScore: 4,
        comment: "第一脚处理干净，门前选择稳定。",
        createdAt: now,
        updatedAt: now,
      },
    ],
    metricRecords: [
      {
        id: "metric-record-training-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 4 },
        source: "training_observation",
        occurredAt: "2026-07-01T10:15:00.000Z",
        eventId: "event-training-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
        note: "训练中射门动作稳定。",
      },
      {
        id: "metric-record-goal-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-goals",
        value: { kind: "count", count: 1 },
        source: "match_event",
        occurredAt: "2026-07-05T09:30:00.000Z",
        eventId: "event-match-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-record-assist-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-assists",
        value: { kind: "count", count: 1 },
        source: "match_event",
        occurredAt: "2026-07-05T09:30:00.000Z",
        eventId: "event-match-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "metric-record-assessment-1",
        clubId,
        studentId: "student-1",
        metricId: "metric-finishing",
        value: { kind: "rating_1_5", score: 4 },
        source: "assessment",
        occurredAt: "2026-07-06T10:00:00.000Z",
        eventId: "event-training-1",
        assessmentId: "assessment-1",
        templateVersionId: "assessment-template-version-technical-1",
        recordedByCoachId: "coach-1",
        createdAt: now,
        updatedAt: now,
        note: "天才精英队周期技术评测",
      },
    ],
    metricLineages: [],
    derivedMetricDefinitions: [
      ...talentElite.derivedMetricDefinitions,
      {
        id: "derived-attacking-contribution",
        catalogScope: systemCatalog,
        code: "attacking_contribution",
        name: "进攻贡献",
        outputMetricId: "metric-attacking-contribution",
        method: "weighted_average",
        inputMetricIds: ["metric-goals", "metric-assists"],
        version: "1.0.0",
        weights: {
          "metric-goals": 2,
          "metric-assists": 1,
        },
        outputUnit: "score",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "derived-technical-index",
        catalogScope: systemCatalog,
        code: "technical_index",
        name: "技术综合指数",
        outputMetricId: "metric-technical-index",
        method: "normalized_weighted_sum",
        inputMetricIds: ["metric-finishing"],
        version: "1.0.0",
        weights: {
          "metric-finishing": 1,
        },
        inputScale: 5,
        maxScore: 100,
        outputUnit: "score",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
