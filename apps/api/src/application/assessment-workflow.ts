import {mapAssessmentValue} from "@football-club/domain";
import { reconcileTrainingRecord } from "./training-records.js";
import { coachTeamRole } from "./coach-scope.js";
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
  editable(task: AssessmentTask) { const today = taskDate(); return publicationEnabled(task.clubId) && task.startsOn <= today; }
  roster(task: AssessmentTask) {
    if (task.studentIds) return [...task.studentIds];
    return [...new Set(this.store.listTeamMembers(task.clubId).filter((m) => m.teamId === task.teamId && m.status === "active").map((m) => m.studentId))];
  }
  async courses(task: AssessmentTask, coachId: string, readOnly = false) {
    const courses = [];
    for (const source of this.store.listCalendarEvents(task.clubId)) {
      const event = source as import("@football-club/domain").CalendarEvent;
      const date = taskDate(new Date(event.timeRange.startsAt));
      if (event.type !== "training" || event.status === "cancelled" || event.primaryTeamId !== task.teamId
        || date < task.startsOn || date > task.dueOn || Date.parse(event.timeRange.startsAt) > Date.now()
        || (!coachTeamRole(this.store,task.clubId,coachId,task.teamId) && event.ownerCoachId !== coachId)) continue;
      courses.push({id:event.id,title:event.title,occurredAt:event.timeRange.startsAt,
        studentIds: this.store.listEventParticipants(task.clubId).filter(participant => {
          if (participant.eventId !== event.id) return false;
          const repository=readOnly?{get:()=>this.store.trainingRecords.get(task.clubId,event.id,participant.studentId),compareAndSave:()=>true}:this.store.trainingRecords;
          const fact = reconcileTrainingRecord(repository, event, participant);
          return fact ? fact.counted : !["absent", "leave_requested", "excused"].includes(participant.status);
        }).map(participant => participant.studentId)});
    }
    return courses.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||a.id.localeCompare(b.id));
  }
  async courseEntries(task: AssessmentTask, studentId: string, coachId: string, entries: AssessmentEntry[], state: AssessmentWorkingState, readOnly = false) {
    const courses = await this.courses(task, coachId, readOnly);
    return entries.map((entry) => {
      const eventId = entry.eventId ?? state.entries[entry.testItemId]?.eventId;
      if (!eventId) throw new AssessmentWorkflowError("assessment_course_required", "请为成绩选择实际参与的训练课");
      const course = courses.find((item) => item.id === eventId && item.studentIds.includes(studentId));
      if (!course) throw new AssessmentWorkflowError("invalid_assessment_course", "请选择周期内、该学员参与且有权操作的有效训练课");
      return {...entry,eventId,occurredAt:course.occurredAt};
    });
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
    const inputs = config.assessmentMetricBindings.filter((b) => b.templateVersionId === version.id && b.role === "input");
    if (task.testItemIds?.some((id) => !inputs.some((b) => b.testItemId === id))) throw new AssessmentWorkflowError("invalid_task_projects", "任务项目不属于固定的模板版本", 409);
    const bindings = task.testItemIds ? inputs.filter((b) => task.testItemIds!.includes(b.testItemId!)) : inputs;
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
        notAssessed:state.notAssessed??null,canPublish: !state.notAssessed && this.editable(task) && completedFields === bindings.length && state.revision !== publishedRevision };
    }));
    return { testItemIds: bindings.map((b) => b.testItemId!), courseSelectionRequired: true, enabled: publicationEnabled(task.clubId), canEdit: this.editable(task), templateVersionId: version.id, students,
      totalStudents: students.length, completedStudents: students.filter((s) => !s.notAssessed && s.completedFields === s.totalFields).length,
      processedStudents:students.filter(s=>s.notAssessed||s.completedFields===s.totalFields).length,notAssessedStudents:students.filter(s=>s.notAssessed).length,
      publishedStudents: students.filter((s) => s.publishedRevision === s.revision && s.completedFields === s.totalFields).length, readyStudents: students.filter((s) => s.canPublish).length };
  }
  async validateEntries(task: AssessmentTask, entries: AssessmentEntry[], bindings: AssessmentMetricBinding[]) {
    if (!Array.isArray(entries) || !entries.length || entries.length > bindings.length) throw new AssessmentWorkflowError("invalid_entries", "请填写有效测评项目");
    const items = await this.store.listAssessmentTestItems(task.clubId);
    const seen = new Set<string>();
    for (const entry of entries) {
      const binding = bindings.find((b) => b.testItemId === entry.testItemId);
      const item = items.find((i) => i.id === entry.testItemId);
      if (!binding || !item || item.metricId !== binding.metricId || (entry.metricId && entry.metricId !== binding.metricId) || seen.has(entry.testItemId)) throw new AssessmentWorkflowError("invalid_entry_project", "测评项目与任务指标不匹配或重复");
      seen.add(entry.testItemId);
      const value = entry.value;
      if(binding.scoreMappingVersionId || binding.gradeMappingVersionId) {
        const raw=binding.scoreMappingVersionId?this.store.findAssessmentMappingVersion?.(task.clubId,binding.scoreMappingVersionId):null;
        const grade=binding.gradeMappingVersionId?this.store.findAssessmentMappingVersion?.(task.clubId,binding.gradeMappingVersionId):null;
        if(!raw||!grade)throw new AssessmentWorkflowError("assessment_mapping_missing","固定版本的映射配置缺失",409);
        try {mapAssessmentValue(item,value,raw,grade);} catch {throw new AssessmentWorkflowError("invalid_entry_value","原始值、单位或固定映射范围不匹配");}
        continue;
      }

      if (!value || value.kind !== item.valueKind || !(value.kind === "score_0_100" || value.kind === "rating_1_5")) throw new AssessmentWorkflowError("invalid_entry_value", "当前流程仅支持项目配置的标准评分");
      const max = value.kind === "rating_1_5" ? 5 : 100;
      if (!Number.isFinite(value.score) || value.score < (max === 5 ? 1 : 0) || value.score > max || (max === 5 && !Number.isInteger(value.score))) throw new AssessmentWorkflowError("invalid_entry_value", `评分须在${max === 5 ? 1 : 0}至${max}之间`);
    }
  }
  async previewSave(task:AssessmentTask,studentId:string,coachId:string,input:{expectedRevision:number;entries:AssessmentEntry[];reason?:string}) {
    this.assertWritable(task,studentId);const {bindings}=await this.definition(task);await this.validateEntries(task,input.entries,bindings);const state=await this.state(task,studentId);
    await this.courseEntries(task,studentId,coachId,input.entries,state,true);
    if(input.expectedRevision!==state.revision)throw new AssessmentWorkflowError("assessment_revision_conflict","成绩已更新",409);
    if(state.publications.length&&!input.reason?.trim())throw new AssessmentWorkflowError("correction_reason_required","更正须说明原因");
    return state;
  }
  save(task: AssessmentTask, studentId: string, coachId: string, input: { expectedRevision: number; entries: AssessmentEntry[]; reason?: string }, afterSave?: (state: AssessmentWorkingState) => void) {
    return this.operations.run(async () => {
      const operation = async () => {
      this.assertWritable(task, studentId);
      const { version, bindings } = await this.definition(task);
      await this.validateEntries(task, input.entries, bindings);
      const state = await this.state(task, studentId);
      const entries = await this.courseEntries(task, studentId, coachId, input.entries.map((e) => ({testItemId:e.testItemId,metricId:bindings.find((b)=>b.testItemId===e.testItemId)!.metricId,value:e.value,eventId:e.eventId})), state);
      const changed = entries.filter((e) => {
        const previous = state.entries[e.testItemId];
        return JSON.stringify(previous?.value) !== JSON.stringify(e.value) || previous?.eventId !== e.eventId || previous?.occurredAt !== e.occurredAt;
      });
      if (!changed.length) {afterSave?.(state);return state;}
      if (input.expectedRevision !== state.revision) throw new AssessmentWorkflowError("assessment_revision_conflict", "成绩已被更新，请重新加载后核对；本机草稿已保留", 409);
      if (state.publications.length && !input.reason?.trim()) throw new AssessmentWorkflowError("correction_reason_required", "更正已发布成绩须填写原因");
      state.revision += 1;
      delete state.notAssessed;
      state.changes.push({ revision: state.revision, coachId, changedAt: new Date().toISOString(), reason: input.reason?.trim(), entries: changed.map((e) => ({ testItemId: e.testItemId, before: state.entries[e.testItemId]?.value ?? null, after: e.value, beforeEventId:state.entries[e.testItemId]?.eventId, afterEventId:e.eventId, beforeOccurredAt:state.entries[e.testItemId]?.occurredAt, afterOccurredAt:e.occurredAt })) });
      for (const entry of changed) state.entries[entry.testItemId] = {...entry,recordedAt:new Date().toISOString()};
      this.store.assessmentWorkflow.pin(task.clubId, task.id, version.id);
      this.store.assessmentWorkflow.save(task.clubId, task.id, studentId, state);
      afterSave?.(state);return state;
      };
      return this.store.assessmentWorkflow.transaction ? this.store.assessmentWorkflow.transaction(operation) : operation();
    });
  }
  markNotAssessed(task:AssessmentTask,studentId:string,coachId:string,input:{expectedRevision:number;reason:string|null}) {
    return this.operations.run(async()=>{
      this.assertWritable(task,studentId);const {version}=await this.definition(task),state=await this.state(task,studentId);
      if(state.revision!==input.expectedRevision)throw new AssessmentWorkflowError("assessment_revision_conflict","处理状态已更新，请核对最新版本",409);
      if(state.publications.length)throw new AssessmentWorkflowError("assessment_already_published","已确认成绩须通过更正流程处理，不能标记为未测",409);
      const reason=input.reason?.trim();if(input.reason!==null&&!reason)throw new AssessmentWorkflowError("handling_reason_required","请填写不测评原因");
      if((state.notAssessed?.reason??null)===(reason??null))return state;
      const now=new Date().toISOString();state.revision+=1;
      if(reason)state.notAssessed={reason,coachId,recordedAt:now};else delete state.notAssessed;
      state.changes.push({revision:state.revision,coachId,changedAt:now,reason:reason?`不测评：${reason}`:"重新打开录入",entries:[]});
      this.store.assessmentWorkflow.pin(task.clubId,task.id,version.id);this.store.assessmentWorkflow.save(task.clubId,task.id,studentId,state);return state;
    });
  }
  publish(task: AssessmentTask, studentId: string, coachId: string, expectedRevision: number) {
    return this.operations.run(async () => {
      this.assertWritable(task, studentId);
      const { version, bindings } = await this.definition(task);
      const state = await this.state(task, studentId);
      if(state.notAssessed)throw new AssessmentWorkflowError("assessment_not_assessed","已标记不测评，请先重新打开录入",409);
      const existing = state.publications.find((p) => p.revision === expectedRevision);
      if (existing) return { studentId, ...existing, replayed: true };
      if (expectedRevision !== state.revision) throw new AssessmentWorkflowError("assessment_revision_conflict", "成绩已变化，请重新加载后确认发布", 409);
      const entries = bindings.map((b) => state.entries[b.testItemId!]);
      if (entries.some((e) => !e)) throw new AssessmentWorkflowError("assessment_incomplete", "该学员尚未录齐所有项目，不能发布", 409);
      const complete = entries as AssessmentEntry[];
      await this.validateEntries(task, complete, bindings);
      const verified = await this.courseEntries(task, studentId, coachId, complete, state);
      if (verified.some((entry,index)=>entry.occurredAt!==complete[index]?.occurredAt)) throw new AssessmentWorkflowError("assessment_course_changed", "关联课程已改期，请核对课程并重新保存后确认", 409);
      this.store.assessmentWorkflow.pin(task.clubId, task.id, version.id);
      const publishedAt = new Date().toISOString();
      await this.store.recordAssessment({ allowPartialGraph: Boolean(task.testItemIds), clubId: task.clubId, studentId, templateId: task.templateId, templateVersionId: version.id,
        assessmentTaskId: task.id, assessedByCoachId: coachId, assessedAt: complete.map((entry)=>entry.occurredAt!).sort().at(-1)!, rawResults: complete,
        summary: `教练确认发布 · 修订 ${state.revision}` }, (assessment) => {
        state.publications.push({ revision: state.revision, assessmentId: assessment.id, coachId, publishedAt });
        this.store.assessmentWorkflow.save(task.clubId, task.id, studentId, state);
      });
      return { studentId, ...state.publications.at(-1)!, replayed: false };
    });
  }
}
