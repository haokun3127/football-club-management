import type { DatabaseSync } from "node:sqlite";
import { computeMetricGraph, type PlayerMetricRecord } from "@football-club/domain";
import { createSeedData } from "../seed.js";
import { AssessmentRepository } from "../persistence/assessment-repositories.js";
import type { SecureCqTalentTestAccountManifestEntry } from "./secure-cq-talent-test-accounts.js";

/** Caller owns the explicit, backed-up demo reset transaction. */
export function rebuildDemoAssessmentHistory(db: DatabaseSync, account: SecureCqTalentTestAccountManifestEntry, monday: Date, now: string) {
  const clubId = "club-chongqing-talent";
  const data = createSeedData();
  const version = data.assessmentTemplateVersions.find(v => v.id === "assessment-template-version-cq-talent-elite-20260326")!;
  const graph = data.metricGraphVersions.find(g => g.id === version.graphVersionId)!;
  const metricIds = new Set(data.assessmentMetricBindings.filter(b => b.templateVersionId === version.id && b.role === "input").map(b => b.metricId));
  const items = data.assessmentTestItems.filter(i => metricIds.has(i.metricId));
  if (!items.length || !graph) throw new Error("Assessment source model missing");
  for (const item of items) {
    const stored = db.prepare("SELECT metric_id,value_kind FROM assessment_test_items WHERE club_id=? AND id=?").get(clubId,item.id) as {metric_id:string;value_kind:string}|undefined;
    if (!stored || stored.metric_id !== item.metricId || stored.value_kind !== "score_0_100") throw new Error("Stored assessment catalog differs; refusing synthetic conversion");
  }
  const repository = new AssessmentRepository(db);
  for (const student of account.studentIds) {
    db.prepare("DELETE FROM player_metric_records WHERE club_id=? AND student_id=? AND (assessment_id IS NOT NULL OR source IN ('assessment','algorithm'))").run(clubId, student);
    db.prepare("DELETE FROM player_assessments WHERE club_id=? AND student_id=?").run(clubId, student);
  }
  db.prepare("DELETE FROM assessment_tasks WHERE club_id=? AND team_id=?").run(clubId, account.teamId);
  const term = `${monday.getUTCFullYear()}年${monday.getUTCMonth() < 7 ? '春季' : '秋季'}学期`;
  for (let round = 0; round < 3; round++) {
    const starts = new Date(+monday - (round === 0 ? 28 : round === 1 ? 7 : 0) * 86400000).toISOString().slice(0, 10);
    const due = new Date(Date.parse(starts) + (round === 2 ? 13 : 2) * 86400000).toISOString().slice(0, 10);
    const taskId = `customer-assessment-task-${account.slot}-${round}`;
    db.prepare(`INSERT INTO assessment_tasks(id,club_id,team_id,term_label,title,template_id,starts_on,due_on,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(
      taskId, clubId, account.teamId, term, ["学期初综合能力测评", "阶段能力复测", "本阶段自主选项测评"][round]!, round === 2 ? "assessment-template-technical" : version.templateId, starts, due, now, now);
    if (round === 2) continue; // Pending task: the coach selects projects and records results.
    const assessedAt = `${due}T08:00:00.000Z`;
    for (const [i, studentId] of account.studentIds.entries()) {
      const assessmentId = `customer-assessment-${account.slot}-${i}-${round}`;
      repository.saveAssessment({ id: assessmentId, clubId, studentId, templateId: version.templateId, templateVersionId: version.id,
        assessmentTaskId: taskId, assessedByCoachId: account.coachId, assessedAt,
        summary: round ? "基本动作稳定性有所提升，继续加强弱侧脚和对抗中的决策。" : "已建立学期能力基线，后续重点提升动作稳定性与配合意识。", createdAt: assessedAt, updatedAt: now });
      const inputRecords: PlayerMetricRecord[] = [];
      for (const [j, item] of items.entries()) {
        const score = 60 + ((account.slot * 3 + i * 5 + j * 7) % 24) + round * (j % 4 + 1);
        const value = { kind: "score_0_100" as const, score };
        const rawId = `${assessmentId}-raw-${j}`;
        repository.saveRawResult({ id: rawId, clubId, assessmentId, testItemId: item.id, metricId: item.metricId, value, recordedByCoachId: account.coachId,
          note: "按评分表标准记录本次成绩", createdAt: assessedAt, updatedAt: now });
        repository.saveScore({ id: `${assessmentId}-score-${j}`, clubId, assessmentId, metricId: item.metricId, value, normalizedScore: score / 100,
          rawResultId: rawId, comment: "动作完成度与稳定性评分", createdAt: assessedAt, updatedAt: now });
        const record: PlayerMetricRecord = { id: `${assessmentId}-input-${j}`, clubId, studentId, metricId: item.metricId, value, source: "assessment", occurredAt: assessedAt,
          assessmentId, templateVersionId: version.id, rawResultId: rawId, recordedByCoachId: account.coachId, visibility: "parent", note: "测评项目得分", createdAt: assessedAt, updatedAt: now };
        repository.saveMetricRecord(record);
        inputRecords.push(record);
      }
      let counter = 0;
      const computed = computeMetricGraph({ clubId, studentId, graphVersion: graph, metrics: data.metrics, dependencies: data.metricDependencies,
        formulas: data.derivedMetricDefinitions, inputRecords, ids: { next: kind => `${assessmentId}-${kind}-${counter++}` }, now: assessedAt, assessmentId, templateVersionId: version.id });
      for (const record of computed.records) repository.saveMetricRecord({ ...record, visibility: "parent", note: "依据评分表逐层计算能力结果" });
      for (const lineage of computed.lineages) repository.saveMetricLineage(lineage);
    }
  }
}
