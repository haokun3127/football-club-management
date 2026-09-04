import { getAssessmentForm, getCoachAssessmentEntries, getCoachAssessmentTasks, getCoachTeam, submitCoachAssessment } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { AssessmentForm, CoachAssessmentEntries, CoachAssessmentTask, CoachTeamDetail, LoadState } from "../../../utils/types";

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
  savedStudentIds: string[];
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
  savedValuesByStudent: DraftValues;
  valuesByStudent: DraftValues;
  savedStudentIds: string[];
  projectIds: string[];
  projectIndex: number;
  filledLabel: string;
  lastSavedLabel: string;
  readOnly: boolean;
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
    savedValuesByStudent: {},
    valuesByStudent: {},
    savedStudentIds: [],
    projectIds: [],
    projectIndex: 0,
    filledLabel: "已填写 0 人 · 未填写 0 人",
    lastSavedLabel: "",
    readOnly: false,
    submitting: false,
  },

  onLoad(query?: { taskId?: string; templateId?: string; projectId?: string; projectIds?: string; title?: string }) {
    const title = query?.title ? decodeURIComponent(query.title) : "能力评估";
    const selectedProjectIds = query?.projectIds ? decodeURIComponent(query.projectIds).split(",").filter(Boolean) : [];
    return this.load(query?.taskId || "", query?.templateId || "", query?.projectId || "", title, selectedProjectIds);
  },

  async load(taskId: string, templateId: string, projectId: string, taskTitle: string, selectedProjectIds: string[] = []) {
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
      savedValuesByStudent: {},
      valuesByStudent: {},
      savedStudentIds: [],
      readOnly: false,
      submitting: false,
    });

    try {
      const tasks = await getCoachAssessmentTasks({ forceRefresh: true });
      if (loadToken !== latestLoadToken) return;
      const task = tasks.find((item) => item.id === taskId);
      if (!isUsableTask(task, templateId)) {
        this.setData({ state: "empty", statusTitle: "无法录入", message: "当前测评任务不可录入，请返回任务列表后重试。" });
        return;
      }

      const [form, team, savedEntries] = await Promise.all([
        getAssessmentForm(templateId),
        getCoachTeam(task.teamId),
        getCoachAssessmentEntries(task.id, projectId),
      ]);
      if (loadToken !== latestLoadToken) return;
      const fields = form.fields.filter((field) =>
        (field.id === projectId || field.testItemId === projectId || field.groupId === projectId)
        && Boolean(field.id)
        && Boolean(field.testItemId),
      );
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
      const savedValuesByStudent = normalizeSavedValues(savedEntries, fields, members);
      const draftValuesByStudent = restoreDraft(taskId, projectId, signature, fields, members);
      const valuesByStudent = mergeValues(savedValuesByStudent, draftValuesByStudent);
      const savedStudentIds = Object.keys(savedValuesByStudent);
      const availableProjectIds = uniqueProjectIds(form.fields);
      const projectIds = selectedProjectIds.length
        ? availableProjectIds.filter((id) => selectedProjectIds.includes(id))
        : availableProjectIds;
      const projectIndex = Math.max(0, projectIds.indexOf(projectId));
      const readOnly = task.status === "completed";
      this.setData({
        state: "ready",
        statusTitle: "全队录入",
        message: "",
        taskId: task.id,
        templateId: form.templateId,
        templateVersionId: form.templateVersionId,
        projectId,
        projectTitle: fields[0]?.label || fields[0]?.groupLabel || "测评项目",
        taskTitle: task.title,
        teamName: team.team?.name?.trim() || "球队待同步",
        termLabel: task.termLabel?.trim() || "学期待同步",
        fields,
        rows: buildRows(members, fields, valuesByStudent, savedStudentIds),
        savedValuesByStudent,
        valuesByStudent,
        savedStudentIds,
        projectIds,
        projectIndex,
        filledLabel: readOnly ? buildCompletedLabel(members, valuesByStudent) : buildFilledLabel(members, valuesByStudent),
        lastSavedLabel: savedStudentIds.length ? "已恢复已保存成绩" : hasDraftValues(valuesByStudent) ? "已恢复本机草稿" : "",
        readOnly,
        submitting: false,
      });
    } catch {
      if (loadToken !== latestLoadToken) return;
      this.setData({ state: "error", statusTitle: "读取失败", message: "暂时无法读取全队测评信息，请稍后重试。", rows: [] });
    }
  },

  onRawInput(event: { currentTarget: { dataset: { studentId?: string; fieldId?: string } }; detail: { value: string | number } }) {
    if (this.data.readOnly) return;
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
    const savedValue = this.data.savedValuesByStudent[studentId]?.[fieldId];
    if (!rawValue.trim() && savedValue) valuesByStudent[studentId][fieldId] = savedValue;
    const members = this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name }));
    this.setData({ valuesByStudent, rows: buildRows(members, this.data.fields, valuesByStudent, this.data.savedStudentIds), filledLabel: buildFilledLabel(members, valuesByStudent) });
    const draftValuesByStudent = changedValues(valuesByStudent, this.data.savedValuesByStudent);
    if (hasDraftValues(draftValuesByStudent)) this.persistDraft(draftValuesByStudent);
    else wx.removeStorageSync(draftKey(this.data.taskId, this.data.projectId));
  },

  persistDraft(valuesByStudent: DraftValues) {
    if (!this.data.taskId || !this.data.projectId || !this.data.fields.length) return;
    this.writeDraft(valuesByStudent);
    this.setData({ lastSavedLabel: "草稿已保存在本机" });
  },

  writeDraft(valuesByStudent: DraftValues) {
    if (!this.data.taskId || !this.data.projectId || !this.data.fields.length) return;
    const members = this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name }));
    wx.setStorageSync(draftKey(this.data.taskId, this.data.projectId), {
      signature: createSignature(this.data.fields, members),
      savedAt: new Date().toISOString(),
      valuesByStudent,
      savedStudentIds: this.data.savedStudentIds,
    } satisfies BulkDraft);
  },

  saveDraft() {
    this.persistDraft(this.data.valuesByStudent);
  },

  async saveProject() {
    if (this.data.readOnly) {
      wx.showToast({ title: "任务已完成，仅支持查看已保存成绩", icon: "none" });
      return;
    }
    if (this.data.submitting) return;
    const pendingValuesByStudent = changedValues(this.data.valuesByStudent, this.data.savedValuesByStudent);
    const members = this.data.rows.filter((row: BulkRow) => hasStudentValues(pendingValuesByStudent[row.studentId]));
    if (!members.length) {
      wx.showToast({ title: "请先录入至少一名学员", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    const succeeded: string[] = [];
    for (const row of members) {
      const rawResults = buildRawResults(this.data.fields, pendingValuesByStudent[row.studentId] || {});
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
    const draftValuesByStudent = withoutStudents(pendingValuesByStudent, succeeded);
    if (hasDraftValues(draftValuesByStudent)) this.writeDraft(draftValuesByStudent);
    else wx.removeStorageSync(draftKey(this.data.taskId, this.data.projectId));
    const savedValuesByStudent = { ...this.data.savedValuesByStudent };
    for (const studentId of succeeded) {
      savedValuesByStudent[studentId] = { ...(this.data.valuesByStudent[studentId] || {}) };
    }
    const valuesByStudent = mergeValues(savedValuesByStudent, draftValuesByStudent);
    const savedStudentIds = Array.from(new Set([...this.data.savedStudentIds, ...succeeded]));
    this.setData({
      submitting: false,
      savedValuesByStudent,
      savedStudentIds,
      valuesByStudent,
      rows: buildRows(this.data.rows.map((row: BulkRow) => ({ id: row.studentId, name: row.name })), this.data.fields, valuesByStudent, savedStudentIds),
      filledLabel: buildFilledLabel(this.data.rows.map((row: BulkRow) => ({ id: row.studentId })), valuesByStudent),
      lastSavedLabel: succeeded.length ? `已保存${succeeded.length}名学员` : this.data.lastSavedLabel,
    });
    if (succeeded.length < members.length) wx.showToast({ title: "部分学员未保存，已保留草稿", icon: "none" });
    else wx.showToast({ title: `已保存${succeeded.length}名学员`, icon: "success" });
  },

  nextProject() {
    if (this.data.readOnly) {
      openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
      return;
    }
    const nextProjectId = this.data.projectIds[this.data.projectIndex + 1];
    if (!nextProjectId) {
      openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&title=${encodeURIComponent(this.data.taskTitle)}`);
      return;
    }
    openPage(`/pages/coach/assessment-bulk-entry/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&projectId=${encodeURIComponent(nextProjectId)}&projectIds=${encodeURIComponent(this.data.projectIds.join(","))}&title=${encodeURIComponent(this.data.taskTitle)}`);
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  retry() {
    void this.load(this.data.taskId, this.data.templateId, this.data.projectId, this.data.taskTitle);
  },
});

function isUsableTask(task: CoachAssessmentTask | undefined, templateId: string): task is CoachAssessmentTask {
  return Boolean(task && task.templateId === templateId && (task.status === "in_progress" || task.status === "completed"));
}

function buildRows(members: Array<{ id: string; name: string }>, fields: AssessmentField[], valuesByStudent: DraftValues, savedStudentIds: string[] = []): BulkRow[] {
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
      statusLabel: savedStudentIds.includes(member.id) ? "已保存" : hasValues ? "已填写" : "待录入",
      metrics,
    };
  });
}

function normalizeSavedValues(response: CoachAssessmentEntries, fields: AssessmentField[], members: Array<{ id: string }>): DraftValues {
  const valuesByStudent: DraftValues = {};
  const fieldByTestItemId = new Map(fields.map((field) => [field.testItemId, field]));
  for (const member of members) {
    const stored = response.savedValuesByStudent?.[member.id];
    if (!stored) continue;
    const values: Record<string, string> = {};
    for (const [testItemId, value] of Object.entries(stored)) {
      const field = fieldByTestItemId.get(testItemId);
      const rawValue = formatSavedValue(field, value);
      if (field && rawValue) values[field.id] = rawValue;
    }
    if (hasStudentValues(values)) valuesByStudent[member.id] = values;
  }
  return valuesByStudent;
}

function formatSavedValue(field: AssessmentField | undefined, value: Record<string, unknown>) {
  if (!field || !value || typeof value !== "object") return "";
  const numeric = value.score ?? value.count ?? value.percentage ?? value.minutes ?? value.seconds ?? value.meters ?? value.value;
  if (typeof numeric === "number" && Number.isFinite(numeric)) return String(numeric);
  if (typeof value.text === "string") return value.text;
  if (typeof value.tag === "string") return value.tag;
  return "";
}

function mergeValues(base: DraftValues, override: DraftValues): DraftValues {
  const merged: DraftValues = {};
  for (const [studentId, values] of Object.entries(base)) merged[studentId] = { ...values };
  for (const [studentId, values] of Object.entries(override)) merged[studentId] = { ...(merged[studentId] || {}), ...values };
  return merged;
}

function buildFilledLabel(members: Array<{ id: string }>, valuesByStudent: DraftValues) {
  const filled = members.reduce((count, member) => count + (hasStudentValues(valuesByStudent[member.id]) ? 1 : 0), 0);
  return `已填写 ${filled} 人 · 未填写 ${Math.max(0, members.length - filled)} 人`;
}

function buildCompletedLabel(members: Array<{ id: string }>, valuesByStudent: DraftValues) {
  const completed = members.reduce((count, member) => count + (hasStudentValues(valuesByStudent[member.id]) ? 1 : 0), 0);
  return `全队 ${completed} 人已完成 · 成绩已保存`;
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
  for (const field of fields) {
    const id = field.testItemId || field.id || field.groupId;
    if (id && !ids.includes(id)) ids.push(id);
  }
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

function changedValues(valuesByStudent: DraftValues, savedValuesByStudent: DraftValues): DraftValues {
  const changed: DraftValues = {};
  for (const [studentId, values] of Object.entries(valuesByStudent)) {
    const saved = savedValuesByStudent[studentId] || {};
    const next: Record<string, string> = {};
    for (const [fieldId, value] of Object.entries(values)) {
      if (value.trim() && saved[fieldId] !== value) next[fieldId] = value;
    }
    if (hasStudentValues(next)) changed[studentId] = next;
  }
  return changed;
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
