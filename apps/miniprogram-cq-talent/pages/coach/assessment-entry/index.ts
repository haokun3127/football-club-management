import { getAssessmentForm, getCoachTeam, submitCoachAssessment } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { AssessmentForm, CoachTeamDetail, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];
type ValuesByStudent = Record<string, Record<string, number>>;

interface EntryField extends AssessmentField {
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
}

interface GroupOption {
  id: string;
  label: string;
  className: string;
}

interface StudentRow {
  fieldId: string;
  label: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderValue: number;
  value: number | null;
  valueLabel: string;
}

interface StudentEntry {
  id: string;
  name: string;
  initial: string;
  averageLabel: string;
  rows: StudentRow[];
}

interface AssessmentDraft {
  signature: string;
  savedAt: string;
  valuesByStudent: ValuesByStudent;
}

interface PageData {
  state: LoadState;
  statusTitle: string;
  statusActionText: string;
  message: string;
  templateId: string;
  templateVersionId: string;
  taskTitle: string;
  groups: GroupOption[];
  activeGroupId: string;
  fields: EntryField[];
  members: CoachTeamDetail["members"];
  students: StudentEntry[];
  valuesByStudent: ValuesByStudent;
  draftSignature: string;
  submitting: boolean;
  lastSavedLabel: string;
}

let latestLoadToken = 0;

Page<PageData>({
  data: {
    state: "idle",
    statusTitle: "能力评估录入",
    statusActionText: "",
    message: "",
    templateId: "",
    templateVersionId: "",
    taskTitle: "能力评估",
    groups: [],
    activeGroupId: "",
    fields: [],
    members: [],
    students: [],
    valuesByStudent: {},
    draftSignature: "",
    submitting: false,
    lastSavedLabel: "",
  },
  onLoad(query: { templateId?: string; title?: string }) {
    this.load(query?.templateId || "", query?.title ? decodeURIComponent(query.title) : "能力评估");
  },
  async load(templateId: string, taskTitle: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!templateId) {
      this.setData({
        state: "empty",
        statusTitle: "无法录入",
        statusActionText: "",
        message: "缺少评测模板参数，请从评测任务列表进入。",
      });
      return;
    }

    const loadToken = ++latestLoadToken;
    this.setData({
      state: "loading",
      statusTitle: "加载评测表单",
      statusActionText: "",
      message: "正在读取评测表单。",
      templateId,
      taskTitle,
      submitting: false,
    });

    try {
      const [form, team] = await Promise.all([getAssessmentForm(templateId), getCoachTeam()]);
      if (loadToken !== latestLoadToken) return;

      const fields = toEntryFields(form);
      if (!fields || !form.templateVersionId) {
        this.setData({
          state: "empty",
          statusTitle: "无法录入",
          statusActionText: "",
          message: "当前评测表单没有可安全录入的真实项目。",
          templateVersionId: "",
          groups: [],
          activeGroupId: "",
          fields: [],
          members: [],
          students: [],
          valuesByStudent: {},
          draftSignature: "",
        });
        return;
      }

      const members = team.members.filter((member) => Boolean(member.id) && Boolean(member.name));
      if (!members.length) {
        this.setData({
          state: "empty",
          statusTitle: "暂无学员",
          statusActionText: "",
          message: "当前没有可录入的真实学员。",
          templateVersionId: form.templateVersionId,
          groups: [],
          activeGroupId: "",
          fields,
          members: [],
          students: [],
          valuesByStudent: {},
          draftSignature: "",
        });
        return;
      }

      const groups = buildGroups(fields);
      const activeGroupId = groups[0]?.id || "";
      const signature = createDraftSignature(fields, members);
      const valuesByStudent = restoreDraft(templateId, form.templateVersionId, signature, fields, members);
      this.setData({
        state: "ready",
        statusTitle: "能力评估录入",
        statusActionText: "",
        message: "",
        templateVersionId: form.templateVersionId,
        groups,
        activeGroupId,
        fields,
        members,
        students: buildStudentEntries(members, fields, activeGroupId, valuesByStudent),
        valuesByStudent,
        draftSignature: signature,
        lastSavedLabel: hasValues(valuesByStudent) ? "已恢复本机草稿" : "",
      });
    } catch {
      if (loadToken !== latestLoadToken) return;
      this.setData({
        state: "error",
        statusTitle: "读取失败",
        statusActionText: "重试",
        message: "暂时无法读取评测信息，请稍后重试。",
      });
    }
  },
  retry() {
    this.load(this.data.templateId, this.data.taskTitle);
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  selectGroup(event: { currentTarget: { dataset: { id: string } } }) {
    const activeGroupId = event.currentTarget.dataset.id;
    if (!this.data.groups.some((group: GroupOption) => group.id === activeGroupId)) return;
    this.setData({
      activeGroupId,
      groups: updateGroupClasses(this.data.groups, activeGroupId),
      students: buildStudentEntries(this.data.members, this.data.fields, activeGroupId, this.data.valuesByStudent),
    });
  },
  onSliderChange(event: { currentTarget: { dataset: { studentId: string; fieldId: string } }; detail: { value: number } }) {
    const { studentId, fieldId } = event.currentTarget.dataset;
    const field = this.data.fields.find((item: EntryField) => item.id === fieldId);
    if (!field || !this.data.members.some((member: CoachTeamDetail["members"][number]) => member.id === studentId)) return;
    const value = Number(event.detail.value);
    if (!Number.isFinite(value) || value < field.sliderMin || value > field.sliderMax) return;

    const valuesByStudent = {
      ...this.data.valuesByStudent,
      [studentId]: {
        ...(this.data.valuesByStudent[studentId] ?? {}),
        [fieldId]: value,
      },
    };
    this.setData({
      valuesByStudent,
      students: buildStudentEntries(this.data.members, this.data.fields, this.data.activeGroupId, valuesByStudent),
    });
    this.persistDraft(valuesByStudent);
  },
  saveDraft() {
    this.persistDraft(this.data.valuesByStudent);
  },
  persistDraft(valuesByStudent: ValuesByStudent) {
    if (!this.data.templateId || !this.data.templateVersionId || !this.data.draftSignature) return;
    wx.setStorageSync(draftKey(this.data.templateId, this.data.templateVersionId), {
      signature: this.data.draftSignature,
      savedAt: new Date().toISOString(),
      valuesByStudent,
    } satisfies AssessmentDraft);
    this.setData({ lastSavedLabel: "草稿已保存在本机" });
  },
  async submit() {
    if (this.data.submitting) return;
    const selectedStudents = this.data.members.filter((member: CoachTeamDetail["members"][number]) => hasStudentValues(this.data.valuesByStudent[member.id]));
    if (!selectedStudents.length) {
      wx.showToast({ title: "请先录入至少一名学员", icon: "none" });
      return;
    }

    this.setData({ submitting: true });
    const confirmedStudentIds: string[] = [];
    const unconfirmedStudentIds: string[] = [];
    for (const student of selectedStudents) {
      const rawResults = buildRawResults(this.data.fields, this.data.valuesByStudent[student.id] ?? {});
      if (!rawResults.length) {
        unconfirmedStudentIds.push(student.id);
        continue;
      }
      try {
        await submitCoachAssessment({
          studentId: student.id,
          templateId: this.data.templateId,
          templateVersionId: this.data.templateVersionId,
          rawResults,
        });
        confirmedStudentIds.push(student.id);
      } catch {
        unconfirmedStudentIds.push(student.id);
      }
    }

    const valuesByStudent = clearConfirmedStudents(this.data.valuesByStudent, confirmedStudentIds);
    if (hasValues(valuesByStudent)) {
      this.persistDraft(valuesByStudent);
    } else {
      wx.removeStorageSync(draftKey(this.data.templateId, this.data.templateVersionId));
    }
    this.setData({
      submitting: false,
      valuesByStudent,
      students: buildStudentEntries(this.data.members, this.data.fields, this.data.activeGroupId, valuesByStudent),
    });

    if (unconfirmedStudentIds.length) {
      wx.showToast({ title: "部分评测未确认，已保留草稿", icon: "none" });
      return;
    }

    wx.redirectTo({
      url: `/pages/coach/assessment-submit/index?title=${encodeURIComponent(this.data.taskTitle)}&count=${confirmedStudentIds.length}`,
    });
  },
});

function toEntryFields(form: AssessmentForm): EntryField[] | null {
  if (!form.fields.length) return [];
  if (form.fields.some((field) => !field.testItemId || !field.groupId || !supportsNumericValue(field.valueKind))) return null;
  return form.fields.map((field) => ({
    ...field,
    sliderMin: field.minValue ?? (field.valueKind === "rating_1_5" ? 1 : 0),
    sliderMax: field.maxValue ?? (field.valueKind === "rating_1_5" ? 5 : 100),
    sliderStep: field.precision && field.precision > 0 ? 0.5 : 1,
  }));
}

function supportsNumericValue(kind: string) {
  return [
    "rating_1_5",
    "score_0_100",
    "count",
    "percentage",
    "duration_minutes",
    "duration_seconds",
    "distance_meters",
    "measurement",
  ].includes(kind);
}

function buildGroups(fields: EntryField[]) {
  const seen = new Set<string>();
  const groups: GroupOption[] = [];
  for (const field of fields) {
    if (seen.has(field.groupId)) continue;
    seen.add(field.groupId);
    groups.push({
      id: field.groupId,
      label: field.groupLabel,
      className: groups.length === 0 ? "c15-group c15-group--active" : "c15-group",
    });
  }
  return groups;
}

function updateGroupClasses(groups: GroupOption[], activeGroupId: string) {
  return groups.map((group) => ({
    ...group,
    className: group.id === activeGroupId ? "c15-group c15-group--active" : "c15-group",
  }));
}

function buildStudentEntries(
  members: CoachTeamDetail["members"],
  fields: EntryField[],
  activeGroupId: string,
  valuesByStudent: ValuesByStudent,
) {
  const activeFields = fields.filter((field) => field.groupId === activeGroupId);
  return members.map((member) => {
    const values = valuesByStudent[member.id] ?? {};
    const numericValues = Object.values(values).filter((value) => Number.isFinite(value));
    return {
      id: member.id,
      name: member.name,
      initial: member.name.slice(0, 1),
      averageLabel: numericValues.length ? String(Math.round(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length)) : "--",
      rows: activeFields.map((field) => {
        const value = values[field.id];
        return {
          fieldId: field.id,
          label: field.label,
          sliderMin: field.sliderMin,
          sliderMax: field.sliderMax,
          sliderStep: field.sliderStep,
          sliderValue: value ?? field.sliderMin,
          value: value ?? null,
          valueLabel: value === undefined ? "--" : String(value),
        };
      }),
    } satisfies StudentEntry;
  });
}

function draftKey(templateId: string, templateVersionId: string) {
  return `coach-assessment-entry:${templateId}:${templateVersionId}`;
}

function createDraftSignature(fields: EntryField[], members: CoachTeamDetail["members"]) {
  const fieldParts = fields.map((field) => `${field.id}:${field.testItemId}`).sort().join("|");
  const memberParts = members.map((member) => member.id).sort().join("|");
  return `${fieldParts}::${memberParts}`;
}

function restoreDraft(
  templateId: string,
  templateVersionId: string,
  signature: string,
  fields: EntryField[],
  members: CoachTeamDetail["members"],
): ValuesByStudent {
  const candidate = wx.getStorageSync<AssessmentDraft | "">(draftKey(templateId, templateVersionId));
  if (!candidate || candidate.signature !== signature || !candidate.valuesByStudent) return {};

  const fieldIds = new Set(fields.map((field) => field.id));
  const valuesByStudent: ValuesByStudent = {};
  for (const member of members) {
    const storedValues = candidate.valuesByStudent[member.id];
    if (!storedValues) continue;
    const nextValues: Record<string, number> = {};
    for (const [fieldId, value] of Object.entries(storedValues)) {
      if (fieldIds.has(fieldId) && Number.isFinite(value)) nextValues[fieldId] = value;
    }
    if (hasStudentValues(nextValues)) valuesByStudent[member.id] = nextValues;
  }
  return valuesByStudent;
}

function buildRawResults(fields: EntryField[], values: Record<string, number>) {
  return fields.flatMap((field) => {
    const value = values[field.id];
    if (value === undefined || !Number.isFinite(value) || !field.testItemId) return [];
    const metricValue = buildMetricValue(field.valueKind, value, field.unit);
    return metricValue ? [{ testItemId: field.testItemId, metricId: field.metricId, value: metricValue }] : [];
  });
}

function buildMetricValue(kind: string, value: number, unit?: string): Record<string, unknown> | null {
  if (kind === "rating_1_5") return { kind, score: Math.max(1, Math.min(5, Math.round(value))) };
  if (kind === "score_0_100") return { kind, score: Math.max(0, Math.min(100, value)) };
  if (kind === "count") return { kind, count: value };
  if (kind === "percentage") return { kind, percentage: value };
  if (kind === "duration_minutes") return { kind, minutes: value };
  if (kind === "duration_seconds") return { kind, seconds: value };
  if (kind === "distance_meters") return { kind, meters: value };
  if (kind === "measurement") return { kind, value, unit: unit || "value" };
  return null;
}

function clearConfirmedStudents(valuesByStudent: ValuesByStudent, studentIds: string[]) {
  const next = { ...valuesByStudent };
  for (const studentId of studentIds) delete next[studentId];
  return next;
}

function hasStudentValues(values: Record<string, number> | undefined) {
  return Boolean(values && Object.keys(values).length);
}

function hasValues(valuesByStudent: ValuesByStudent) {
  return Object.values(valuesByStudent).some((values) => hasStudentValues(values));
}
