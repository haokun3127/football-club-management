import { getAssessmentForm, getCoachWorkbench, submitCoachAssessment } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { AssessmentForm, CoachWorkbench, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];
type RawResultDraft = {
  testItemId: string;
  metricId?: string;
  value: Record<string, unknown> | null;
  note: string;
};

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取评测表单",
    eventId: "",
    form: null as AssessmentForm | null,
    roster: [] as CoachWorkbench["roster"],
    studentIndex: 0,
    values: [] as string[],
    saving: false,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.setData({ eventId: query?.eventId || "" });
    this.load(query?.templateId || "assessment-template-technical", query?.eventId || "");
  },
  async load(templateId: string, eventId: string) {
    try {
      const [form, workbench] = await Promise.all([
        getAssessmentForm(templateId),
        eventId ? getCoachWorkbench(eventId) : Promise.resolve(null),
      ]);
      this.setData({
        state: "ready",
        form,
        roster: workbench?.roster ?? [],
        values: form.fields.map(() => ""),
        message: "",
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  onStudentChange(event: { detail: { value: string | number } }) {
    this.setData({ studentIndex: Number(event.detail.value) });
  },
  onValueInput(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string | number } }) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;
    const values = [...this.data.values];
    values[index] = String(event.detail.value);
    this.setData({ values });
  },
  async submitAssessment() {
    if (!this.data.form || this.data.saving) return;
    const student = this.data.roster[this.data.studentIndex];
    if (!student?.studentId) {
      wx.showToast({ title: "请选择学员", icon: "none" });
      return;
    }
    const missingRequired = (this.data.form.fields as AssessmentField[]).some((field: AssessmentField, index: number) =>
      field.required && !(this.data.values[index] ?? "").trim(),
    );
    if (missingRequired) {
      wx.showToast({ title: "请填写必填项目", icon: "none" });
      return;
    }
    const rawResults = (this.data.form.fields as AssessmentField[])
      .map((field: AssessmentField, index: number) => ({ field, rawValue: this.data.values[index] ?? "" }))
      .filter((item: { field: AssessmentField; rawValue: string }) => item.field.testItemId && item.rawValue.trim())
      .map((item: { field: AssessmentField; rawValue: string }): RawResultDraft => ({
        testItemId: item.field.testItemId!,
        metricId: item.field.metricId,
        value: buildMetricValue(item.field.valueKind, item.rawValue, item.field.unit),
        note: "小程序手动提交",
      }))
      .filter((item: RawResultDraft) => item.value);

    if (!rawResults.length) {
      wx.showToast({ title: "请至少录入一项", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    try {
      await submitCoachAssessment({
        studentId: student.studentId,
        eventId: this.data.eventId,
        templateId: this.data.form.templateId,
        templateVersionId: this.data.form.templateVersionId,
        rawResults: rawResults as Array<{ testItemId: string; metricId?: string; value: Record<string, unknown>; note?: string }>,
      });
      wx.showToast({ title: "评测已提交", icon: "success" });
      this.setData({ values: this.data.form.fields.map(() => "") });
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "评测表单读取失败。";
}

function buildMetricValue(kind: string, rawValue: string, unit?: string): Record<string, unknown> | null {
  const text = rawValue.trim();
  if (!text) return null;
  const numeric = Number(text);

  switch (kind) {
    case "rating_1_5":
      if (!Number.isFinite(numeric)) return null;
      return { kind, score: Math.max(1, Math.min(5, Math.round(numeric))) };
    case "score_0_100":
      if (!Number.isFinite(numeric)) return null;
      return { kind, score: Math.max(0, Math.min(100, numeric)) };
    case "count":
      if (!Number.isFinite(numeric)) return null;
      return { kind, count: numeric };
    case "percentage":
      if (!Number.isFinite(numeric)) return null;
      return { kind, percentage: numeric };
    case "duration_minutes":
      if (!Number.isFinite(numeric)) return null;
      return { kind, minutes: numeric };
    case "duration_seconds":
      if (!Number.isFinite(numeric)) return null;
      return { kind, seconds: numeric };
    case "distance_meters":
      if (!Number.isFinite(numeric)) return null;
      return { kind, meters: numeric };
    case "measurement":
      if (!Number.isFinite(numeric)) return null;
      return { kind, value: numeric, unit: unit || "value" };
    case "tag":
      return { kind, tag: text };
    case "text":
      return { kind, text };
    default:
      if (!Number.isFinite(numeric)) return null;
      return { kind: "score_0_100", score: Math.max(0, Math.min(100, numeric)) };
  }
}
