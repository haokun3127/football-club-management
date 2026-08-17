import { getAssessmentForm, getCoachWorkbench, submitCoachAssessment } from "../../../utils/api";
import { clearAssessmentDraftStudents, draftProgress, loadAssessmentDraft, saveAssessmentDraftEntry, type AssessmentDraftMap } from "../../../utils/assessment-draft";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { AssessmentForm, CoachWorkbench, LoadState } from "../../../utils/types";

type AssessmentField = AssessmentForm["fields"][number];
type RosterStudent = CoachWorkbench["roster"][number];
type GroupView = { id: string; label: string; className: string };
type MetricCell = {
  testItemId: string;
  label: string;
  rawValue: string;
  inputType: "digit" | "text";
  placeholder: string;
  status: "empty" | "recorded" | "missing";
  statusLabel: string;
  statusClass: string;
  showInput: boolean;
};
type DraftRow = {
  studentId: string;
  name: string;
  initials: string;
  status: "empty" | "recorded" | "missing";
  rawValue: string;
  missingReason: string;
  invalid: boolean;
  statusLabel: string;
  statusClass: string;
  showInput: boolean;
  showMissingReason: boolean;
  missingActionLabel: string;
  invalidHint: string;
  metricCells: MetricCell[];
};

interface PageData {
  navInset: number;
  menuInset: number;
  navTitle: string;
  state: LoadState;
  statusTitle: string;
  message: string;
  eventId: string;
  eventTitle: string;
  form: AssessmentForm | null;
  hasForm: boolean;
  roster: CoachWorkbench["roster"];
  groupOptions: GroupView[];
  activeGroupId: string;
  fieldsInGroup: AssessmentField[];
  fieldIndex: number;
  currentField: AssessmentField | null;
  hasCurrentField: boolean;
  currentFieldInputType: "digit" | "text";
  currentFieldPlaceholder: string;
  currentFieldUnitLabel: string;
  currentFieldProtocol: string;
  hasCurrentFieldProtocol: boolean;
  fieldPositionLabel: string;
  previousDisabled: boolean;
  nextDisabled: boolean;
  draft: AssessmentDraftMap;
  draftRows: DraftRow[];
  completedCount: number;
  totalCount: number;
  progressStyle: string;
  progressLabel: string;
  saving: boolean;
  canSubmit: boolean;
  submitClass: string;
  submitLabel: string;
  submitMessage: string;
  draftResumeVisible: boolean;
  draftResumeUpdatedAtLabel: string;
  draftExitInProgress: boolean;
  loadToken: number;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    navTitle: "项目评分录入",
    state: "idle",
    statusTitle: "项目评分录入",
    message: "",
    eventId: "",
    eventTitle: "",
    form: null,
    hasForm: false,
    roster: [],
    groupOptions: [],
    activeGroupId: "",
    fieldsInGroup: [],
    fieldIndex: 0,
    currentField: null,
    hasCurrentField: false,
    currentFieldInputType: "text",
    currentFieldPlaceholder: "录入结果",
    currentFieldUnitLabel: "",
    currentFieldProtocol: "",
    hasCurrentFieldProtocol: false,
    fieldPositionLabel: "0 / 0",
    previousDisabled: true,
    nextDisabled: true,
    draft: {},
    draftRows: [],
    completedCount: 0,
    totalCount: 0,
    progressStyle: "width: 0%",
    progressLabel: "0 / 0 已录入",
    saving: false,
    canSubmit: false,
    submitClass: "c12-submit c12-submit--disabled",
    submitLabel: "保存评分",
    submitMessage: "",
    draftResumeVisible: false,
    draftResumeUpdatedAtLabel: "",
    draftExitInProgress: false,
    loadToken: 0,
  },

  onLoad(query?: Record<string, string | undefined>) {
    return this.load(query?.eventId || "");
  },

  async load(eventId: string) {
    const loadToken = this.data.loadToken + 1;
    this.setData({ loadToken });
    if (!requireRole("coach")) {
      this.showLoadError("", "当前账号无法录入评测。", loadToken);
      return;
    }
    if (!eventId) {
      this.showLoadError("", "缺少活动信息，暂时无法录入评分。", loadToken);
      return;
    }

    this.setData({
      state: "loading",
      navTitle: "项目评分录入",
      statusTitle: "正在读取评分项目",
      message: "",
      eventId,
      eventTitle: "",
      form: null,
      hasForm: false,
      roster: [],
      groupOptions: [],
      activeGroupId: "",
      fieldsInGroup: [],
      fieldIndex: 0,
      currentField: null,
      hasCurrentField: false,
      draft: {},
      draftRows: [],
      completedCount: 0,
      totalCount: 0,
      progressStyle: "width: 0%",
      progressLabel: "0 / 0 已录入",
      saving: false,
      canSubmit: false,
      submitClass: "c12-submit c12-submit--disabled",
      submitLabel: "保存评分",
      submitMessage: "",
      draftResumeVisible: false,
      draftResumeUpdatedAtLabel: "",
      draftExitInProgress: false,
    });

    try {
      const workbench = await getCoachWorkbench(eventId);
      if (!this.isCurrentLoad(loadToken)) return;
      if (!isWritableAssessmentWorkbench(workbench, eventId)) {
        this.showLoadError(eventId, "当前活动暂时不能录入评分。", loadToken);
        return;
      }

      const templateId = workbench.assessmentTemplateId;
      if (!templateId) {
        this.showLoadError(eventId, "当前活动没有可用的评分模板。", loadToken);
        return;
      }

      const form = await getAssessmentForm(templateId);
      if (!this.isCurrentLoad(loadToken)) return;
      if (!isMatchingAssessmentForm(form, templateId)) {
        this.showLoadError(eventId, "评分表单暂时不可用。", loadToken);
        return;
      }
      const templateVersionId = form.templateVersionId;
      if (!templateVersionId) {
        this.showLoadError(eventId, "评分表单暂时不可用。", loadToken);
        return;
      }

      const activeGroupId = groupIds(form.fields)[0] || "";
      const fieldsInGroup = fieldsForGroup(form.fields, activeGroupId);
      const currentField = fieldsInGroup[0] || null;
      const draft = loadAssessmentDraft(eventId, templateVersionId);
      const hasEntries = Boolean(workbench.roster.length && currentField);
      const validDrafts = validDraftEntries(draft, workbench.roster, form.fields);
      const draftResumeVisible = hasEntries && validDrafts.length > 0;
      this.setData({
        state: hasEntries ? "ready" : "empty",
        navTitle: draftResumeVisible ? "成绩录入" : "项目评分录入",
        statusTitle: hasEntries ? "" : "暂无可录入内容",
        message: hasEntries ? "" : "当前活动没有可录入的学员或评分项目。",
        eventId,
        eventTitle: workbench.event.title,
        form,
        hasForm: true,
        roster: workbench.roster,
        groupOptions: presentGroups(form.fields, activeGroupId),
        activeGroupId,
        fieldsInGroup,
        fieldIndex: 0,
        currentField,
        hasCurrentField: Boolean(currentField),
        draft,
        canSubmit: hasEntries && !draftResumeVisible,
        submitClass: hasEntries && !draftResumeVisible ? "c12-submit" : "c12-submit c12-submit--disabled",
        submitLabel: "保存评分",
        draftResumeVisible,
        draftResumeUpdatedAtLabel: draftResumeVisible ? latestLocalDraftLabel(validDrafts) : "",
        draftExitInProgress: false,
      });
      this.refreshDraftView();
    } catch {
      this.showLoadError(eventId, "评分项目读取失败，请稍后重试。", loadToken);
    }
  },

  retry() {
    if (this.data.draftResumeVisible) return;
    return this.load(this.data.eventId);
  },

  isCurrentLoad(loadToken: number) {
    return this.data.loadToken === loadToken;
  },

  showLoadError(eventId: string, message: string, loadToken: number) {
    if (!this.isCurrentLoad(loadToken)) return;
    this.setData({
      state: "error",
      navTitle: "项目评分录入",
      statusTitle: "暂时无法录入",
      message,
      eventId,
      eventTitle: "",
      form: null,
      hasForm: false,
      roster: [],
      groupOptions: [],
      activeGroupId: "",
      fieldsInGroup: [],
      fieldIndex: 0,
      currentField: null,
      hasCurrentField: false,
      draft: {},
      draftRows: [],
      completedCount: 0,
      totalCount: 0,
      progressStyle: "width: 0%",
      progressLabel: "0 / 0 已录入",
      saving: false,
      canSubmit: false,
      submitClass: "c12-submit c12-submit--disabled",
      submitLabel: "保存评分",
      submitMessage: "",
      draftResumeVisible: false,
      draftResumeUpdatedAtLabel: "",
      draftExitInProgress: false,
    });
  },

  goBack() {
    if (this.data.draftResumeVisible) return;
    wx.navigateBack({ delta: 1 });
  },

  continueDraft() {
    if (!this.data.draftResumeVisible || this.data.draftExitInProgress) return;
    const canSubmit = this.data.state === "ready" && Boolean(this.data.roster.length && this.data.currentField);
    this.setData({
      draftResumeVisible: false,
      navTitle: "项目评分录入",
      canSubmit,
      submitClass: canSubmit ? "c12-submit" : "c12-submit c12-submit--disabled",
    });
  },

  exitDraft() {
    if (!this.data.draftResumeVisible || this.data.draftExitInProgress) return;
    this.setData({ draftExitInProgress: true });
    wx.navigateBack({ delta: 1 });
  },

  switchGroup(event: { currentTarget: { dataset: { id?: string } } }) {
    if (this.data.draftResumeVisible) return;
    const activeGroupId = event.currentTarget.dataset.id || "";
    const form = this.data.form;
    if (!form || !activeGroupId) return;
    const fieldsInGroup = fieldsForGroup(form.fields, activeGroupId);
    const currentField = fieldsInGroup[0] || null;
    this.setData({
      groupOptions: presentGroups(form.fields, activeGroupId),
      activeGroupId,
      fieldsInGroup,
      fieldIndex: 0,
      currentField,
      hasCurrentField: Boolean(currentField),
    });
    this.refreshDraftView();
  },

  onFieldChange(event: { detail: { value: string | number } }) {
    if (this.data.draftResumeVisible) return;
    this.selectField(Number(event.detail.value));
  },

  previousField() {
    if (this.data.draftResumeVisible) return;
    this.selectField(this.data.fieldIndex - 1);
  },

  nextField() {
    if (this.data.draftResumeVisible) return;
    this.selectField(this.data.fieldIndex + 1);
  },

  selectField(fieldIndex: number) {
    if (this.data.draftResumeVisible) return;
    const currentField = this.data.fieldsInGroup[fieldIndex];
    if (!currentField) return;
    this.setData({ fieldIndex, currentField, hasCurrentField: true });
    this.refreshDraftView();
  },

  onValueInput(event: { currentTarget: { dataset: { studentId?: string; testItemId?: string } }; detail: { value: string | number } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const field = fieldForTestItem(this.data.form, event.currentTarget.dataset.testItemId) ?? this.data.currentField;
    const form = this.data.form;
    if (this.data.draftResumeVisible || !this.data.canSubmit || !studentId || !field?.testItemId || !form?.templateVersionId) return;
    const rawValue = String(event.detail.value);
    const draft = saveAssessmentDraftEntry(this.data.eventId, form.templateVersionId, {
      studentId,
      testItemId: field.testItemId,
      status: rawValue.trim() ? "recorded" : "empty",
      rawValue,
    });
    this.setData({ draft, submitMessage: "已保存到本机草稿" });
    this.refreshDraftView();
  },

  toggleMissing(event: { currentTarget: { dataset: { studentId?: string; testItemId?: string } } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const field = fieldForTestItem(this.data.form, event.currentTarget.dataset.testItemId) ?? this.data.currentField;
    const form = this.data.form;
    if (this.data.draftResumeVisible || !this.data.canSubmit || !studentId || !field?.testItemId || !form?.templateVersionId) return;
    const current = this.rowFor(studentId, field.testItemId);
    const status = current.status === "missing" ? "empty" : "missing";
    const draft = saveAssessmentDraftEntry(this.data.eventId, form.templateVersionId, {
      studentId,
      testItemId: field.testItemId,
      status,
      rawValue: status === "missing" ? "" : current.rawValue,
      missingReason: status === "missing" ? current.missingReason : undefined,
    });
    this.setData({ draft, submitMessage: "已保存到本机草稿" });
    this.refreshDraftView();
  },

  onMissingReasonInput(event: { currentTarget: { dataset: { studentId?: string; testItemId?: string } }; detail: { value: string } }) {
    const studentId = event.currentTarget.dataset.studentId;
    const field = fieldForTestItem(this.data.form, event.currentTarget.dataset.testItemId) ?? this.data.currentField;
    const form = this.data.form;
    if (this.data.draftResumeVisible || !this.data.canSubmit || !studentId || !field?.testItemId || !form?.templateVersionId) return;
    const draft = saveAssessmentDraftEntry(this.data.eventId, form.templateVersionId, {
      studentId,
      testItemId: field.testItemId,
      status: "missing",
      missingReason: event.detail.value,
    });
    this.setData({ draft, submitMessage: "已保存到本机草稿" });
    this.refreshDraftView();
  },

  rowFor(studentId: string, testItemId: string) {
    return this.data.draft[`${studentId}:${testItemId}`] ?? { status: "empty" as const, rawValue: "", missingReason: "" };
  },

  refreshDraftView() {
    const field = this.data.currentField;
    const form = this.data.form;
    if (!field?.testItemId || !form) return;
    const visibleFields = this.data.fieldsInGroup.slice(this.data.fieldIndex, this.data.fieldIndex + 4);
    const draftRows = this.data.roster.map((student: RosterStudent) => presentDraftRow(student, this.data.draft, field, visibleFields));
    const itemIds = form.fields.map((item: AssessmentField) => item.testItemId || "").filter(Boolean);
    const progress = draftProgress(this.data.draft, this.data.roster.map((student: RosterStudent) => student.studentId), itemIds);
    const totalCount = progress.total;
    const percent = totalCount ? Math.min(100, Math.round((progress.completed / totalCount) * 100)) : 0;
    const currentFieldInputType = field.inputType === "number" ? "digit" : "text";
    this.setData({
      draftRows,
      completedCount: progress.completed,
      totalCount,
      progressStyle: `width: ${percent}%`,
      progressLabel: `${progress.completed} / ${totalCount} 已录入`,
      currentFieldInputType,
      currentFieldPlaceholder: field.unit ? `录入${field.unit}` : "录入结果",
      currentFieldUnitLabel: field.unit || "按项目要求录入",
      currentFieldProtocol: field.protocol || "",
      hasCurrentFieldProtocol: Boolean(field.protocol),
      fieldPositionLabel: `${this.data.fieldIndex + 1} / ${this.data.fieldsInGroup.length}`,
      previousDisabled: this.data.fieldIndex <= 0,
      nextDisabled: this.data.fieldIndex >= this.data.fieldsInGroup.length - 1,
    });
  },

  async submitAssessment() {
    const form = this.data.form;
    if (this.data.draftResumeVisible || !this.data.canSubmit || !form?.templateVersionId || this.data.saving) return;

    const recordedStudents = this.data.roster.filter((student: RosterStudent) =>
      form.fields.some((field: AssessmentField) => field.testItemId && this.rowFor(student.studentId, field.testItemId).status === "recorded"),
    );
    const hasInvalid = form.fields.some((field: AssessmentField) => this.data.roster.some((student: RosterStudent) => {
      if (!field.testItemId) return true;
      const entry = this.rowFor(student.studentId, field.testItemId);
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

    this.setData({ saving: true, submitClass: "c12-submit c12-submit--disabled", submitLabel: "正在提交", submitMessage: "正在确认提交结果" });
    const succeeded: string[] = [];
    const unconfirmed: string[] = [];
    for (const student of recordedStudents) {
      const rawResults = form.fields.flatMap((field: AssessmentField) => {
        if (!field.testItemId) return [];
        const entry = this.rowFor(student.studentId, field.testItemId);
        const value = entry.status === "recorded" ? buildMetricValue(field.valueKind, entry.rawValue, field.unit) : null;
        return value ? [{ testItemId: field.testItemId, metricId: field.metricId, value }] : [];
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
      } catch {
        unconfirmed.push(student.studentId);
      }
    }

    const draft = clearAssessmentDraftStudents(this.data.eventId, form.templateVersionId, succeeded);
    const submitMessage = unconfirmed.length
      ? `已确认 ${succeeded.length} 名，${unconfirmed.length} 名待确认，草稿已保留`
      : `已确认提交 ${succeeded.length} 名`;
    this.setData({
      saving: false,
      draft,
      submitClass: this.data.canSubmit ? "c12-submit" : "c12-submit c12-submit--disabled",
      submitLabel: "保存评分",
      submitMessage,
    });
    this.refreshDraftView();
  },
});

function validDraftEntries(draft: AssessmentDraftMap, roster: CoachWorkbench["roster"], fields: AssessmentField[]) {
  const studentIds = new Set(roster.map((student) => student.studentId));
  const testItemIds = new Set(fields.map((field) => field.testItemId).filter(Boolean));
  return Object.values(draft).filter((entry) =>
    entry.status !== "empty" && studentIds.has(entry.studentId) && testItemIds.has(entry.testItemId),
  );
}

function latestLocalDraftLabel(entries: ReturnType<typeof validDraftEntries>) {
  let latest: string | null = null;
  let latestTimestamp = -Infinity;
  for (const entry of entries) {
    const timestamp = Date.parse(entry.updatedAt);
    if (Number.isNaN(timestamp) || timestamp <= latestTimestamp) continue;
    latestTimestamp = timestamp;
    latest = entry.updatedAt;
  }
  if (!latest) return "本机草稿";
  const isoParts = latest.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return isoParts ? `本机草稿 ${isoParts[1]} ${isoParts[2]}` : "本机草稿";
}

function isWritableAssessmentWorkbench(workbench: CoachWorkbench, eventId: string) {
  return workbench.event.id === eventId && workbench.event.status !== "cancelled" && Boolean(workbench.assessmentTemplateId);
}

function isMatchingAssessmentForm(form: AssessmentForm, templateId: string) {
  return form.templateId === templateId
    && Boolean(form.templateVersionId)
    && form.fields.length > 0
    && form.fields.every((field) => Boolean(field.testItemId));
}

function groupIds(fields: AssessmentField[]) {
  const ids: string[] = [];
  for (const field of fields) {
    if (field.groupId && !ids.includes(field.groupId)) ids.push(field.groupId);
  }
  return ids;
}

function fieldsForGroup(fields: AssessmentField[], groupId: string) {
  return fields.filter((field) => field.groupId === groupId);
}

function presentGroups(fields: AssessmentField[], activeGroupId: string): GroupView[] {
  const groups = new Map<string, string>();
  for (const field of fields) {
    if (!groups.has(field.groupId)) groups.set(field.groupId, field.groupLabel);
  }
  return [...groups.entries()].map(([id, label]) => ({
    id,
    label,
    className: id === activeGroupId ? "c12-group c12-group--active" : "c12-group",
  }));
}

function fieldForTestItem(form: AssessmentForm | null, testItemId?: string) {
  if (!form || !testItemId) return null;
  return form.fields.find((field) => field.testItemId === testItemId) ?? null;
}

function presentDraftRow(student: CoachWorkbench["roster"][number], draft: AssessmentDraftMap, field: AssessmentField, visibleFields: AssessmentField[]): DraftRow {
  const entry = draft[`${student.studentId}:${field.testItemId}`] ?? { status: "empty" as const, rawValue: "", missingReason: "" };
  const invalid = entry.status === "recorded" && !validFieldValue(field, entry.rawValue);
  const status = invalid ? "invalid" : entry.status;
  const statusLabel = status === "recorded" ? "已录入" : status === "missing" ? "缺测" : status === "invalid" ? "超出范围" : "待录入";
  const invalidHint = invalid ? rangeHint(field) : "";
  return {
    studentId: student.studentId,
    name: student.name,
    initials: student.name.trim().slice(0, 1) || "学",
    status: entry.status,
    rawValue: entry.rawValue,
    missingReason: entry.missingReason || "",
    invalid,
    statusLabel,
    statusClass: `c12-row__status c12-row__status--${status}`,
    showInput: entry.status !== "missing",
    showMissingReason: entry.status === "missing",
    missingActionLabel: entry.status === "missing" ? "取消缺测" : "标记缺测",
    invalidHint,
    metricCells: visibleFields
      .filter((visibleField) => Boolean(visibleField.testItemId))
      .map((visibleField) => presentMetricCell(
        visibleField,
        draft[`${student.studentId}:${visibleField.testItemId}`] ?? { status: "empty" as const, rawValue: "" },
      )),
  };
}

function presentMetricCell(field: AssessmentField, entry: { status: "empty" | "recorded" | "missing"; rawValue: string }): MetricCell {
  const status = entry.status;
  return {
    testItemId: field.testItemId || "",
    label: field.label,
    rawValue: entry.rawValue,
    inputType: field.inputType === "number" ? "digit" : "text",
    placeholder: field.unit ? field.unit : "—",
    status,
    statusLabel: status === "recorded" ? "已录入" : status === "missing" ? "缺测" : "待录入",
    statusClass: `c12-metric-cell__status c12-metric-cell__status--${status}`,
    showInput: status !== "missing",
  };
}

function rangeHint(field: AssessmentField) {
  const min = field.minValue === undefined ? "不限" : String(field.minValue);
  const max = field.maxValue === undefined ? "不限" : String(field.maxValue);
  return `合理范围：${min} - ${max}`;
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
