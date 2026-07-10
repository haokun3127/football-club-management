import { getAssessmentForm, getCoachWorkbench, submitCoachAssessment } from "../../../utils/api";
import { clearAssessmentDraftStudents, draftProgress, loadAssessmentDraft, saveAssessmentDraftEntry, type AssessmentDraftMap } from "../../../utils/assessment-draft";
import { requireRole } from "../../../utils/auth";
import type { AssessmentForm, CoachWorkbench, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];
type DraftRow = { studentId: string; name: string; status: "empty" | "recorded" | "missing"; rawValue: string; missingReason: string; invalid: boolean };

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取评测表单",
    eventId: "",
    form: null as AssessmentForm | null,
    roster: [] as CoachWorkbench["roster"],
    groupOptions: [] as Array<{ id: string; label: string }>,
    activeGroupId: "",
    fieldsInGroup: [] as AssessmentField[],
    fieldIndex: 0,
    currentField: null as AssessmentField | null,
    draft: {} as AssessmentDraftMap,
    draftRows: [] as DraftRow[],
    completedCount: 0,
    totalCount: 0,
    saving: false,
    submitMessage: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    const eventId = query?.eventId || "";
    this.setData({ eventId });
    this.load(query?.templateId || "assessment-template-technical", eventId);
  },
  async load(templateId: string, eventId: string) {
    try {
      const [form, workbench] = await Promise.all([
        getAssessmentForm(templateId),
        eventId ? getCoachWorkbench(eventId) : Promise.resolve(null),
      ]);
      const groups = uniqueGroups(form.fields);
      const activeGroupId = groups[0]?.id ?? "";
      const fieldsInGroup = form.fields.filter((field) => field.groupId === activeGroupId);
      const draft = loadAssessmentDraft(eventId, form.templateVersionId ?? form.templateId);
      this.setData({
        state: workbench?.roster.length ? "ready" : "empty",
        form,
        roster: workbench?.roster ?? [],
        groupOptions: groups,
        activeGroupId,
        fieldsInGroup,
        fieldIndex: 0,
        currentField: fieldsInGroup[0] ?? null,
        draft,
        message: workbench?.roster.length ? "" : "当前活动没有可评测学员。",
      });
      this.refreshDraftView();
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  switchGroup(event: { currentTarget: { dataset: { id?: string } } }) {
    const activeGroupId = event.currentTarget.dataset.id;
    if (!activeGroupId || !this.data.form) return;
    const fieldsInGroup = this.data.form.fields.filter((field: AssessmentField) => field.groupId === activeGroupId);
    this.setData({ activeGroupId, fieldsInGroup, fieldIndex: 0, currentField: fieldsInGroup[0] ?? null });
    this.refreshDraftView();
  },
  onFieldChange(event: { detail: { value: string | number } }) {
    const fieldIndex = Number(event.detail.value);
    const currentField = this.data.fieldsInGroup[fieldIndex];
    if (!currentField) return;
    this.setData({ fieldIndex, currentField });
    this.refreshDraftView();
  },
  previousField() {
    if (this.data.fieldIndex <= 0) return;
    const fieldIndex = this.data.fieldIndex - 1;
    this.setData({ fieldIndex, currentField: this.data.fieldsInGroup[fieldIndex] });
    this.refreshDraftView();
  },
  nextField() {
    if (this.data.fieldIndex >= this.data.fieldsInGroup.length - 1) return;
    const fieldIndex = this.data.fieldIndex + 1;
    this.setData({ fieldIndex, currentField: this.data.fieldsInGroup[fieldIndex] });
    this.refreshDraftView();
  },
  onValueInput(event: { currentTarget: { dataset: { studentId?: string } }; detail: { value: string | number } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const field = this.data.currentField;
    if (!studentId || !field?.testItemId || !this.data.form) return;
    const rawValue = String(event.detail.value);
    const draft = saveAssessmentDraftEntry(this.data.eventId, this.data.form.templateVersionId ?? this.data.form.templateId, {
      studentId,
      testItemId: field.testItemId,
      status: rawValue.trim() ? "recorded" : "empty",
      rawValue,
    });
    this.setData({ draft, submitMessage: "已保存到本机" });
    this.refreshDraftView();
  },
  toggleMissing(event: { currentTarget: { dataset: { studentId?: string } } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const field = this.data.currentField;
    if (!studentId || !field?.testItemId || !this.data.form) return;
    const current = this.rowFor(studentId, field.testItemId);
    const status = current.status === "missing" ? "empty" : "missing";
    const draft = saveAssessmentDraftEntry(this.data.eventId, this.data.form.templateVersionId ?? this.data.form.templateId, {
      studentId,
      testItemId: field.testItemId,
      status,
      rawValue: status === "missing" ? "" : current.rawValue,
      missingReason: status === "missing" ? current.missingReason || "未参加" : undefined,
    });
    this.setData({ draft, submitMessage: "已保存到本机" });
    this.refreshDraftView();
  },
  onMissingReasonInput(event: { currentTarget: { dataset: { studentId?: string } }; detail: { value: string } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const field = this.data.currentField;
    if (!studentId || !field?.testItemId || !this.data.form) return;
    const draft = saveAssessmentDraftEntry(this.data.eventId, this.data.form.templateVersionId ?? this.data.form.templateId, {
      studentId,
      testItemId: field.testItemId,
      status: "missing",
      missingReason: event.detail.value,
    });
    this.setData({ draft, submitMessage: "已保存到本机" });
    this.refreshDraftView();
  },
  rowFor(studentId: string, testItemId: string) {
    return this.data.draft[`${studentId}:${testItemId}`] ?? { status: "empty", rawValue: "", missingReason: "" };
  },
  refreshDraftView() {
    const field = this.data.currentField;
    const form = this.data.form;
    if (!field?.testItemId || !form) return;
    const draftRows = this.data.roster.map((student: CoachWorkbench["roster"][number]) => {
      const entry = this.rowFor(student.studentId, field.testItemId!);
      return {
        studentId: student.studentId,
        name: student.name,
        status: entry.status,
        rawValue: entry.rawValue,
        missingReason: entry.missingReason ?? "",
        invalid: entry.status === "recorded" && !validFieldValue(field, entry.rawValue),
      };
    });
    const progress = draftProgress(this.data.draft, this.data.roster.map((student: CoachWorkbench["roster"][number]) => student.studentId), form.fields.map((item: AssessmentField) => item.testItemId!).filter(Boolean));
    this.setData({ draftRows, completedCount: progress.completed, totalCount: progress.total });
  },
  async submitAssessment() {
    const form = this.data.form;
    if (!form || this.data.saving) return;
    const recordedStudents = this.data.roster.filter((student: CoachWorkbench["roster"][number]) =>
      form.fields.some((field: AssessmentField) => this.rowFor(student.studentId, field.testItemId!).status === "recorded"),
    );
    const hasInvalid = form.fields.some((field: AssessmentField) => this.data.roster.some((student: CoachWorkbench["roster"][number]) => {
      const entry = this.rowFor(student.studentId, field.testItemId!);
      return entry.status === "recorded" && !validFieldValue(field, entry.rawValue);
    }));
    if (hasInvalid) {
      wx.showToast({ title: "请先修正超出范围的成绩", icon: "none" });
      return;
    }
    if (!recordedStudents.length) {
      wx.showToast({ title: "请先录入至少一项成绩", icon: "none" });
      return;
    }
    this.setData({ saving: true, submitMessage: "正在提交" });
    const succeeded: string[] = [];
    const failed: string[] = [];
    for (const student of recordedStudents) {
      const rawResults = form.fields.flatMap((field: AssessmentField) => {
        const entry = this.rowFor(student.studentId, field.testItemId!);
        const value = entry.status === "recorded" ? buildMetricValue(field.valueKind, entry.rawValue, field.unit) : null;
        return field.testItemId && value ? [{ testItemId: field.testItemId, metricId: field.metricId, value, note: "小程序现场录入" }] : [];
      });
      try {
        await submitCoachAssessment({
          studentId: student.studentId,
          eventId: this.data.eventId,
          templateId: form.templateId,
          templateVersionId: form.templateVersionId,
          rawResults,
        });
        succeeded.push(student.studentId);
      } catch (_error) {
        failed.push(student.studentId);
      }
    }
    const draft = clearAssessmentDraftStudents(this.data.eventId, form.templateVersionId ?? form.templateId, succeeded);
    this.setData({
      saving: false,
      draft,
      submitMessage: `已提交 ${succeeded.length} 人${failed.length ? `，${failed.length} 人失败并保留草稿` : ""}`,
    });
    this.refreshDraftView();
  },
});

function uniqueGroups(fields: AssessmentField[]) {
  const groups = new Map<string, string>();
  fields.forEach((field) => groups.set(field.groupId, field.groupLabel));
  return [...groups.entries()].map(([id, label]) => ({ id, label }));
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "评测表单读取失败。";
}

function buildMetricValue(kind: string, rawValue: string, unit?: string): Record<string, unknown> | null {
  const text = rawValue.trim();
  if (!text) return null;
  const numeric = Number(text);
  if (kind === "tag") return { kind, tag: text };
  if (kind === "text") return { kind, text };
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

function validFieldValue(field: AssessmentField, rawValue: string) {
  if (field.valueKind === "tag" || field.valueKind === "text") return Boolean(rawValue.trim());
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return false;
  if (field.minValue !== undefined && numeric < field.minValue) return false;
  if (field.maxValue !== undefined && numeric > field.maxValue) return false;
  return true;
}
