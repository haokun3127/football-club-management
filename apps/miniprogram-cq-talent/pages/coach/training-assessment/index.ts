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
type DraftScope = {eventId:string; projectIds:string[]; studentIds:string[]};
type RecoveryCell = {projectId:string; studentId:string; value:AssessmentValue; saved?:AssessmentValue; revision:number|null; scope:DraftScope};
type HeldOperation = {pending:PendingSave; values:AssessmentValues; saved:AssessmentValues; scope:DraftScope};
type LocalDraft = {scope?:DraftScope; retainedCells?:RecoveryCell[]; heldOperation?:HeldOperation|null; revision:number|null; values:AssessmentValues; saved:AssessmentValues; pending:PendingSave|null; uncertain:boolean; needsReload:boolean};
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
  retainedNotice: string;
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
    saveError: "", retainedNotice:"",
    revision:null, needsReload:false, uncertain:false, reviewVisible:false, reviewLoading:false, reviewRows:[],
  },

  savedValuesByProject: undefined as AssessmentValues | undefined,
  pendingSave: null as PendingSave|null,
  preview: null as {workbench:CoachWorkbench;scope:CoachTrainingContentAssessmentScope;recovery:ReturnType<typeof restoreDraft>}|null,
  activeScope: {eventId:"",projectIds:[],studentIds:[]} as DraftScope,
  retainedCells: [] as RecoveryCell[],
  heldOperation: null as HeldOperation|null,
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
      let draft: LocalDraft|undefined;
      try { draft = this.draftKey ? wx.getStorageSync<LocalDraft|undefined>(this.draftKey) : undefined; } catch { /* Server read remains usable. */ }
      const projects = selectedProjects(workbench, scope);
      const presentRows = presentStudents(workbench, scope);
      this.activeScope = {eventId,projectIds:projects.map(project=>project.id),studentIds:presentRows.map(row=>row.studentId)};
      this.setData({retainedNotice:draft ? "本机草稿已保留；暂不可录入的内容或学员恢复后，请重新读取并核对。" : ""});
      if (!projects.length) {
        this.setData({ state: "empty", statusTitle: "暂无训练内容", statusActionText: "去选择训练内容", statusAction: "select-training-content", message: "请先在训练内容页选择本堂课的训练内容。", projects: [], rows: [], valuesByProject: {} });
        return;
      }
      if (!presentRows.length) {
        this.setData({ state: "empty", statusTitle: "暂无可评测学员", statusActionText: "", statusAction: "", message: "请先完成点名，课堂评测只对已到学员开放。", projects: [], rows: [], valuesByProject: {} });
        return;
      }
      const serverValues = toAssessmentValues(scope, projects, presentRows);
      const restored = restoreDraft(draft,serverValues,this.activeScope,scope.revision,projects,presentRows);
      const valuesByProject = restored.values;
      this.savedValuesByProject = restored.saved;
      this.retainedCells = restored.retainedCells;
      this.heldOperation = restored.heldOperation;
      this.pendingSave = restored.pending;
      const {revision,uncertain,needsReload} = restored;
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
        retainedNotice: recoveryNotice(this.retainedCells,this.activeScope,this.heldOperation),
        revision, needsReload, uncertain, reviewVisible:false, reviewLoading:false,
        saveError: revision === null ? UPGRADE_MESSAGE : needsReload ? "本机输入已保留，请与当前课堂记录重新核对后保存。" : uncertain ? "保存结果尚未确认，请重试原保存；本机输入已保留。" : "",
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
    if (!this.pendingSave && !this.data.needsReload && !this.data.uncertain && !hasLocalChanges(this.data.valuesByProject,this.savedValuesByProject || {}) && !this.retainedCells.length && !this.heldOperation) {
      try { wx.removeStorageSync(this.draftKey); } catch { /* No new draft needed for an unchanged page. */ }
      return;
    }
    // Keep the original scope/revision of non-submittable edits. Visible edits
    // may change while recovery is pending, but their original baseline stays.
    this.retainedCells = this.retainedCells.map((cell:RecoveryCell) => {
      const visible = this.data.valuesByProject[cell.projectId]?.[cell.studentId];
      return pairAllowed(this.activeScope,cell.projectId,cell.studentId) && visible ? {...cell,value:{...visible}} : cell;
    });
    try { wx.setStorageSync(this.draftKey, {scope:this.activeScope,retainedCells:this.retainedCells,heldOperation:this.heldOperation,revision:this.data.revision,values:this.data.valuesByProject,saved:this.savedValuesByProject || {},pending:this.pendingSave,uncertain:this.data.uncertain || Boolean(this.pendingSave && this.data.saving),needsReload:this.data.needsReload} satisfies LocalDraft); }
    catch { this.setData({saveError:"本机草稿保存失败，请保持页面并尽快保存到服务器。"}); }
  },
  async save() {
    if (this.data.state !== "ready" || this.data.saving || this.data.reviewLoading || this.data.reviewVisible || !this.data.eventId || this.data.needsReload) return;
    if (!validRevision(this.data.revision)) { this.setData({saveError:UPGRADE_MESSAGE,needsReload:true}); this.remember(); return; }
    if (this.pendingSave && !operationAllowed(this.pendingSave,this.activeScope)) {
      this.setData({needsReload:true,saveError:"原保存包含暂不可评测的内容或学员，输入已保留，请恢复范围后核对。"}); this.remember(); return;
    }
    const result = toSavePayload(this.data.valuesByProject, this.savedValuesByProject || {}, this.data.projects, this.data.rows);
    if (!this.pendingSave && result.error) { this.setData({saveError:result.error}); return; }
    const assessments = result.assessments.filter(row => cellChanges(
      {scoreInput:String(row.score),noteInput:row.note || ""},
      this.savedValuesByProject?.[row.trainingProjectId]?.[row.studentId],
    ).any);
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
      this.retainedCells = this.retainedCells.filter((cell:RecoveryCell)=>!pending.assessments.some((row:SaveRows[number])=>row.trainingProjectId===cell.projectId && row.studentId===cell.studentId));
      this.setData({retainedNotice:recoveryNotice(this.retainedCells,this.activeScope,this.heldOperation),revision:response.revision,uncertain:false,needsReload:false,saving:false});
      this.remember();
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
      const nextScope = {eventId:this.data.eventId,projectIds:projects.map(project=>project.id),studentIds:rows.map(row=>row.studentId)};
      const recovery = restoreDraft({scope:this.activeScope,retainedCells:this.retainedCells,heldOperation:this.heldOperation,revision:this.data.revision,values:this.data.valuesByProject,saved:this.savedValuesByProject || {},pending:this.pendingSave,uncertain:this.data.uncertain,needsReload:this.data.needsReload},server,nextScope,scope.revision,projects,rows);
      const reviewRows = projects.flatMap(project => rows.map(row => ({key:`${project.id}/${row.studentId}`,label:`${row.name} · ${project.name}`,local:displayCell(recovery.values[project.id]?.[row.studentId]),server:displayCell(server[project.id]?.[row.studentId])})));
      this.preview = {workbench,scope,recovery};
      this.setData({reviewVisible:true,reviewRows});
    } catch { if (generation === this.generation) this.setData({saveError:"服务器记录读取失败，本机输入未改变，请重试核对。"}); }
    finally { if (generation === this.generation) this.setData({reviewLoading:false}); }
  },
  closeReview() { this.preview=null; this.setData({reviewVisible:false}); },
  useServer() { this.applyReviewed(false); },
  keepLocalChanges() { this.applyReviewed(true); },
  applyReviewed(keepLocal:boolean) {
    if (!this.preview || !this.data.reviewVisible) return;
    const {workbench,scope,recovery} = this.preview;
    const projects = selectedProjects(workbench,scope), members = presentStudents(workbench,scope);
    const saved = toAssessmentValues(scope,projects,members);
    const values = mergeReviewed(saved,recovery.values,recovery.saved,keepLocal,projects,members);
    this.activeScope = {eventId:this.data.eventId,projectIds:projects.map(project=>project.id),studentIds:members.map(row=>row.studentId)};
    // Only visible, explicitly reviewed edits adopt this new version. Hidden
    // recovery cells and unresolved operations keep their original identity.
    this.retainedCells = recovery.retainedCells.filter((cell:RecoveryCell)=>!pairAllowed(this.activeScope,cell.projectId,cell.studentId));
    this.heldOperation = recovery.heldOperation;
    this.savedValuesByProject = saved; this.pendingSave=null; this.preview=null;
    const activeProjectId=projects.some(p=>p.id===this.data.activeProjectId)?this.data.activeProjectId:projects[0]?.id || "";
    this.setData({projects:presentProjects(projects,activeProjectId),activeProjectId,rows:rowsForProject(members,values,activeProjectId),valuesByProject:values,revision:scope.revision!,needsReload:Boolean(this.heldOperation),uncertain:false,reviewVisible:false,retainedNotice:recoveryNotice(this.retainedCells,this.activeScope,this.heldOperation),saveError:this.heldOperation ? "原保存仍涉及暂不可评测的行，已保留；恢复范围后请核对原操作。" : "已采用核对后的版本，请检查输入后再次保存。"});
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
      if (!projects.some(project=>project.id===trainingProjectId) || !rows.some(row=>row.studentId===studentId)) continue;
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
    const changes=cellChanges(value,before);
    if(changes.score)next.scoreInput=value.scoreInput;
    if(changes.note)next.noteInput=value.noteInput;
    (result[projectId] ??= {})[studentId]=next;
  }
  return result;
}

function cellChanges(value:AssessmentValue,before?:AssessmentValue) {
  const score=value.scoreInput.trim(), old=before?.scoreInput.trim() || "";
  const changedScore=score === "" || old === "" ? score !== old : Number(score) !== Number(old);
  const changedNote=value.noteInput.trim() !== (before?.noteInput.trim() || "");
  return {score:changedScore,note:changedNote,any:changedScore || changedNote};
}
function hasLocalChanges(values:AssessmentValues,saved:AssessmentValues) {
  return Object.entries(values).some(([projectId,byStudent])=>Object.entries(byStudent).some(([studentId,value])=>cellChanges(value,saved[projectId]?.[studentId]).any));
}
function pairAllowed(scope:DraftScope,projectId:string,studentId:string) { return scope.projectIds.includes(projectId) && scope.studentIds.includes(studentId); }
function operationAllowed(pending:PendingSave,scope:DraftScope) { return pending.eventId===scope.eventId && pending.assessments.every(row=>pairAllowed(scope,row.trainingProjectId,row.studentId)); }
function inferredScope(draft:LocalDraft,eventId:string):DraftScope {
  return draft.scope || {eventId,projectIds:Object.keys(draft.values),studentIds:[...new Set(Object.values(draft.values).flatMap(byStudent=>Object.keys(byStudent)))]};
}
function recoveryNotice(cells:RecoveryCell[],scope:DraftScope,held:HeldOperation|null) {
  const hidden=cells.filter(cell=>!pairAllowed(scope,cell.projectId,cell.studentId)).length;
  const restored=cells.length-hidden;
  return [hidden ? `有 ${hidden} 项本机草稿暂不可提交，已保留原范围与版本。` : "",restored ? `已恢复 ${restored} 项本机草稿，请重新读取并核对后保存。` : "",held ? "原保存涉及暂不可评测的行，已保留原操作；恢复范围后才能核对重试。" : ""].filter(Boolean).join(" ");
}
function restoreDraft(draft:LocalDraft|undefined,server:AssessmentValues,scope:DraftScope,serverRevision:number|undefined,projects:TrainingProject[],rows:AssessmentRow[]) {
  if(!draft)return {values:server,saved:server,retainedCells:[] as RecoveryCell[],heldOperation:null as HeldOperation|null,pending:null as PendingSave|null,revision:validRevision(serverRevision)?serverRevision:null,uncertain:false,needsReload:false};
  const values=mergeValueMaps(server,allowedValues(draft.values,projects,rows));
  const saved=mergeValueMaps(server,allowedValues(draft.saved,projects,rows));
  const cells=new Map((draft.retainedCells || []).map(cell=>[JSON.stringify([cell.projectId,cell.studentId]),cell]));
  const originalScope=inferredScope(draft,scope.eventId);
  for(const [projectId,byStudent] of Object.entries(draft.values)) for(const [studentId,value] of Object.entries(byStudent)) {
    if(!pairAllowed(scope,projectId,studentId) && cellChanges(value,draft.saved[projectId]?.[studentId]).any) {
      const key=JSON.stringify([projectId,studentId]), original=cells.get(key);
      cells.set(key,original ? {...original,value:{...value}} : {projectId,studentId,value:{...value},saved:draft.saved[projectId]?.[studentId],revision:draft.revision,scope:originalScope});
    }
  }
  let restored=false;
  for(const cell of cells.values()) if(pairAllowed(scope,cell.projectId,cell.studentId)) {
    (values[cell.projectId] ??= {})[cell.studentId]={...cell.value};
    if(cell.saved)(saved[cell.projectId] ??= {})[cell.studentId]={...cell.saved};
    else delete (saved[cell.projectId] ??= {})[cell.studentId];
    restored=true;
  }
  let pending=draft.pending, held=draft.heldOperation || null, revision=draft.revision, uncertain=draft.uncertain;
  if(pending && !operationAllowed(pending,scope)) { held={pending,values:draft.values,saved:draft.saved,scope:originalScope}; pending=null; uncertain=false; }
  if(held && operationAllowed(held.pending,scope)) {
    pending=held.pending; revision=pending.revision; uncertain=true;
    for(const row of pending.assessments) {
      (values[row.trainingProjectId] ??= {})[row.studentId]={scoreInput:String(row.score),noteInput:row.note || ""};
      const before=held.saved[row.trainingProjectId]?.[row.studentId];
      if(before)(saved[row.trainingProjectId] ??= {})[row.studentId]={...before};
      else delete (saved[row.trainingProjectId] ??= {})[row.studentId];
    }
    held=null;
  }
  const needsReload=Boolean(held || !validRevision(serverRevision) || (!pending && (draft.needsReload || restored || revision!==serverRevision)));
  return {values,saved,retainedCells:[...cells.values()],heldOperation:held,pending,revision,uncertain,needsReload};
}
function copyValues(values:AssessmentValues):AssessmentValues { return Object.fromEntries(Object.entries(values).map(([projectId,byStudent])=>[projectId,Object.fromEntries(Object.entries(byStudent).map(([studentId,value])=>[studentId,{...value}]))])); }
function mergeValueMaps(base:AssessmentValues,override:AssessmentValues):AssessmentValues {
  const result=copyValues(base);
  for(const [projectId,byStudent] of Object.entries(override)) result[projectId]={...result[projectId],...byStudent};
  return result;
}
