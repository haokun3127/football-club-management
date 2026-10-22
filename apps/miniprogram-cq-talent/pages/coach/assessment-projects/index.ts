import { assessmentValueText } from "../../../utils/assessment-input";
import { getAssessmentForm, getCoachAssessmentEntries, getCoachAssessmentTasks, getCoachTrainingProjectTree, getCoachAssessmentWorkflow, publishCoachAssessments, getCoachAssessmentHistory } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { AssessmentForm, LoadState, TrainingContentMetricNode, TrainingContentTree } from "../../../utils/types";

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  metricIds: string[];
  sourceGroupId: string;
  sourceGroupLabel: string;
  statusLabel: string;
  statusTone: "pending";
  itemCountLabel: string;
  completedStudents: number;
  isSelected: boolean;
  cardClass: string;
  iconClass: string;
  iconSrc: string;
  selectClass: string;
};

type NavigationNodeView = { id: string; label: string; className: string };
type ProjectGroupView = { id: string; label: string; className: string; actionCount: number; cards: ProjectRow[] };

const TASK_STATUS_LABELS: Record<string, string> = { not_started: "未开始", in_progress: "进行中", completed: "已完成" };
const PROJECT_ICONS = [
  "/assets/icons/c10-target-rose.svg",
  "/assets/icons/c10-target-amber.svg",
  "/assets/icons/c10-target-violet.svg",
  "/assets/icons/c10-target-green.svg",
];

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取测评项目",
    taskTitle: "能力评估",
    taskId: "",
    templateId: "",
    teamContextLabel: "球队与学期待同步",
    progressLabel: "",
    projectProgressLabel: "",
    studentProgressLabel: "",
    taskStatusLabel: "",
    taskStatusClass: "",
    projects: [] as ProjectRow[],
    contentTree: undefined as TrainingContentTree | undefined,
    primaryNodes: [] as NavigationNodeView[],
    secondaryNodes: [] as NavigationNodeView[],
    tertiaryGroups: [] as ProjectGroupView[],
    activePrimaryId: "",
    activeSecondaryId: "",
    selectedIds: [] as string[],
    selectedCount: 0,
    confirmLabel: "选择项目后开始录入",
    confirmClass: "projects-select-bar__confirm projects-select-bar__confirm--disabled",
    isConfirmDisabled: true,
    managed: false,
    canPublish: false,
    publishing: false,
    publicationLabel: "",
    publicationMessage: "",
    reviewVisible:false,reviewLoading:false,reviewStudentId:"",reviewName:"",reviewRevision:0,reviewCanPublish:false,reviewMessage:"",
    reviewStudents:[] as Array<{studentId:string;name:string;revision:number;canPublish:boolean;completedFields:number;totalFields:number}>,
    reviewRows:[] as Array<{id:string;label:string;value:string;course:string;recorded:string}>,
  },
  async onLoad(query?: { taskId?: string; templateId?: string; title?: string; review?: string }) {
    await this.load(query?.taskId || "", query?.templateId || "", query?.title ? decodeURIComponent(query.title) : "能力评估");
    if (query?.review === "1" && this.data.state === "ready" && this.data.managed) await this.openReviewList();
  },
  async load(taskId: string, templateId: string, taskTitle: string) {
    const session = requireRole("coach");
    if (!session) return;
    if (!taskId || !templateId) {
      this.setData({ state: "empty", message: "缺少测评任务参数，请从测评任务列表进入。", projects: [] });
      return;
    }
    this.setData({ state: "loading", message: "正在读取测评项目", taskTitle, taskId, templateId });
    try {
      const tasks = await getCoachAssessmentTasks({ forceRefresh: true });
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.templateId !== templateId || (task.status !== "in_progress" && task.status !== "completed" && !(task.status === "not_started" && task.workflow))) {
        this.setData({ state: "empty", message: "当前测评任务不可录入，请返回任务列表后重试。", projects: [] });
        return;
      }
      if (task.workflow?.error) throw new Error(task.workflow.error);
      const [form, trainingTree] = await Promise.all([task.workflow ? getAssessmentForm(templateId, task.workflow.templateVersionId) : getAssessmentForm(templateId), getCoachTrainingProjectTree()]);
      const baseProjects = buildProjectRows({...form,fields:form.fields.filter((f) => !task.testItemIds || task.testItemIds.includes(f.testItemId || f.id))});
      const projects = presentProjects(await hydrateProjectProgress(task.id, task.totalStudents, baseProjects), []);
      const hierarchy = buildHierarchyPatch(trainingTree.contentTree, projects, [], "", "");
      const completedProjects = projects.reduce((count, project) => count + (project.completedStudents >= task.totalStudents && task.totalStudents > 0 ? 1 : 0), 0);
      this.setData({
        state: projects.length ? "ready" : "empty",
        message: projects.length ? "" : "当前测评表单暂无可录入项目。",
        taskTitle: task.title,
        teamContextLabel: `${task.teamName?.trim() || "球队待同步"} · ${task.termLabel?.trim() || "学期待同步"}`,
        progressLabel: `${task.completedStudents}/${task.totalStudents}名学员已完成`,
        projectProgressLabel: `测评项目 ${projects.length} 项 · 全员录完 ${completedProjects} 项`,
        studentProgressLabel: `学员 ${task.totalStudents} 人 · 完成全部项目 ${task.completedStudents} 人`,
        taskStatusLabel: TASK_STATUS_LABELS[task.status] || "进行中",
        taskStatusClass: `projects-progress__status--${task.status}`,
        managed: Boolean(task.workflow),
        canPublish: Boolean(task.workflow?.canEdit && task.workflow.readyStudents > 0),
        publicationLabel: task.workflow ? `已确认 ${task.workflow.publishedStudents}/${task.totalStudents} 人 · 待确认 ${task.workflow.readyStudents} 人` : "",
        projects,
        contentTree: trainingTree.contentTree,
        ...hierarchy,
        selectedIds: [],
        selectedCount: 0,
        confirmLabel: "选择项目后开始录入",
        confirmClass: "projects-select-bar__confirm projects-select-bar__confirm--disabled",
        isConfirmDisabled: true,
      });
    } catch {
      this.setData({ state: "error", message: "测评项目读取失败，请稍后重试。", projects: [] });
    }
  },
  onShow() {
    if (this.data.taskId && this.data.state === "ready" && !this.data.publishing) void this.load(this.data.taskId, this.data.templateId, this.data.taskTitle);
  },
  async openReviewList() {
    if(this.data.publishing)return;
    this.setData({reviewVisible:true,reviewLoading:true,reviewMessage:"",reviewCanPublish:false,reviewRows:[]});
    try {
      const workflow=await getCoachAssessmentWorkflow(this.data.taskId);
      this.setData({reviewStudents:workflow.students});
      const first=workflow.students.find(item=>item.canPublish)||workflow.students[0];
      if(first)await this.loadStudentReview(first.studentId,workflow.templateVersionId);
      else this.setData({reviewMessage:"暂无可核对学员"});
    }catch{this.setData({reviewMessage:"核对信息读取失败，请关闭后重试"});}
    finally{this.setData({reviewLoading:false});}
  },
  async chooseReviewStudent(event:{currentTarget:{dataset:{id?:string}}}) {
    if(this.data.publishing || this.data.reviewLoading || !event.currentTarget.dataset.id)return;
    await this.loadStudentReview(event.currentTarget.dataset.id);
  },
  async loadStudentReview(studentId:string,versionId?:string) {
    this.setData({reviewLoading:true,reviewCanPublish:false,reviewMessage:"",reviewRows:[],reviewStudentId:studentId});
    try {
      const workflow=await getCoachAssessmentWorkflow(this.data.taskId);
      const student=workflow.students.find(item=>item.studentId===studentId);
      if(!student)throw new Error("学员不可用");
      const [history,form]=await Promise.all([getCoachAssessmentHistory(this.data.taskId,studentId),getAssessmentForm(this.data.templateId,versionId||workflow.templateVersionId)]);
      const rows=form.fields.filter((f) => !workflow.testItemIds || workflow.testItemIds.includes(f.testItemId || f.id)).map(field=>{
        const entry=history.entries?.[field.testItemId||field.id];
        return {id:field.id,label:field.label,value:reviewValue(entry?.value,field.unit),course:entry?.occurredAt ? `课程：${reviewDate(entry.occurredAt)}` : "课程：未关联",recorded:entry?.recordedAt ? `录入：${reviewDate(entry.recordedAt)}` : "录入时间未记录"};
      });
      this.setData({reviewStudents:workflow.students,reviewName:student.name,reviewRows:rows,reviewRevision:history.revision,reviewCanPublish:Boolean(workflow.canEdit&&student.canPublish&&history.revision===student.revision),reviewMessage:history.revision!==student.revision?"成绩刚刚发生变化，请重新选择学员核对。":""});
    }catch{this.setData({reviewMessage:"该学员成绩读取失败，请重新选择后重试"});}
    finally{this.setData({reviewLoading:false});}
  },
  closeReview() {if(!this.data.publishing&&!this.data.reviewLoading)this.setData({reviewVisible:false});},
  async confirmReviewedStudent() {
    if(!this.data.reviewCanPublish||this.data.publishing||this.data.reviewLoading)return;
    const studentId=this.data.reviewStudentId;const expectedRevision=this.data.reviewRevision;
    this.setData({publishing:true,reviewMessage:""});
    try {
      const answer=await new Promise<{confirm:boolean}>(resolve=>wx.showModal({title:`确认同步 ${this.data.reviewName}`,content:"已核对本页项目成绩与各自课程日期，确认后家长可见。",success:resolve}));
      if(!answer.confirm)return;
      const response=await publishCoachAssessments(this.data.taskId,[{studentId,expectedRevision}]);
      const result=response.results.find(item=>item.studentId===studentId);
      if(!result?.success){this.setData({reviewMessage:result?.error?.message||"同步失败，当前核对内容已保留。"});return;}
      this.setData({reviewCanPublish:false,reviewMessage:"已同步该学员，可继续核对下一名。"});
      const workflow=await getCoachAssessmentWorkflow(this.data.taskId);
      this.setData({reviewStudents:workflow.students,canPublish:workflow.readyStudents>0,publicationLabel:`已确认 ${workflow.publishedStudents}/${workflow.totalStudents} 人 · 待确认 ${workflow.readyStudents} 人`});
    }catch{this.setData({reviewMessage:"同步失败，当前核对内容已保留，请重试。"});}
    finally{this.setData({publishing:false});}
  },
  toggleProject(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const projectId = event.currentTarget?.dataset?.id;
    if (!projectId || !this.data.projects.some((project: ProjectRow) => project.id === projectId)) return;
    const selected = new Set(this.data.selectedIds);
    if (selected.has(projectId)) selected.delete(projectId);
    else selected.add(projectId);
    const selectedIds = this.data.projects
      .map((project: ProjectRow) => project.id)
      .filter((id: string) => selected.has(id));
    this.setData({
      selectedIds,
      selectedCount: selectedIds.length,
      confirmLabel: selectedIds.length ? `开始录入（${selectedIds.length}项）` : "选择项目后开始录入",
      confirmClass: selectedIds.length ? "projects-select-bar__confirm" : "projects-select-bar__confirm projects-select-bar__confirm--disabled",
      isConfirmDisabled: selectedIds.length === 0,
      projects: presentProjects(this.data.projects, selectedIds),
      ...buildHierarchyPatch(this.data.contentTree, presentProjects(this.data.projects, selectedIds), selectedIds, this.data.activePrimaryId, this.data.activeSecondaryId),
    });
  },
  selectPrimary(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const primaryId = event.currentTarget?.dataset?.id;
    if (!primaryId) return;
    this.setData({
      ...buildHierarchyPatch(this.data.contentTree, this.data.projects, this.data.selectedIds, primaryId, ""),
    });
  },
  selectSecondary(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const secondaryId = event.currentTarget?.dataset?.id;
    if (!secondaryId) return;
    this.setData({
      ...buildHierarchyPatch(this.data.contentTree, this.data.projects, this.data.selectedIds, this.data.activePrimaryId, secondaryId),
    });
  },
  confirmSelection() {
    if (this.data.publishing) return;
    const projectId = this.data.selectedIds[0];
    if (!projectId || this.data.isConfirmDisabled) return;
    const projectIds = this.data.selectedIds.join(",");
    openPage(`/pages/coach/assessment-bulk-entry/index?taskId=${encodeURIComponent(this.data.taskId)}&templateId=${encodeURIComponent(this.data.templateId)}&projectId=${encodeURIComponent(projectId)}&projectIds=${encodeURIComponent(projectIds)}&title=${encodeURIComponent(this.data.taskTitle)}`);
  },
  goBack() {
    if (this.data.publishing) return;
    wx.navigateBack({ delta: 1 });
  },
  retry() {
    void this.load(this.data.taskId, this.data.templateId, this.data.taskTitle);
  },
});

function buildProjectRows(form: AssessmentForm): ProjectRow[] {
  return form.fields.filter((field) => field.id && field.testItemId && field.groupId).map((field, index) => ({
    id: field.testItemId || field.id,
    title: field.label,
    description: projectDescription(field),
    metricIds: field.metricId ? [field.metricId] : [],
    sourceGroupId: field.groupId,
    sourceGroupLabel: field.groupLabel || "测评项目",
    statusLabel: "待录入",
    statusTone: "pending",
    itemCountLabel: "1个指标",
    completedStudents: 0,
    isSelected: false,
    cardClass: "project-card",
    iconClass: `project-card__icon project-card__icon--tone-${index % 4}`,
    iconSrc: PROJECT_ICONS[index % 4] || PROJECT_ICONS[0]!,
    selectClass: "project-card__select",
  }));
}

function buildHierarchyPatch(
  contentTree: TrainingContentTree | undefined,
  projects: ProjectRow[],
  selectedIds: string[],
  requestedPrimaryId: string,
  requestedSecondaryId: string,
) {
  const originalPrimarySource = contentTree?.nodes ?? [];
  if (!originalPrimarySource.length) {
    return {
      primaryNodes: [],
      secondaryNodes: [],
      tertiaryGroups: [],
      activePrimaryId: "",
      activeSecondaryId: "",
      hasContentTree: false,
      hasActionCards: projects.length > 0,
    };
  }

  type VisibleTertiary = { node: TrainingContentMetricNode; cards: ProjectRow[] };
  type VisibleSecondary = { node: TrainingContentMetricNode; tertiary: VisibleTertiary[] };
  type VisiblePrimary = { node: TrainingContentMetricNode; secondary: VisibleSecondary[] };
  const visible = new Map<string, VisiblePrimary>();
  const mappedProjectIds = new Set<string>();

  const addVisible = (
    primaryNode: TrainingContentMetricNode,
    secondaryNode: TrainingContentMetricNode,
    tertiaryNode: TrainingContentMetricNode,
    cards: ProjectRow[],
  ) => {
    if (!cards.length) return;
    const primary = visible.get(primaryNode.id) || { node: primaryNode, secondary: [] };
    let secondary = primary.secondary.find((item) => item.node.id === secondaryNode.id);
    if (!secondary) {
      secondary = { node: secondaryNode, tertiary: [] };
      primary.secondary.push(secondary);
    }
    let tertiary = secondary.tertiary.find((item) => item.node.id === tertiaryNode.id);
    if (!tertiary) {
      tertiary = { node: tertiaryNode, cards: [] };
      secondary.tertiary.push(tertiary);
    }
    for (const card of cards) {
      if (!tertiary.cards.some((item) => item.id === card.id)) tertiary.cards.push(card);
    }
    visible.set(primaryNode.id, primary);
  };

  for (const primary of originalPrimarySource) {
    for (const secondary of primary.children) {
      for (const tertiary of secondary.children) {
        const cards = projects
          .filter((project) => !mappedProjectIds.has(project.id) && projectMatchesMetric(project, tertiary))
          .map((project) => presentProject(project, selectedIds.includes(project.id)));
        cards.forEach((card) => mappedProjectIds.add(card.id));
        addVisible(primary, secondary, tertiary, cards);
      }
    }
  }

  const unassignedProjects = projects.filter((project) => !mappedProjectIds.has(project.id));
  const unassignedByGroup = new Map<string, { label: string; projects: ProjectRow[] }>();
  for (const project of unassignedProjects) {
    const current = unassignedByGroup.get(project.sourceGroupId) || { label: project.sourceGroupLabel, projects: [] };
    current.projects.push(project);
    unassignedByGroup.set(project.sourceGroupId, current);
  }
  for (const [groupId, group] of unassignedByGroup) {
    const matchedPrimary = findAssessmentPrimary(originalPrimarySource, group.label);
    const primaryNode = matchedPrimary || createAssessmentPrimary(groupId, group.label);
    const secondaryNode = matchedPrimary
      ? createAssessmentSecondary(groupId, group.label)
      : primaryNode.children[0] || createAssessmentSecondary(groupId, group.label);
    const tertiaryNode = createAssessmentTertiary(groupId, group.label);
    addVisible(primaryNode, secondaryNode, tertiaryNode, group.projects.map((project) => presentProject(project, selectedIds.includes(project.id))));
  }

  const primarySource = Array.from(visible.values());
  const activePrimaryId = primarySource.some((item) => item.node.id === requestedPrimaryId)
    ? requestedPrimaryId
    : primarySource[0]?.node.id ?? "";
  const activePrimary = primarySource.find((item) => item.node.id === activePrimaryId);
  const primaryNodes = primarySource.map((node) => ({
    id: node.node.id,
    label: node.node.label,
    className: node.node.id === activePrimaryId ? "content-primary content-primary--active" : "content-primary",
  }));
  const secondarySource = activePrimary?.secondary ?? [];
  const activeSecondaryId = secondarySource.some((item) => item.node.id === requestedSecondaryId)
    ? requestedSecondaryId
    : secondarySource[0]?.node.id ?? "";
  const activeSecondary = secondarySource.find((item) => item.node.id === activeSecondaryId);
  const secondaryNodes = secondarySource.map((node) => ({
    id: node.node.id,
    label: node.node.label,
    className: node.node.id === activeSecondaryId ? "content-secondary content-secondary--active" : "content-secondary",
  }));

  const selected = new Set(selectedIds);
  const tertiaryGroups: ProjectGroupView[] = (activeSecondary?.tertiary ?? []).map((tertiary) => ({
    id: tertiary.node.id,
    label: tertiary.node.label,
    className: "content-tertiary",
    actionCount: tertiary.cards.length,
    cards: tertiary.cards.map((project) => presentProject(project, selected.has(project.id))),
  }));

  const actionCards = tertiaryGroups.flatMap((group) => group.cards);
  return {
    primaryNodes,
    secondaryNodes,
    tertiaryGroups,
    activePrimaryId,
    activeSecondaryId,
    hasContentTree: primarySource.length > 0,
    hasActionCards: actionCards.length > 0,
  };
}

function findAssessmentPrimary(nodes: TrainingContentMetricNode[], label: string) {
  const target = normalizeHierarchyLabel(label);
  if (!target) return undefined;
  return nodes.find((node) => {
    const current = normalizeHierarchyLabel(node.label);
    return current === target || current.includes(target) || target.includes(current);
  });
}

function normalizeHierarchyLabel(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function createAssessmentPrimary(groupId: string, label: string): TrainingContentMetricNode {
  return {
    id: `assessment-primary-${groupId}`,
    metricId: `assessment-primary-${groupId}`,
    label: label || "测评项目",
    level: 1,
    children: [
      createAssessmentSecondary(groupId, label),
    ],
    drills: [],
  };
}

function createAssessmentSecondary(groupId: string, label: string): TrainingContentMetricNode {
  return {
    id: `assessment-secondary-${groupId}`,
    metricId: `assessment-secondary-${groupId}`,
    label: "测评项目",
    level: 2,
    children: [],
    drills: [],
  };
}

function createAssessmentTertiary(groupId: string, label: string): TrainingContentMetricNode {
  return {
    id: `assessment-tertiary-${groupId}`,
    metricId: `assessment-tertiary-${groupId}`,
    label: label || "测评项目",
    level: 3,
    children: [],
    drills: [],
  };
}

function projectMatchesMetric(project: ProjectRow, tertiary: TrainingContentMetricNode) {
  return project.metricIds.includes(tertiary.metricId) || project.metricIds.includes(tertiary.id);
}

function presentProject(project: ProjectRow, isSelected: boolean): ProjectRow {
  return {
    ...project,
    isSelected,
    cardClass: isSelected ? "content-action-card content-action-card--selected" : "content-action-card",
    iconClass: project.iconClass,
    iconSrc: project.iconSrc,
    selectClass: isSelected ? "content-action-card__select content-action-card__select--selected" : "content-action-card__select",
  };
}

async function hydrateProjectProgress(taskId: string, totalStudents: number, projects: ProjectRow[]): Promise<ProjectRow[]> {
  const responses = await Promise.all(projects.map((project) => getCoachAssessmentEntries(taskId, project.id)));
  return projects.map((project, index) => {
    const completedStudents = Object.keys(responses[index]?.savedValuesByStudent || {}).length;
    return { ...project, completedStudents, statusLabel: completedStudents > 0 ? `已录 ${Math.min(completedStudents, totalStudents)}/${totalStudents}` : "待录入" };
  });
}

function projectDescription(field?: AssessmentForm["fields"][number]) {
  const unit = unitLabel(field);
  const manual = field?.valueKind === "score_0_100" || field?.valueKind === "rating_1_5";
  return manual ? "按项目评分标准录入" : `记录原始成绩 · 单位：${unit}`;
}

function unitLabel(field?: AssessmentForm["fields"][number]) {
  if (field?.unit) return field.unit;
  const labels: Record<string, string> = { duration_seconds: "秒", duration_minutes: "分钟", distance_meters: "米", count: "次数", percentage: "%", score_0_100: "分", rating_1_5: "分" };
  return labels[field?.valueKind || ""] || "原始值";
}

function presentProjects(projects: ProjectRow[], selectedIds: string[]): ProjectRow[] {
  const selected = new Set(selectedIds);
  return projects.map((project, index) => {
    const isSelected = selected.has(project.id);
    return {
      ...project,
      isSelected,
      cardClass: isSelected ? "project-card project-card--selected" : "project-card",
      iconClass: `project-card__icon project-card__icon--tone-${index % 4}`,
      iconSrc: PROJECT_ICONS[index % 4] || PROJECT_ICONS[0]!,
      selectClass: isSelected ? "project-card__select project-card__select--selected" : "project-card__select",
    };
  });
}

function reviewDate(value:string){const date=new Date(Date.parse(value)+8*3600000);return Number.isFinite(date.getTime())?date.toISOString().slice(0,16).replace("T"," "):"时间未知";}
function reviewValue(value:Record<string,unknown>|undefined,unit?:string){
  if(!value)return "未测";
  const score=assessmentValueText(value);
  return score===""?"未测":`${String(score)}${value.kind==="score_0_100"?" 分":unit||String(value.unit||"")}`;
}
