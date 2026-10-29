import { getCoachTrainingContentAssessments, getCoachWorkbench, saveCoachTrainingContentAssessments } from "../../../utils/api";
import { environmentStorageKey } from "../../../utils/config";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeOnly, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachTrainingContentAssessmentScope, CoachWorkbench, LoadState, TrainingProject } from "../../../utils/types";

type AssessmentValue = { scoreInput: string; noteInput: string };
type AssessmentValues = Record<string, Record<string, AssessmentValue>>;
type SaveRows = Parameters<typeof saveCoachTrainingContentAssessments>[1];
type PendingSave = {eventId:string; assessments:SaveRows; revision:number};
type LocalDraft = {revision:number|null; values:AssessmentValues; saved:AssessmentValues; pending:PendingSave|null; uncertain:boolean; needsReload:boolean};
const UPGRADE_MESSAGE = "请更新小程序并重新打开课堂表现，读取有效版本后再保存；本机输入已保留。";

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
  revision: number|null;
  needsReload: boolean;
  uncertain: boolean;
  reviewVisible: boolean;
  reviewLoading: boolean;
  reviewRows: Array<{key:string;label:string;local:string;server:string}>;
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
    revision:null, needsReload:false, uncertain:false, reviewVisible:false, reviewLoading:false, reviewRows:[],
  },

  savedValuesByProject: undefined as AssessmentValues | undefined,
  pendingSave: null as PendingSave|null,
  preview: null as {workbench:CoachWorkbench;scope:CoachTrainingContentAssessmentScope}|null,
  generation: 0,
  draftKey: "",
  onHide() { this.remember(); },
  onUnload() { this.remember(); this.generation += 1; },

  onLoad(query: { eventId?: string }) {
    return this.load(query?.eventId || "");
  },

  async load(eventId: string) {
    const generation = ++this.generation;
    const session = requireRole("coach");
    if (!session) return;
    this.draftKey = session.userId ? environmentStorageKey(`classroom-draft:${session.clubId}:${session.userId}:${eventId}`) : "";
    if (!eventId) {
      this.setData({ state: "empty", statusTitle: "无法评测", statusActionText: "", statusAction: "", message: "缺少训练活动参数，请从训练工作台进入。" });
      return;
    }
    this.setData({ state: "loading", statusTitle: "正在读取课堂评测", statusActionText: "", statusAction: "", message: "", eventId, saving: false, saveError: "" });
    try {
      const [workbench, scope] = await Promise.all([getCoachWorkbench(eventId), getCoachTrainingContentAssessments(eventId)]);
      if (generation !== this.generation) return;
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
      const serverValues = toAssessmentValues(scope, projects, presentRows);
      let draft: LocalDraft|undefined;
      try { draft = this.draftKey ? wx.getStorageSync<LocalDraft|undefined>(this.draftKey) : undefined; } catch { /* Server read remains usable. */ }
      const valuesByProject = draft ? allowedValues(draft.values, projects, presentRows) : serverValues;
      this.savedValuesByProject = draft ? allowedValues(draft.saved, projects, presentRows) : serverValues;
      this.pendingSave = draft?.pending || null;
      const revision = draft ? draft.revision : validRevision(scope.revision) ? scope.revision! : null;
      const uncertain = Boolean(draft?.uncertain);
      const needsReload = Boolean(draft?.needsReload || (draft && revision !== scope.revision && !uncertain));
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
        revision, needsReload, uncertain, reviewVisible:false, reviewLoading:false,
        saveError: revision === null ? UPGRADE_MESSAGE : needsReload ? "课堂表现已被其他客户端更新，本机输入已保留，请重新读取并核对。" : uncertain ? "保存结果尚未确认，请重试原保存；本机输入已保留。" : "",
        saving: false,
      });
    } catch (error) {
      if (generation !== this.generation) return;
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
    if (this.data.saving || this.data.reviewLoading || this.data.reviewVisible || this.data.uncertain) return;
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
    if (this.data.saving || this.data.uncertain || this.data.reviewLoading || this.data.reviewVisible) return;
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
    this.setData({ saveError: this.data.needsReload || this.data.revision === null ? this.data.saveError : "", valuesByProject, rows: rowsForProject(this.data.rows, valuesByProject, projectId) });
    this.remember();
  },

  remember() {
    if (!this.draftKey || this.data.state !== "ready") return;
    if (!this.pendingSave && !this.data.needsReload && !this.data.uncertain && !hasLocalChanges(this.data.valuesByProject,this.savedValuesByProject || {})) {
      try { wx.removeStorageSync(this.draftKey); } catch { /* No new draft needed for an unchanged page. */ }
      return;
    }
    try { wx.setStorageSync(this.draftKey, {revision:this.data.revision,values:this.data.valuesByProject,saved:this.savedValuesByProject || {},pending:this.pendingSave,uncertain:this.data.uncertain || Boolean(this.pendingSave && this.data.saving),needsReload:this.data.needsReload} satisfies LocalDraft); }
    catch { this.setData({saveError:"本机草稿保存失败，请保持页面并尽快保存到服务器。"}); }
  },
  async save() {
    if (this.data.saving || this.data.reviewLoading || this.data.reviewVisible || !this.data.eventId || this.data.needsReload) return;
    if (!validRevision(this.data.revision)) { this.setData({saveError:UPGRADE_MESSAGE,needsReload:true}); this.remember(); return; }
    const result = toSavePayload(this.data.valuesByProject, this.savedValuesByProject || {}, this.data.projects, this.data.rows);
    if (!this.pendingSave && result.error) { this.setData({saveError:result.error}); return; }
    const assessments = result.assessments.filter(row => {
      const previous = this.savedValuesByProject?.[row.trainingProjectId]?.[row.studentId];
      return !previous || Number(previous.scoreInput) !== row.score || previous.noteInput.trim() !== (row.note || "");
    });
    if (!this.pendingSave && !assessments.length) { wx.showToast({title:"没有待保存修改",icon:"none"}); return; }
    const pending = this.pendingSave || {eventId:this.data.eventId,assessments,revision:this.data.revision!};
    this.pendingSave = pending;
    const generation = this.generation;
    this.setData({saving:true,saveError:""}); this.remember();
    try {
      const response = await saveCoachTrainingContentAssessments(pending.eventId,pending.assessments,pending.revision);
      if (generation !== this.generation) return;
      if (response.eventId !== pending.eventId || !validRevision(response.revision)) throw new Error("服务器保存版本未确认");
      const saved = {...this.savedValuesByProject};
      for (const row of pending.assessments) saved[row.trainingProjectId] = {...saved[row.trainingProjectId], [row.studentId]:{scoreInput:String(row.score),noteInput:row.note || ""}};
      this.savedValuesByProject = saved;
      this.pendingSave = null;
      this.setData({revision:response.revision,uncertain:false,needsReload:false,saving:false});
      if (this.draftKey) { try { wx.removeStorageSync(this.draftKey); } catch { /* Keeping a scoped draft is safer than losing edits. */ } }
      wx.showToast({title:"课堂表现已保存",icon:"success"});
    } catch (error) {
      if (generation !== this.generation) return;
      const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0;
      const conflict = status === 409 || errorCode(error) === "training_assessment_revision_conflict";
      const upgrade = status === 428 || errorCode(error) === "precondition_required";
      const uncertain = !status || status >= 500;
      if (!uncertain) this.pendingSave = null;
      this.setData({saving:false,uncertain,needsReload:conflict || upgrade,
        saveError: conflict ? "课堂表现已被其他客户端更新。本机输入已保留，请重新读取服务器记录并核对后保存。" : upgrade ? UPGRADE_MESSAGE : uncertain ? "保存结果尚未确认。本机输入已保留，请重试原保存，不要重复录入。" : "保存未完成，本机输入已保留，请核对后重试。"});
      this.remember();
    }
  },
  async readServerForReview() {
    if (this.data.saving || this.data.reviewLoading) return;
    const generation = this.generation;
    this.setData({reviewLoading:true});
    try {
      const responses = await Promise.all([getCoachWorkbench(this.data.eventId),getCoachTrainingContentAssessments(this.data.eventId)]);
      if (generation !== this.generation) return;
      const workbench = responses[0], scope = responses[1];
      if (!isTrainingAssessmentScope(workbench,scope,this.data.eventId)) throw new Error("课程范围变化");
      if (!validRevision(scope.revision)) { this.setData({saveError:UPGRADE_MESSAGE,needsReload:true}); this.remember(); return; }
      const projects = selectedProjects(workbench,scope), rows = presentStudents(workbench,scope);
      const server = toAssessmentValues(scope,projects,rows);
      const reviewRows = projects.flatMap(project => rows.map(row => ({key:`${project.id}/${row.studentId}`,label:`${row.name} · ${project.name}`,local:displayCell(this.data.valuesByProject[project.id]?.[row.studentId]),server:displayCell(server[project.id]?.[row.studentId])})));
      this.preview = {workbench,scope};
      this.setData({reviewVisible:true,reviewRows});
    } catch { if (generation === this.generation) this.setData({saveError:"服务器记录读取失败，本机输入未改变，请重试核对。"}); }
    finally { if (generation === this.generation) this.setData({reviewLoading:false}); }
  },
  closeReview() { this.preview=null; this.setData({reviewVisible:false}); },
  useServer() { this.applyReviewed(false); },
  keepLocalChanges() { this.applyReviewed(true); },
  applyReviewed(keepLocal:boolean) {
    if (!this.preview || !this.data.reviewVisible) return;
    const {workbench,scope} = this.preview;
    const projects = selectedProjects(workbench,scope), members = presentStudents(workbench,scope);
    const saved = toAssessmentValues(scope,projects,members);
    const values = mergeReviewed(saved,this.data.valuesByProject,this.savedValuesByProject || {},keepLocal,projects,members);
    this.savedValuesByProject = saved; this.pendingSave=null; this.preview=null;
    const activeProjectId=projects.some(p=>p.id===this.data.activeProjectId)?this.data.activeProjectId:projects[0]?.id || "";
    this.setData({projects:presentProjects(projects,activeProjectId),activeProjectId,rows:rowsForProject(members,values,activeProjectId),valuesByProject:values,revision:scope.revision!,needsReload:false,uncertain:false,reviewVisible:false,saveError:"已采用核对后的版本，请检查输入后再次保存。"});
    this.remember();
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
    .map((student) => ({ studentId: student.studentId, name: student.name, initial: student.name.slice(0, 1), scoreInput: "", noteInput: "" }));
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

function validRevision(value:unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function allowedValues(values:AssessmentValues,projects:TrainingProject[],rows:AssessmentRow[]):AssessmentValues {
  const result:AssessmentValues={};
  for(const project of projects) for(const row of rows) {
    const value=values?.[project.id]?.[row.studentId];
    if(value && typeof value.scoreInput === "string" && typeof value.noteInput === "string") (result[project.id] ??= {})[row.studentId]={...value};
  }
  return result;
}
function displayCell(value:AssessmentValue|undefined) { return value ? `${value.scoreInput.trim() || "未评分"}${value.noteInput ? ` · ${value.noteInput}` : ""}` : "未评分"; }
function mergeReviewed(server:AssessmentValues,local:AssessmentValues,original:AssessmentValues,keep:boolean,projects:TrainingProject[],rows:AssessmentRow[]) {
  const result=allowedValues(server,projects,rows);
  if(!keep)return result;
  const changes=allowedValues(local,projects,rows);
  for(const [projectId,byStudent] of Object.entries(changes)) for(const [studentId,value] of Object.entries(byStudent)) {
    const before=original[projectId]?.[studentId] || {scoreInput:"",noteInput:""};
    const next={...(result[projectId]?.[studentId] || {scoreInput:"",noteInput:""})};
    if(value.scoreInput !== before.scoreInput)next.scoreInput=value.scoreInput;
    if(value.noteInput !== before.noteInput)next.noteInput=value.noteInput;
    (result[projectId] ??= {})[studentId]=next;
  }
  return result;
}

function hasLocalChanges(values:AssessmentValues,saved:AssessmentValues) {
  return Object.entries(values).some(([projectId,byStudent])=>Object.entries(byStudent).some(([studentId,value])=>{
    const before=saved[projectId]?.[studentId];
    const score=value.scoreInput.trim(), old=before?.scoreInput.trim() || "";
    return (score === "" || old === "" ? score !== old : Number(score) !== Number(old)) || value.noteInput.trim() !== (before?.noteInput.trim() || "");
  }));
}
