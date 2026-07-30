import { getAssessmentForm, getCoachTeam, submitCoachAssessment } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { AssessmentForm, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];

interface SliderField extends AssessmentField {
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
}

interface StudentEntry {
  id: string;
  name: string;
  initial: string;
  values: Record<string, number>;
  average: string;
}

interface PageData {
  state: LoadState;
  message: string;
  templateId: string;
  templateVersionId: string;
  taskTitle: string;
  groups: string[];
  activeGroup: string;
  fields: SliderField[];
  students: StudentEntry[];
  submitting: boolean;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    templateId: "",
    templateVersionId: "",
    taskTitle: "能力评估",
    groups: [],
    activeGroup: "",
    fields: [],
    students: [],
    submitting: false,
  },
  onLoad(query: { templateId?: string; title?: string }) {
    this.load(query?.templateId || "", query?.title ? decodeURIComponent(query.title) : "能力评估");
  },
  async load(templateId: string, taskTitle: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!templateId) {
      this.setData({ state: "empty", message: "缺少测评模板参数，请从测评任务列表进入。" });
      return;
    }
    this.setData({ state: "loading", message: "正在读取测评表单", templateId, taskTitle });
    try {
      const [form, team] = await Promise.all([getAssessmentForm(templateId), getCoachTeam()]);
      const numericFields = form.fields.filter((field) =>
        field.valueKind !== "tag" && field.valueKind !== "text",
      );
      const fields: SliderField[] = numericFields.map((field) => ({
        ...field,
        sliderMin: field.minValue ?? (field.valueKind === "rating_1_5" ? 1 : 0),
        sliderMax: field.maxValue ?? (field.valueKind === "rating_1_5" ? 5 : 100),
        sliderStep: field.precision && field.precision > 0 ? 0.5 : 1,
      }));
      const groups = [...new Set(fields.map((field) => field.groupLabel || "评估项"))];
      const students: StudentEntry[] = team.members.map((member) => ({
        id: member.id,
        name: member.name,
        initial: member.name.slice(0, 1),
        values: {},
        average: "-",
      }));
      this.setData({
        state: fields.length && students.length ? "ready" : "empty",
        message: fields.length ? (students.length ? "" : "近 30 天暂无执教学员。") : "该模板暂无可录入的数值项。",
        templateVersionId: form.templateVersionId || "",
        groups,
        activeGroup: groups[0] || "",
        fields,
        students,
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "测评表单读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load(this.data.templateId, this.data.taskTitle);
  },
  selectGroup(event: { currentTarget: { dataset: { name: string } } }) {
    this.setData({ activeGroup: event.currentTarget.dataset.name });
  },
  onSliderChange(event: { currentTarget: { dataset: { studentId: string; fieldId: string } }; detail: { value: number } }) {
    const { studentId, fieldId } = event.currentTarget.dataset;
    const students = this.data.students.map((student: StudentEntry) => {
      if (student.id !== studentId) return student;
      const values = { ...student.values, [fieldId]: event.detail.value };
      const nums = Object.values(values) as number[];
      return {
        ...student,
        values,
        average: nums.length ? String(Math.round(nums.reduce((sum: number, value: number) => sum + value, 0) / nums.length)) : "-",
      };
    });
    this.setData({ students });
  },
  saveDraft() {
    wx.setStorageSync(`assessment-draft-${this.data.templateId}`, {
      savedAt: new Date().toISOString(),
      students: this.data.students.map((student: StudentEntry) => ({ id: student.id, values: student.values })),
    });
    wx.showToast({ title: "草稿已保存", icon: "success" });
  },
  async submit() {
    if (this.data.submitting) return;
    const filled = this.data.students.filter((student: StudentEntry) => Object.keys(student.values).length > 0);
    if (!filled.length) {
      wx.showToast({ title: "请先为至少一名学员评分", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      for (const student of filled) {
        const rawResults = this.data.fields
          .filter((field: SliderField) => student.values[field.id] !== undefined)
          .map((field: SliderField) => ({
            testItemId: field.testItemId || field.id,
            metricId: field.metricId,
            value: buildMetricValue(field.valueKind, student.values[field.id], field.unit) as Record<string, unknown>,
          }));
        await submitCoachAssessment({
          studentId: student.id,
          templateId: this.data.templateId,
          templateVersionId: this.data.templateVersionId || undefined,
          rawResults,
        });
      }
      wx.removeStorageSync(`assessment-draft-${this.data.templateId}`);
      wx.redirectTo({
        url: `/pages/coach/assessment-submit/index?title=${encodeURIComponent(this.data.taskTitle)}&count=${filled.length}`,
      });
    } catch (error) {
      this.setData({ submitting: false });
      wx.showToast({ title: error instanceof Error ? error.message : "提交失败，请稍后重试", icon: "none" });
    }
  },
});

function buildMetricValue(kind: string, value: number | undefined, unit?: string): Record<string, unknown> | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  if (kind === "rating_1_5") return { kind, score: Math.max(1, Math.min(5, Math.round(value))) };
  if (kind === "score_0_100") return { kind, score: Math.max(0, Math.min(100, value)) };
  if (kind === "count") return { kind, count: value };
  if (kind === "percentage") return { kind, percentage: value };
  if (kind === "duration_minutes") return { kind, minutes: value };
  if (kind === "duration_seconds") return { kind, seconds: value };
  if (kind === "distance_meters") return { kind, meters: value };
  return { kind: "measurement", value, unit: unit || "value" };
}
