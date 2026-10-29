import { getCoachTrainingContentAssessments, getCoachWorkbench, saveCoachTrainingContentAssessments } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeOnly, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachTrainingContentAssessmentScope, CoachWorkbench, LoadState, TrainingProject } from "../../../utils/types";

type AssessmentValue = { scoreInput: string; noteInput: string };
type AssessmentValues = Record<string, Record<string, AssessmentValue>>;

interface ProjectView {
  id: string;
  label: string;
  className: string;
}

interface AssessmentRow {
  studentId: string;
  name: string;
  initial: string;
  scoreInput: string;
  noteInput: string;
}

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  statusTitle: string;
  statusActionText: string;
  statusAction: "retry" | "select-training-content" | "";
  message: string;
  eventId: string;
  eventTitle: string;
  eventDateTeam: string;
  eventTime: string;
  eventVenue: string;
  presentCountLabel: string;
  projects: ProjectView[];
  activeProjectId: string;
  rows: AssessmentRow[];
  valuesByProject: AssessmentValues;
  saving: boolean;
  saveError: string;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "idle",
    statusTitle: "课堂训练评测",
    statusActionText: "",
    statusAction: "",
    message: "",
    eventId: "",
    eventTitle: "",
    eventDateTeam: "",
    eventTime: "",
    eventVenue: "",
    presentCountLabel: "",
    projects: [],
    activeProjectId: "",
    rows: [],
    valuesByProject: {},
    saving: false,
    saveError: "",
  },

  savedValuesByProject: undefined as AssessmentValues | undefined,

  onLoad(query: { eventId?: string }) {
    return this.load(query?.eventId || "");
  },

  async load(eventId: string) {
    if (!requireRole("coach")) return;
    if (!eventId) {
      this.setData({ state: "empty", statusTitle: "无法评测", statusActionText: "", statusAction: "", message: "缺少训练活动参数，请从训练工作台进入。" });
      return;
    }
    this.setData({ state: "loading", statusTitle: "正在读取课堂评测", statusActionText: "", statusAction: "", message: "", eventId, saving: false, saveError: "" });
    try {
      const [workbench, scope] = await Promise.all([getCoachWorkbench(eventId), getCoachTrainingContentAssessments(eventId)]);
      if (!isTrainingAssessmentScope(workbench, scope, eventId)) {
        this.setData({ state: "empty", statusTitle: "当前活动不可评测", statusActionText: "", statusAction: "", message: "仅已配置训练内容的训练活动可以进行课堂评测。", projects: [], rows: [], valuesByProject: {} });
        return;
      }
      const projects = selectedProjects(workbench, scope);
      const presentRows = presentStudents(workbench, scope);
      if (!projects.length) {
        this.setData({ state: "empty", statusTitle: "暂无训练内容", statusActionText: "去选择训练内容", statusAction: "select-training-content", message: "请先在训练内容页选择本堂课的训练内容。", projects: [], rows: [], valuesByProject: {} });
        return;
      }
      if (!presentRows.length) {
        this.setData({ state: "empty", statusTitle: "暂无可评测学员", statusActionText: "", statusAction: "", message: "请先完成点名，课堂评测只对已到学员开放。", projects: [], rows: [], valuesByProject: {} });
        return;
      }
      const valuesByProject = toAssessmentValues(scope, projects, presentRows);
      this.savedValuesByProject = valuesByProject;
      const activeProjectId = projects[0]!.id;
      this.setData({
        state: "ready",
        statusTitle: "课堂训练评测",
        statusActionText: "",
        statusAction: "",
        message: "",
        eventId,
        eventTitle: workbench.event.title,
        eventDateTeam: [formatCalendarDate(workbench.event.startsAt), workbench.event.teamName].filter(Boolean).join(" · "),
        eventTime: formatTimeOnly(workbench.event.startsAt),
        eventVenue: workbench.event.venue || "场地待确认",
        presentCountLabel: `${presentRows.length} 名已到学员`,
        projects: presentProjects(projects, activeProjectId),
        activeProjectId,
        rows: rowsForProject(presentRows, valuesByProject, activeProjectId),
        valuesByProject,
        saving: false,
      });
    } catch (error) {
      if (errorCode(error) === "training_content_required") {
        this.setData({ state: "empty", statusTitle: "暂无训练内容", statusActionText: "去选择训练内容", statusAction: "select-training-content", message: "请先在训练内容页选择本堂课的训练内容。", projects: [], rows: [], valuesByProject: {}, saving: false });
        return;
      }
      this.setData({ state: "error", statusTitle: "读取失败", statusActionText: "重试", statusAction: "retry", message: "课堂评测读取失败，请稍后重试。", projects: [], rows: [], valuesByProject: {}, saving: false });
    }
  },

  retry() {
    return this.load(this.data.eventId);
  },

  handleStatusAction() {
    if (this.data.statusAction === "select-training-content" && this.data.eventId) {
      openPage(`/pages/coach/content-select/index?eventId=${encodeURIComponent(this.data.eventId)}`);
      return;
    }
    return this.retry();
  },

  goBack() {
    if (this.data.saving) return;
    wx.navigateBack({ delta: 1 });
  },

  selectProject(event: { currentTarget: { dataset: { id: string } } }) {
    const activeProjectId = event.currentTarget.dataset.id;
    if (!this.data.projects.some((project: ProjectView) => project.id === activeProjectId)) return;
    this.setData({
      activeProjectId,
      projects: presentProjects(this.data.projects, activeProjectId),
      rows: rowsForProject(this.data.rows, this.data.valuesByProject, activeProjectId),
    });
  },

  onScoreInput(event: { currentTarget: { dataset: { studentId: string } }; detail: { value: string } }) {
    this.updateValue(event.currentTarget.dataset.studentId, { scoreInput: event.detail.value });
  },

  onNoteInput(event: { currentTarget: { dataset: { studentId: string } }; detail: { value: string } }) {
    this.updateValue(event.currentTarget.dataset.studentId, { noteInput: event.detail.value });
  },

  updateValue(studentId: string, patch: Partial<AssessmentValue>) {
    if (this.data.saving) return;
    const projectId = this.data.activeProjectId;
    if (!projectId || !this.data.rows.some((row: AssessmentRow) => row.studentId === studentId)) return;
    const valuesByProject = {
      ...this.data.valuesByProject,
      [projectId]: {
        ...(this.data.valuesByProject[projectId] ?? {}),
        [studentId]: {
          ...(this.data.valuesByProject[projectId]?.[studentId] ?? { scoreInput: "", noteInput: "" }),
          ...patch,
        },
      },
    };
    this.setData({ saveError: "", valuesByProject, rows: rowsForProject(this.data.rows, valuesByProject, projectId) });
  },

  async save() {
    if (this.data.saving || !this.data.eventId) return;
    const result = toSavePayload(this.data.valuesByProject, this.savedValuesByProject || {}, this.data.projects, this.data.rows);
    if (result.error) { this.setData({saveError: result.error}); return; }
    const assessments = result.assessments;
    if (!assessments.length) {
      wx.showToast({ title: "请先录入有效分数", icon: "none" });
      return;
    }
    this.setData({ saving: true, saveError: "" });
    try {
      await saveCoachTrainingContentAssessments(this.data.eventId, assessments);
      const savedValues: AssessmentValues = {};
      for (const assessment of assessments) (savedValues[assessment.trainingProjectId] ??= {})[assessment.studentId] = {scoreInput:String(assessment.score), noteInput:assessment.note};
      this.savedValuesByProject = savedValues;
      this.setData({ saving: false });
      wx.showToast({ title: "课堂评测已保存", icon: "success" });
    } catch {
      this.setData({ saving: false });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    }
  },
});

function isTrainingAssessmentScope(workbench: CoachWorkbench, scope: CoachTrainingContentAssessmentScope, eventId: string) {
  return workbench.event.id === eventId && workbench.event.type === "training" && scope.eventId === eventId;
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String((error as { code?: unknown }).code ?? "");
}

function selectedProjects(workbench: CoachWorkbench, scope: CoachTrainingContentAssessmentScope): TrainingProject[] {
  const ids = new Set(scope.selectedProjectIds);
  return workbench.selectedTrainingProjects.filter((project: TrainingProject) => ids.has(project.id));
}

function presentStudents(workbench: CoachWorkbench, scope: CoachTrainingContentAssessmentScope): AssessmentRow[] {
  const ids = new Set(scope.presentStudentIds);
  return workbench.roster
    .filter((student) => ids.has(student.studentId))
    .map((student) => ({ studentId: student.studentId, name: student.name.slice(0, 4), initial: student.name.slice(0, 1), scoreInput: "", noteInput: "" }));
}

function toAssessmentValues(scope: CoachTrainingContentAssessmentScope, projects: TrainingProject[], rows: AssessmentRow[]): AssessmentValues {
  const allowedProjects = new Set(projects.map((project) => project.id));
  const allowedStudents = new Set(rows.map((row) => row.studentId));
  const values: AssessmentValues = {};
  for (const assessment of scope.assessments) {
    if (!allowedProjects.has(assessment.trainingProjectId) || !allowedStudents.has(assessment.studentId)) continue;
    values[assessment.trainingProjectId] = {
      ...(values[assessment.trainingProjectId] ?? {}),
      [assessment.studentId]: { scoreInput: String(assessment.score), noteInput: assessment.note ?? "" },
    };
  }
  return values;
}

function presentProjects(projects: TrainingProject[] | ProjectView[], activeProjectId: string): ProjectView[] {
  return projects.map((project) => ({
    id: project.id,
    label: "name" in project ? project.name : project.label,
    className: project.id === activeProjectId ? "assessment-project assessment-project--active" : "assessment-project",
  }));
}

function rowsForProject(sourceRows: AssessmentRow[], valuesByProject: AssessmentValues, projectId: string): AssessmentRow[] {
  return sourceRows.map((row) => {
    const saved = valuesByProject[projectId]?.[row.studentId] ?? { scoreInput: "", noteInput: "" };
    return { ...row, scoreInput: saved.scoreInput, noteInput: saved.noteInput };
  });
}

function toSavePayload(valuesByProject: AssessmentValues, saved: AssessmentValues, projects: ProjectView[], rows: AssessmentRow[]) {
  const assessments: Array<{ studentId: string; trainingProjectId: string; score: number; note: string }> = [];
  for (const [trainingProjectId, byStudent] of Object.entries(valuesByProject)) {
    for (const [studentId, value] of Object.entries(byStudent)) {
      const rawScore = value.scoreInput.trim();
      const note = value.noteInput.trim();
      const context = `${rows.find(row => row.studentId === studentId)?.name || "学员"} · ${projects.find(project => project.id === trainingProjectId)?.label || "训练内容"}`;
      if (!rawScore) {
        if (saved[trainingProjectId]?.[studentId]?.scoreInput.trim()) return {assessments: [], error: `${context}：不能通过空值删除已保存分数，请填写更正分数或恢复原值。`};
        if (note) return {assessments: [], error: `${context}：请先填写分数，备注不能单独保存；空值不代表0分。`};
        continue;
      }
      const score = Number(rawScore);
      if (!Number.isInteger(score) || score < 0 || score > 100) return {assessments: [], error: `${context}：请输入0至100的整数分数，已输入内容仍保留。`};
      assessments.push({ studentId, trainingProjectId, score, note });
    }
  }
  return {assessments, error: ""};
}
