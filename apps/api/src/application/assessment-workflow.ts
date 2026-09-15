import type { AssessmentMetricBinding, MetricValue } from "@football-club/domain";
import type { ApiStore } from "../store.js";
import type { AssessmentTask } from "../data-capability/types.js";
import type { AssessmentEntry, AssessmentWorkingState } from "./assessment-workflow-types.js";
import { SerialOperation } from "./serial-operation.js";

export class AssessmentWorkflowError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); }
}
export function publicationEnabled(clubId: string) {
  return (process.env.FCM_ASSESSMENT_PUBLICATION_CLUBS ?? "").split(",").map((id) => id.trim()).includes(clubId);
}
export function taskDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
const instances = new WeakMap<ApiStore, AssessmentWorkflow>();
export function assessmentWorkflow(store: ApiStore) {
  let service = instances.get(store);
  if (!service) { service = new AssessmentWorkflow(store); instances.set(store, service); }
  return service;
}

export class AssessmentWorkflow {
  private readonly operations = new SerialOperation();
  constructor(private readonly store: ApiStore) {}
  managed(task: AssessmentTask) { return Boolean(this.store.assessmentWorkflow.version(task.clubId, task.id)); }
  available(task: AssessmentTask) { return publicationEnabled(task.clubId) || this.managed(task); }
  editable(task: AssessmentTask) { const today = taskDate(); return publicationEnabled(task.clubId) && task.startsOn <= today && today <= task.dueOn; }
  roster(task: AssessmentTask) {
    return [...new Set(this.store.listTeamMembers(task.clubId).filter((m) => m.teamId === task.teamId && m.status === "active").map((m) => m.studentId))];
  }
  private assertWritable(task: AssessmentTask, studentId?: string) {
    if (!publicationEnabled(task.clubId)) throw new AssessmentWorkflowError("assessment_workflow_disabled", "评测发布流程暂未开放，已保存数据可继续查看", 409);
    if (!this.editable(task)) throw new AssessmentWorkflowError("assessment_task_not_active", "当前不在任务录入期，仅支持查看", 409);
    if (studentId && !this.roster(task).includes(studentId)) throw new AssessmentWorkflowError("forbidden", "学员不在当前任务球队", 403);
  }
  async definition(task: AssessmentTask) {
    const config = await this.store.getDataCapabilityConfig(task.clubId);
    const pinned = this.store.assessmentWorkflow.version(task.clubId, task.id);
    const history = (await this.store.listPlayerAssessments(task.clubId)).filter((a) => a.assessmentTaskId === task.id);
    const historicalVersions = [...new Set(history.map((a) => a.templateVersionId))];
    if (!pinned && (historicalVersions.length > 1 || historicalVersions.includes(undefined))) throw new AssessmentWorkflowError("assessment_legacy_versions", "历史任务版本不明确，请新建评测任务；原成绩保留", 409);
    const versionId = pinned ?? historicalVersions[0];
    const version = config.assessmentTemplateVersions.filter((v) => v.templateId === task.templateId && (versionId ? v.id === versionId : v.status === "active"))
      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
    if (!version) throw new AssessmentWorkflowError("assessment_version_missing", "评测模板版本不可用", 409);
    const bindings = config.assessmentMetricBindings.filter((b) => b.templateVersionId === version.id && b.role === "input");
    if (!bindings.length || bindings.some((b) => !b.testItemId)) throw new AssessmentWorkflowError("assessment_inputs_missing", "评测项目配置不完整", 409);
    return { version, bindings };
  }
  async adopt(task: AssessmentTask) {
    const { version } = await this.definition(task);
    this.store.assessmentWorkflow.pin(task.clubId, task.id, version.id);
  }
  async state(task: AssessmentTask, studentId: string): Promise<AssessmentWorkingState> {
    const stored = this.store.assessmentWorkflow.get(task.clubId, task.id, studentId);
    if (stored) return stored;
    const { version, bindings } = await this.definition(task);
    const previous = (await this.store.listPlayerAssessments(task.clubId)).filter((a) => a.assessmentTaskId === task.id && a.studentId === studentId && a.templateVersionId === version.id)
      .sort((a, b) => Date.parse(b.assessedAt) - Date.parse(a.assessedAt) || b.id.localeCompare(a.id))[0];
    const state: AssessmentWorkingState = { revision: 0, entries: {}, changes: [], publications: [] };
    if (previous) {
      const byMetric = new Map(bindings.map((b) => [b.metricId, b.testItemId!]));
      for (const record of this.store.listMetricRecords(task.clubId)) {
        const testItemId = byMetric.get(record.metricId);
        if (record.assessmentId === previous.id && record.source === "assessment" && testItemId) state.entries[testItemId] = { testItemId, metricId: record.metricId, value: record.value };
      }
      state.publications.push({ revision: 0, assessmentId: previous.id, coachId: previous.assessedByCoachId, publishedAt: previous.assessedAt });
    }
    return state;
  }
  async summary(task: AssessmentTask) {
    const { version, bindings } = await this.definition(task);
    const names = new Map(this.store.listStudents(task.clubId).map((s) => [s.id, s.name]));
    const students = await Promise.all(this.roster(task).map(async (studentId) => {
      const state = await this.state(task, studentId);
      const completedFields = bindings.filter((b) => Boolean(state.entries[b.testItemId!])).length;
      const publishedRevision = state.publications.at(-1)?.revision ?? null;
      return { studentId, name: names.get(studentId) ?? "学员", revision: state.revision, completedFields, totalFields: bindings.length, publishedRevision,
        canPublish: this.editable(task) && completedFields === bindings.length && state.revision !== publishedRevision };
    }));
    return { enabled: publicationEnabled(task.clubId), canEdit: this.editable(task), templateVersionId: version.id, students,
      totalStudents: students.length, completedStudents: students.filter((s) => s.completedFields === s.totalFields).length,
      publishedStudents: students.filter((s) => s.publishedRevision !== null).length, readyStudents: students.filter((s) => s.canPublish).length };
  }
  private async validateEntries(task: AssessmentTask, entries: AssessmentEntry[], bindings: AssessmentMetricBinding[]) {
    if (!Array.isArray(entries) || !entries.length || entries.length > bindings.length) throw new AssessmentWorkflowError("invalid_entries", "请填写有效测评项目");
    const items = await this.store.listAssessmentTestItems(task.clubId);
    const seen = new Set<string>();
    for (const entry of entries) {
      const binding = bindings.find((b) => b.testItemId === entry.testItemId);
      const item = items.find((i) => i.id === entry.testItemId);
      if (!binding || !item || item.metricId !== binding.metricId || (entry.metricId && entry.metricId !== binding.metricId) || seen.has(entry.testItemId)) throw new AssessmentWorkflowError("invalid_entry_project", "测评项目与任务指标不匹配或重复");
      seen.add(entry.testItemId);
      const value = entry.value;
      if (!value || value.kind !== item.valueKind || !(value.kind === "score_0_100" || value.kind === "rating_1_5")) throw new AssessmentWorkflowError("invalid_entry_value", "当前流程仅支持项目配置的标准评分");
      const max = value.kind === "rating_1_5" ? 5 : 100;
      if (!Number.isFinite(value.score) || value.score < (max === 5 ? 1 : 0) || value.score > max || (max === 5 && !Number.isInteger(value.score))) throw new AssessmentWorkflowError("invalid_entry_value", `评分须在${max === 5 ? 1 : 0}至${max}之间`);
    }
  }
  save(task: AssessmentTask, studentId: string, coachId: string, input: { expectedRevision: number; entries: AssessmentEntry[]; reason?: string }) {
    return this.operations.run(async () => {
      this.assertWritable(task, studentId);
      const { version, bindings } = await this.definition(task);
      await this.validateEntries(task, input.entries, bindings);
      const state = await this.state(task, studentId);
      const entries = input.entries.map((e) => ({ testItemId: e.testItemId, metricId: bindings.find((b) => b.testItemId === e.testItemId)!.metricId, value: e.value }));
      const changed = entries.filter((e) => JSON.stringify(state.entries[e.testItemId]?.value) !== JSON.stringify(e.value));
      if (!changed.length) return state;
      if (input.expectedRevision !== state.revision) throw new AssessmentWorkflowError("assessment_revision_conflict", "成绩已被更新，请重新加载后核对；本机草稿已保留", 409);
      if (state.publications.length && !input.reason?.trim()) throw new AssessmentWorkflowError("correction_reason_required", "更正已发布成绩须填写原因");
      state.revision += 1;
      state.changes.push({ revision: state.revision, coachId, changedAt: new Date().toISOString(), reason: input.reason?.trim(), entries: changed.map((e) => ({ testItemId: e.testItemId, before: state.entries[e.testItemId]?.value ?? null, after: e.value })) });
      for (const entry of changed) state.entries[entry.testItemId] = entry;
      this.store.assessmentWorkflow.pin(task.clubId, task.id, version.id);
      this.store.assessmentWorkflow.save(task.clubId, task.id, studentId, state);
      return state;
    });
  }
}
