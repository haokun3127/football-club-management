import { getAssessmentForm, getCoachAssessmentTasks, getCoachTeam, submitCoachAssessment } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { AssessmentForm, CoachAssessmentTask, CoachTeamDetail, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];
type DraftValues = Record<string, Record<string, string>>;

type MetricView = {
  fieldId: string;
  label: string;
  inputType: "digit" | "text";
  value: string;
  unitLabel: string;
  placeholder: string;
  scoreLabel: string;
};

type BulkRow = {
  studentId: string;
  name: string;
  initials: string;
  rawInputValue: string;
  scoreLabel: string;
  statusLabel: string;
  metrics: MetricView[];
};

interface BulkDraft {
  signature: string;
  savedAt: string;
  valuesByStudent: DraftValues;
}

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  statusTitle: string;
  message: string;
  taskId: string;
  templateId: string;
  templateVersionId: string;
  projectId: string;
  projectTitle: string;
  taskTitle: string;
  teamName: string;
  termLabel: string;
  fields: AssessmentField[];
  rows: BulkRow[];
  valuesByStudent: DraftValues;
  projectIds: string[];
  projectIndex: number;
  filledLabel: string;
  lastSavedLabel: string;
  submitting: boolean;
}

let latestLoadToken = 0;

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    statusTitle: "全队录入",
    message: "",
    taskId: "",
    templateId: "",
    templateVersionId: "",
    projectId: "",
    projectTitle: "测评项目",
    taskTitle: "能力评估",
    teamName: "",
    termLabel: "",
    fields: [],
    rows: [],
    valuesByStudent: {},
    projectIds: [],
    projectIndex: 0,
    filledLabel: "已填写 0 人 · 未填写 0 人",
    lastSavedLabel: "",
    submitting: false,
  },

  onLoad(query?: { taskId?: string; templateId?: string; projectId?: string; title?: string }) {
    const title = query?.title ? decodeURIComponent(query.title) : "能力评估";
    return this.load(query?.taskId || "", query?.templateId || "", query?.projectId || "", title);
  },

  async load(taskId: string, templateId: string, projectId: string, taskTitle: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!taskId || !templateId || !projectId) {
      this.setData({ state: "empty", statusTitle: "无法录入", message: "缺少测评项目参数，请返回项目列表后重试。", rows: [] });
      return;
    }

    const loadToken = ++latestLoadToken;
    this.setData({
      state: "loading",
      statusTitle: "正在读取全队名单",
      message: "",
      taskId,
      templateId,
      projectId,
      taskTitle,
      rows: [],
      fields: [],
      valuesByStudent: {},
      submitting: false,
    });

    try {
      const tasks = await getCoachAssessmentTasks();
      if (loadToken !== latestLoadToken) return;
      const task = tasks.find((item) => item.id === taskId);
      if (!isUsableTask(task, templateId)) {
        this.setData({ state: "empty", statusTitle: "无法录入", message: "当前测评任务不可录入，请返回任务列表后重试。" });
        return;
      }

      const [form, team] = await Promise.all([getAssessmentForm(templateId), getCoachTeam(task.teamId)]);
      if (loadToken !== latestLoadToken) return;
      const fields = form.fields.filter((field) => field.groupId === projectId && Boolean(field.id) && Boolean(field.testItemId));
      const members = team.members.filter((member) => Boolean(member.id) && Boolean(member.name));
      if (!form.templateVersionId || !fields.length || !members.length) {
        this.setData({
          state: "empty",
          statusTitle: "暂无可录入内容",
          message: !members.length ? "当前球队没有可录入的真实学员。" : "当前测评项目没有可录入的真实指标。",
          fields,
          rows: [],
        });
        return;
      }

      const signature = createSignature(fields, members);
      const valuesByStudent = restoreDraft(taskId, projectId, signature, fields, members);
      const projectIds = uniqueProjectIds(form.fields);
      const projectIndex = Math.max(0, projectIds.indexOf(projectId));
      this.setData({
        state: "ready",
        statusTitle: "全队录入",
        message: "",
        taskId: task.id,
        templateId: form.templateId,
        templateVersionId: form.templateVersionId,
        projectId,
        projectTitle: fields[0]?.groupLabel || "测评项目",
        taskTitle: task.title,
        teamName: team.team?.name?.trim() || "球队待同步",
        termLabel: task.termLabel?.trim() || "学期待同步",
        fields,
        rows: buildRows(members, fields, valuesByStudent),
        valuesByStudent,
        projectIds,
        projectIndex,
        filledLabel: buildFilledLabel(members, valuesByStudent),
        lastSavedLabel: hasDraftValues(valuesByStudent) ? "已恢复本机草稿" : "",
        submitting: false,
      });
    } catch {
      if (loadToken !== latestLoadToken) return;
      this.setData({ state: "error", statusTitle: "读取失败", message: "暂时无法读取全队测评信息，请稍后重试。", rows: [] });
    }
  },

  onRawInput(event: { currentTarget: { dataset: { studentId?: string; fieldId?: string } }; detail: { value: string | number } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const fieldId = event.currentTarget.dataset.fieldId;
    if (!studentId || !fieldId || !this.data.fields.some((field: AssessmentField) => field.id === fieldId)) return;
    const rawValue = String(event.detail.value ?? "");
    const valuesByStudent = { ...this.data.valuesByStudent, [studentId]: { ...(this.data.valuesByStudent[studentId] || {}) } };
    if (rawValue.trim()) valuesByStudent[studentId][fieldId] = rawValue;
    else {
      delete valuesByStudent[studentId][fieldId];
      if (!Object.keys(valuesByStudent[studentId]).length) delete valuesByStudent[studentId];
    }
    this.setData({ valuesByStudent, rows: buildRows(this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name })), this.data.fields, valuesByStudent), filledLabel: buildFilledLabel(this.data.rows, valuesByStudent) });
    this.persistDraft(valuesByStudent);
  },

  persistDraft(valuesByStudent: DraftValues) {
    if (!this.data.taskId || !this.data.projectId || !this.data.fields.length) return;
    const members = this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name }));
    wx.setStorageSync(draftKey(this.data.taskId, this.data.projectId), {
      signature: createSignature(this.data.fields, members),
      savedAt: new Date().toISOString(),
      valuesByStudent,
    } satisfies BulkDraft);
    this.setData({ lastSavedLabel: "草稿已保存在本机" });
  },

  saveDraft() {
    this.persistDraft(this.data.valuesByStudent);
  },

  async saveProject() {
    if (this.data.submitting) return;
    const members = this.data.rows.filter((row: BulkRow) => hasStudentValues(this.data.valuesByStudent[row.studentId]));
    if (!members.length) {
      wx.showToast({ title: "请先录入至少一名学员", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    const succeeded: string[] = [];
    for (const row of members) {
      const rawResults = buildRawResults(this.data.fields, this.data.valuesByStudent[row.studentId] || {});
      if (!rawResults.length) continue;
      try {
        await submitCoachAssessment({
          studentId: row.studentId,
          assessmentTaskId: this.data.taskId,
          templateId: this.data.templateId,
          templateVersionId: this.data.templateVersionId,
          rawResults,
        });
        succeeded.push(row.studentId);
      } catch {
        // Keep this student's draft so the coach can retry only the failed row.
      }
    }
    const valuesByStudent = withoutStudents(this.data.valuesByStudent, succeeded);
    if (hasDraftValues(valuesByStudent)) this.persistDraft(valuesByStudent);
    else wx.removeStorageSync(draftKey(this.data.taskId, this.data.projectId));
    this.setData({ submitting: false, valuesByStudent, rows: buildRows(this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name })), this.data.fields, valuesByStudent), filledLabel: buildFilledLabel(this.data.rows, valuesByStudent) });
    if (succeeded.length < members.length) wx.showToast({ title: "部分学员未保存，已保留草稿", icon: "none" });
    else wx.showToast({ title: `已保存${succeeded.length}名学员`, icon: "success" });
  },

  nextProject() {
    const nextProjectId = this.data.projectIds[this.data.projectIndex + 1];
    if (!nextProjectId) {
      openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
      return;
    }
    openPage(`/pages/coach/assessment-bulk-entry/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&projectId=${encodeURIComponent(nextProjectId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  retry() {
    void this.load(this.data.taskId, this.data.templateId, this.data.projectId, this.data.taskTitle);
  },
});

function isUsableTask(task: CoachAssessmentTask | undefined, templateId: string): task is CoachAssessmentTask {
  return Boolean(task && task.templateId === templateId && task.status === "in_progress");
}

function buildRows(members: Array<{ id: string; name: string }>, fields: AssessmentField[], valuesByStudent: DraftValues): BulkRow[] {
  return members.map((member) => {
    const values = valuesByStudent[member.id] || {};
    const metrics = fields.map((field) => {
      const value = values[field.id] || "";
      return {
        fieldId: field.id,
        label: field.label,
        inputType: field.inputType === "number" ? "digit" as const : "text" as const,
        value,
        unitLabel: displayUnit(field),
        placeholder: field.required ? "录入" : "选填",
        scoreLabel: value && field.valueKind === "score_0_100" ? `${value}分` : "待提交",
      };
    });
    const first = metrics[0];
    const hasValues = Object.keys(values).length > 0;
    return {
      studentId: member.id,
      name: member.name.trim().slice(0, 4),
      initials: member.name.trim().slice(0, 1) || "学",
      rawInputValue: first?.value || "",
      scoreLabel: first?.scoreLabel || "待提交",
      statusLabel: hasValues ? "已填写" : "待录入",
      metrics,
    };
  });
}

function buildFilledLabel(members: Array<{ id: string }>, valuesByStudent: DraftValues) {
  const filled = members.reduce((count, member) => count + (hasStudentValues(valuesByStudent[member.id]) ? 1 : 0), 0);
  return `已填写 ${filled} 人 · 未填写 ${Math.max(0, members.length - filled)} 人`;
}

function createSignature(fields: AssessmentField[], members: Array<{ id: string }>) {
  return `${fields.map((field) => `${field.id}:${field.testItemId}`).join("|")}::${members.map((member) => member.id).join("|")}`;
}

function restoreDraft(taskId: string, projectId: string, signature: string, fields: AssessmentField[], members: Array<{ id: string }>): DraftValues {
  const draft = wx.getStorageSync<BulkDraft | "">(draftKey(taskId, projectId));
  if (!draft || draft.signature !== signature || !draft.valuesByStudent) return {};
  const fieldIds = new Set(fields.map((field) => field.id));
  const valuesByStudent: DraftValues = {};
  for (const member of members) {
    const stored = draft.valuesByStudent[member.id];
    if (!stored) continue;
    const values: Record<string, string> = {};
    for (const [fieldId, value] of Object.entries(stored)) if (fieldIds.has(fieldId) && typeof value === "string") values[fieldId] = value;
    if (hasStudentValues(values)) valuesByStudent[member.id] = values;
  }
  return valuesByStudent;
}

function uniqueProjectIds(fields: AssessmentField[]) {
  const ids: string[] = [];
  for (const field of fields) if (field.groupId && !ids.includes(field.groupId)) ids.push(field.groupId);
  return ids;
}

function draftKey(taskId: string, projectId: string) {
  return `coach-assessment-bulk:${taskId}:${projectId}`;
}

function hasStudentValues(values: Record<string, string> | undefined) {
  return Boolean(values && Object.values(values).some((value) => Boolean(value.trim())));
}

function hasDraftValues(valuesByStudent: DraftValues) {
  return Object.values(valuesByStudent).some((values) => hasStudentValues(values));
}

function withoutStudents(valuesByStudent: DraftValues, studentIds: string[]) {
  const next = { ...valuesByStudent };
  for (const studentId of studentIds) delete next[studentId];
  return next;
}

function displayUnit(field: AssessmentField) {
  if (field.unit) return field.unit;
  const labels: Record<string, string> = { duration_seconds: "秒", duration_minutes: "分钟", distance_meters: "米", count: "次", percentage: "%", score_0_100: "分", rating_1_5: "分" };
  return labels[field.valueKind] || "";
}

function buildRawResults(fields: AssessmentField[], values: Record<string, string>) {
  const results: Array<{ testItemId: string; metricId?: string; value: Record<string, unknown> }> = [];
  for (const field of fields) {
    if (!field.testItemId) continue;
    const rawValue = values[field.id]?.trim();
    if (!rawValue) continue;
    const value = buildMetricValue(field.valueKind, rawValue, field.unit);
    if (value) results.push({ testItemId: field.testItemId, metricId: field.metricId, value });
  }
  return results;
}

function buildMetricValue(kind: string, rawValue: string, unit?: string): Record<string, unknown> | null {
  if (kind === "tag") return { kind, tag: rawValue };
  if (kind === "text") return { kind, text: rawValue };
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return null;
  if (kind === "rating_1_5") return { kind, score: Math.max(1, Math.min(5, Math.round(numeric))) };
  if (kind === "score_0_100") return { kind, score: Math.max(0, Math.min(100, numeric)) };
  if (kind === "count") return { kind, count: numeric };
  if (kind === "percentage") return { kind, percentage: numeric };
  if (kind === "duration_minutes") return { kind, minutes: numeric };
  if (kind === "duration_seconds") return { kind, seconds: numeric };
  if (kind === "distance_meters") return { kind, meters: numeric };
  return { kind: "measurement", value: numeric, unit: unit || "value" };
}
