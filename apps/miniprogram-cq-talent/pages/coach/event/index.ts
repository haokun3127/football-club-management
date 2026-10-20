import { correctTrainingRecord, type TrainingRecord } from "../../../utils/training-records";
import { attendanceLeaveConflictMessage, getCoachAssessmentTasks, getTrainingTemplates, saveTrainingTemplate, previewTrainingTransfer, applyTrainingTransfer, getCoachWorkbench, isAttendanceLeaveConflictError, resolveAttendanceLeaveConflicts, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityTypeLabel, formatCalendarDate, formatShortDate, formatTimeOnly, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { TrainingTemplateSummary, TrainingTransferSource, TrainingTransferPreview, CoachWorkbench, LoadState, TrainingContentSummary } from "../../../utils/types";

type TransferTarget = TrainingTransferPreview["targets"][number] & { action: "replace" | "skip"; existingLabel: string; dateLabel: string };

type WorkbenchAction = "attendance" | "records" | "match" | "tactical" | "training" | "training-assessment" | "change";

type ActionCard = {
  id: WorkbenchAction;
  label: string;
  icon?: string;
  glyph?: string;
};

type RosterRow = CoachWorkbench["roster"][number] & { statusLabel: string; present: boolean; initial: string; initialStatus: string; displayName: string; record?: TrainingRecord };

type EventView = {
  title: string;
  typeLabel: string;
  teamName: string;
  hasTeamName: boolean;
  venue: string;
  hasVenue: boolean;
  timeLabel: string;
  hasTime: boolean;
  sessionTeam: string;
  sessionMeta: string;
  heroDateLabel: string;
  startTime: string;
  heroMeta: string;
};

Page({
  data: {
    transferVisible: false, transferBusy: false, transferMode: "copy", transferMessage: "", templateTitle: "",
    templates: [] as Array<TrainingTemplateSummary & { summary: string }>, hasTemplates: false,
    transferSource: {} as TrainingTransferSource, transferPreview: null as TrainingTransferPreview["source"] | null,
    transferTargets: [] as TransferTarget[], hasTransferTargets: false, transferResults: [] as Array<{ eventId: string; title: string; label: string }>, hasTransferResults: false,
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取活动工作台",
    eventId: "",
    eventTypeLabel: "活动",
    eventView: null as EventView | null,
    rosterRows: [] as RosterRow[],
    rosterCount: 0,
    workflowRows: [] as CoachWorkbench["workflow"],
    trainingRows: [] as CoachWorkbench["training"],
    matchRows: [] as CoachWorkbench["match"],
    pendingRows: [] as CoachWorkbench["pending"],
    actionCards: [] as ActionCard[],
    assessmentTemplateId: "",
    canWrite: false,
    canEditTraining:false,
    canManageRoster:false,
    contentSummary:null as TrainingContentSummary|null,
    contentGroups:[] as TrainingContentSummary["groups"],contentExpanded:false,hiddenContentCount:0,contentMinutesLabel:"",contentCount:0,hasConfiguredContent:false,
    hasRoster: false,
    hasWorkflow: false,
    hasTraining: false,
    hasMatch: false,
    hasPendingRows: false,
    hasActionCards: false,
    hasAssessmentTemplate: false,
    trainingContentSummary: "",
    attendancePresent: 0,
    attendanceTotal: 0,
    joinedNames: "",
    attendanceSaving: false,
    attendanceNeedsRefresh: false,
    trainingFactsAvailable: false,
    isTraining: false,
    courseTasks: [] as Array<{ id: string; title: string; templateId: string; summary: string }>,
    courseTaskMessage: "",
    attendanceError: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    if (!requireRole("coach")) return;
    this.load(query?.id || "");
  },
  onShow() { if (this.data.eventId && this.data.state !== "loading" && !this.data.attendanceSaving) void this.load(this.data.eventId); },
  onUnload() { nextTransferRequest(this); nextLoadRequest(this); },
  async openTransfer(event: { currentTarget: { dataset: { mode: string } } }) {
    if (!this.data.canEditTraining) return;
    const mode = event.currentTarget.dataset.mode;
    if (!["copy", "templates", "save"].includes(mode)) return;
    if (mode === "copy") { openPage(`/pages/coach/content-copy/index?eventId=${encodeURIComponent(this.data.eventId)}`); return; }
    const token = nextTransferRequest(this);
    this.setData({ transferVisible: true, transferMode: mode, transferBusy: false, transferMessage: "", transferPreview: null, transferTargets: [], hasTransferTargets: false, transferResults: [], hasTransferResults: false, templateTitle: "" });
    if (mode === "templates") {
      this.setData({ transferBusy: true });
      try { const templates = await getTrainingTemplates(); if (currentTransferRequest(this, token)) this.setData({ templates: templates.map(item => ({ ...item, summary: `${item.items.map(x => x.name).join(" · ")} · ${item.configuredMinutes}分钟` })), hasTemplates: templates.length > 0 }); }
      catch { if (currentTransferRequest(this, token)) this.setData({ transferMessage: "模板读取失败，请关闭后重试。" }); }
      finally { if (currentTransferRequest(this, token)) this.setData({ transferBusy: false }); }
    }
  },
  closeTransfer() { if (this.data.transferBusy) return; nextTransferRequest(this); this.setData({ transferVisible: false }); },
  selectTemplate(event: { currentTarget: { dataset: { id: string } } }) { return this.loadTransferPreview({ sourceTemplateId: event.currentTarget.dataset.id }); },
  async loadTransferPreview(source: TrainingTransferSource) {
    const token = nextTransferRequest(this); this.setData({ transferBusy: true, transferMessage: "", hasTransferResults: false, transferPreview: null });
    try {
      const preview = await previewTrainingTransfer(source); if (!currentTransferRequest(this, token)) return;
      const targets = preview.targets.filter(target => this.data.transferMode !== "templates" || target.eventId === this.data.eventId);
      this.setData({ transferSource: source, transferPreview: preview.source, transferTargets: targets.map(target => ({ ...target, action: "skip", dateLabel: formatCalendarDate(target.startsAt), existingLabel: target.existing.map(item => item.name).join(" · ") || "尚无内容" })), hasTransferTargets: targets.length > 0,
        transferMessage: !preview.source.count ? "排除友谊赛后没有可复制的内容。" : !targets.length ? "没有可编排的未来课程。" : "选择需要写入的课程；已有内容只有在明确选择替换后才会改变。" });
    } catch { if (currentTransferRequest(this, token)) this.setData({ transferMessage: "预览失败，请重新检查课程或模板权限。" }); }
    finally { if (currentTransferRequest(this, token)) this.setData({ transferBusy: false }); }
  },
  toggleTransferTarget(event: { currentTarget: { dataset: { id: string } } }) {
    if (this.data.transferBusy) return;
    this.setData({ transferTargets: this.data.transferTargets.map((target: TransferTarget) => target.eventId === event.currentTarget.dataset.id ? { ...target, action: target.action === "replace" ? "skip" : "replace" } : target) });
  },
  onTemplateTitle(event: { detail: { value: string } }) { this.setData({ templateTitle: event.detail.value }); },
  async saveTemplate() {
    if (this.data.transferBusy || !this.data.templateTitle.trim()) return;
    const token = nextTransferRequest(this); this.setData({ transferBusy: true });
    try { const result = await saveTrainingTemplate(this.data.eventId, this.data.templateTitle.trim()); if (currentTransferRequest(this, token)) this.setData({ transferMessage: `已保存个人模板「${result.template.title}」${result.excluded.length ? "，已排除友谊赛内容" : ""}`, templateTitle: "" }); }
    catch { if (currentTransferRequest(this, token)) this.setData({ transferMessage: "模板未确认保存，请检查内容后重试。" }); }
    finally { if (currentTransferRequest(this, token)) this.setData({ transferBusy: false }); }
  },
  async confirmTransfer() {
    if (this.data.transferBusy || !this.data.transferPreview?.count) return;
    const selected: TransferTarget[] = this.data.transferTargets.filter((target: TransferTarget) => target.action === "replace");
    if (!selected.length || selected.length > 20) { this.setData({ transferMessage: "请明确选择 1 至 20 堂目标课程。" }); return; }
    const token = nextTransferRequest(this); this.setData({ transferBusy: true });
    try {
      const result = await applyTrainingTransfer({ ...this.data.transferSource, sourceRevision: this.data.transferPreview.revision, targets: selected.map(target => ({ eventId: target.eventId, expectedRevision: target.revision, action: "replace" })) });
      if (!currentTransferRequest(this, token)) return;
      this.setData({ hasTransferResults: true, transferResults: result.results.map(item => ({ ...item, title: selected.find(target => target.eventId === item.eventId)?.title || "课程", label: ({ applied: "已保存", skipped: "已跳过", conflict: "课程已变化，请重新预览", forbidden: "无编排权限", failed: "保存失败，可重新预览后重试" } as Record<string,string>)[item.status] || "结果待核对" })), transferMessage: "复制结果如下。再次操作前请重新预览。", transferPreview: null });
      if (result.results.some(item => item.eventId === this.data.eventId && item.status === "applied")) await this.load(this.data.eventId);
    } catch { if (currentTransferRequest(this, token)) this.setData({ transferPreview: null, transferMessage: "内容或权限可能已变化，请关闭后重新预览；已选择课程不会被自动覆盖。" }); }
    finally { if (currentTransferRequest(this, token)) this.setData({ transferBusy: false }); }
  },
  async load(id: string) {
    if (!requireRole("coach")) return;
    const request = nextLoadRequest(this);
    if (!id) {
      this.setData({ state: "error", message: "缺少活动 ID" });
      return;
    }
    this.setData({ state: "loading", message: "正在读取活动工作台", eventId: id });
    try {
      const workbench = await getCoachWorkbench(id);
      if (!currentLoadRequest(this, request)) return;
      const eventView = presentEvent(workbench);
      const canWrite = workbench.event.status !== "cancelled";
      const isTraining = workbench.event.type === "training";
      const records = new Map((workbench.trainingRecords ?? []).map(record => [record.studentId, record]));
      const rosterRows = buildRosterRows(workbench, isTraining, records);
      const attendancePresent = rosterRows.filter((item) => item.present).length;
      const joinedNames = rosterRows
        .filter((item) => item.present)
        .map((item) => item.name)
        .join(" · ");
      const workflowRows: CoachWorkbench["workflow"] = [];
      const trainingRows = workbench.event.type === "training" ? workbench.training.map((item) => ({ ...item })) : [];
      const trainingContentSummary = workbench.selectedTrainingProjects.map((item) => item.name).join(" · ")
        || trainingRows.map((item) => item.value).join(" · ");
      const matchRows = workbench.event.type === "match" ? workbench.match.map((item) => ({ ...item })) : [];
      const pendingRows = workbench.pending.map((item) => ({ ...item }));
      const actionCards = buildActionCards(workbench, canWrite);
      const hasDetails = rosterRows.length > 0
        || trainingRows.length > 0
        || matchRows.length > 0
        || pendingRows.length > 0
        || actionCards.length > 0;

      this.setData({
        state: hasDetails ? "ready" : "empty",
        message: hasDetails ? "" : "当前活动暂无可用工作台数据",
        eventId: id,
        eventTypeLabel: activityTypeLabel(workbench.event.type),
        eventView,
        isTraining, trainingFactsAvailable: Array.isArray(workbench.trainingRecords), attendanceNeedsRefresh: false,
        trainingContentSummary,
        ...contentSummaryView(workbench.contentSummary??null,false),
        rosterRows,
        rosterCount: rosterRows.length,
        workflowRows,
        trainingRows,
        matchRows,
        pendingRows,
        actionCards,
        assessmentTemplateId: workbench.assessmentTemplateId || "",
        canWrite,
        canEditTraining:canWrite&&workbench.canEditTraining===true,
        canManageRoster:canWrite&&workbench.canManageRoster===true,
        hasRoster: rosterRows.length > 0,
        hasWorkflow: workflowRows.length > 0,
        hasTraining: trainingRows.length > 0,
        hasMatch: matchRows.length > 0,
        hasPendingRows: pendingRows.length > 0,
        hasActionCards: actionCards.length > 0,
        hasAssessmentTemplate: Boolean(workbench.assessmentTemplateId),
        attendancePresent,
        attendanceTotal: rosterRows.length,
        joinedNames,
        attendanceSaving: false,
        attendanceError: "",
      });
      if (isTraining) void this.loadCourseTasks(id, request);
    } catch {
      if (!currentLoadRequest(this, request)) return;
      this.setData({
        state: "error",
        message: "活动读取失败，请稍后重试",
        eventId: id,
        eventView: null,
        rosterRows: [],
        rosterCount: 0,
        workflowRows: [],
        trainingRows: [],
        matchRows: [],
        pendingRows: [],
        actionCards: [],
        assessmentTemplateId: "",
        canWrite: false,
        hasRoster: false,
        hasWorkflow: false,
        hasTraining: false,
        hasMatch: false,
        hasPendingRows: false,
        hasActionCards: false,
        hasAssessmentTemplate: false,
        attendancePresent: 0,
        attendanceTotal: 0,
        joinedNames: "",
        attendanceSaving: false,
        attendanceError: "",
      });
    }
  },
  async loadCourseTasks(eventId: string, ticket: number) {
    this.setData({ courseTasks: [], courseTaskMessage: "正在读取本课测评" });
    try {
      const tasks = await getCoachAssessmentTasks({ forceRefresh: true });
      if (!currentLoadRequest(this, ticket)) return;
      const courseTasks = tasks.filter(task => task.sourceEventId === eventId).map(task => ({ id: task.id, title: task.title, templateId: task.templateId, summary: `${task.completedStudents}/${task.totalStudents} 人完成` }));
      this.setData({ courseTasks, courseTaskMessage: courseTasks.length ? "" : "本课暂无测评任务" });
    } catch { if (currentLoadRequest(this, ticket)) this.setData({ courseTaskMessage: "本课测评读取失败，请刷新重试" }); }
  },
  openCourseTask(event: { currentTarget: { dataset: { id: string } } }) {
    const task = this.data.courseTasks.find((item: { id: string }) => item.id === event.currentTarget.dataset.id);
    if (task) openPage(`/pages/coach/assessment-projects/index?taskId=${encodeURIComponent(task.id)}&templateId=${encodeURIComponent(task.templateId)}&title=${encodeURIComponent(task.title)}`);
  },
  openTemporaryPlayers() { if(this.data.canManageRoster) openPage(`/pages/coach/scout/index?eventId=${encodeURIComponent(this.data.eventId)}`); },
  createAssessmentTask() {if(this.data.canWrite && this.data.eventId) openPage(`/pages/coach/test-task-create/index?eventId=${encodeURIComponent(this.data.eventId)}`);},
  toggleContent() {this.setData(contentSummaryView(this.data.contentSummary,!this.data.contentExpanded));},
  openAction(event: { currentTarget?: { dataset?: { action?: WorkbenchAction } } }) {
    const action = event.currentTarget?.dataset?.action;
    const id = this.data.eventId;
    if ((!this.data.canWrite && action !== "records") || !id || !action || !this.data.actionCards.some((item: ActionCard) => item.id === action)) return;

    const route = routeForAction(action, id, this.data.assessmentTemplateId);
    if (route) openPage(route);
  },
  openAttendance() {
    if (this.data.eventId) openPage(`/pages/coach/${this.data.isTraining ? "lesson" : "attendance"}/index?id=${encodeURIComponent(this.data.eventId)}`);
  },
  async toggleAttendance(event: { currentTarget?: { dataset?: { index?: string | number } } }) {
    if (!this.data.canWrite || this.data.attendanceSaving || this.data.attendanceNeedsRefresh) return;
    const index = Number(event.currentTarget?.dataset?.index);
    const current = this.data.rosterRows[index];
    if (!Number.isInteger(index) || !current || !this.data.eventId) return;
    if (this.data.isTraining) {
      if (!this.data.trainingFactsAvailable) { this.setData({ attendanceError: "训练记录暂不可用，请刷新后重试。", attendanceNeedsRefresh: true }); return; }
      const ticket = (this as unknown as { _loadRequest?: number })._loadRequest ?? 0;
      this.setData({ attendanceSaving: true, attendanceError: "" });
      try {
        const result = await correctTrainingRecord(current.studentId, this.data.eventId, {
          expectedRevision: current.record?.revision ?? 0, counted: !current.present,
          reason: current.present ? "教练快捷更正为未出勤" : "教练快捷更正为已出勤",
        });
        if (!currentLoadRequest(this, ticket)) return;
        if (!result.record || result.record.studentId !== current.studentId || result.record.eventId !== this.data.eventId || result.record.counted !== !current.present || result.record.revision !== (current.record?.revision ?? 0) + 1) throw new Error("结果未确认");
        const rosterRows = this.data.rosterRows.map((row: RosterRow) => row.studentId === current.studentId ? { ...row, record: result.record, present: result.record.counted, statusLabel: result.record.counted ? "已到" : "未到" } : row);
        this.setData({ rosterRows, ...attendanceSummary(rosterRows), attendanceSaving: false });
      } catch (error) {
        if (!currentLoadRequest(this, ticket)) return;
        this.setData({ attendanceSaving: false, attendanceNeedsRefresh: true, attendanceError: (error as { code?: string }).code === "training_record_conflict" ? "记录已被更新，请刷新核对后再操作。" : "保存结果未确认，请刷新核对后再操作。" });
      }
      return;
    }
    const previousRows = this.data.rosterRows;
    const nextStatus = current.present ? "absent" : "present";
    const nextRows = previousRows.map((item: RosterRow, rowIndex: number) => rowIndex === index
      ? { ...item, status: nextStatus, statusLabel: nextStatus === "present" ? "已到" : "未到", present: nextStatus === "present" }
      : item);
    this.setData({ ...attendanceSummary(nextRows), rosterRows: nextRows, attendanceSaving: true, attendanceError: "" });
    try {
      await saveCoachAttendance(this.data.eventId, nextRows.map((item: RosterRow) => ({
        studentId: item.studentId,
        name: item.name,
        status: item.status,
        note: item.note,
        previousStatus: item.initialStatus,
      })));
      this.setData({ attendanceSaving: false });
    } catch (error) {
      // 家长请假冲突与点名页同一套处理：重拉名单、展示冲突学员、核对后重新提交（REQ-ATT-002）。
      if (isAttendanceLeaveConflictError(error)) {
        await this.refreshAttendanceAfterLeaveConflict(nextRows);
        return;
      }
      this.setData({ ...attendanceSummary(previousRows), rosterRows: previousRows, attendanceSaving: false, attendanceError: "出勤保存失败，请重试" });
    }
  },
  async refreshAttendanceAfterLeaveConflict(attempted: Array<{ studentId: string; status: string; previousStatus?: string }>) {
    try {
      const workbench = await getCoachWorkbench(this.data.eventId);
      const conflicts = resolveAttendanceLeaveConflicts(workbench.roster, attempted);
      const records = new Map((workbench.trainingRecords ?? []).map(record => [record.studentId, record]));
      const rosterRows = buildRosterRows(workbench, this.data.isTraining, records);
      this.setData({
        rosterRows,
        rosterCount: rosterRows.length,
        hasRoster: rosterRows.length > 0,
        ...attendanceSummary(rosterRows),
        attendanceSaving: false,
        attendanceNeedsRefresh: false,
        attendanceError: attendanceLeaveConflictMessage(conflicts),
      });
    } catch {
      this.setData({ attendanceSaving: false, attendanceNeedsRefresh: true, attendanceError: "名单已变化且刷新失败，请刷新核对后重试。" });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  goBack() {
    wx.navigateBack();
  },
});

function presentEvent(workbench: CoachWorkbench): EventView {
  const hasTime = Boolean(workbench.event.startsAt && workbench.event.endsAt);
  const timeLabel = hasTime ? `${formatShortDate(workbench.event.startsAt)} ${formatTimeRange(workbench.event.startsAt, workbench.event.endsAt)}` : "";
  const sessionTeam = workbench.event.teamName || workbench.event.venue || "";
  const sessionMeta = [sessionTeam, timeLabel].filter(Boolean).join(" · ");
  return {
    title: workbench.event.title,
    typeLabel: activityTypeLabel(workbench.event.type),
    teamName: workbench.event.teamName || "",
    hasTeamName: Boolean(workbench.event.teamName),
    venue: workbench.event.venue || "",
    hasVenue: Boolean(workbench.event.venue),
    timeLabel,
    hasTime,
    sessionTeam,
    sessionMeta,
    heroDateLabel: formatCalendarDate(workbench.event.startsAt),
    startTime: formatTimeOnly(workbench.event.startsAt),
    heroMeta: [sessionTeam, workbench.event.venue || ""].filter(Boolean).join(" · "),
  };
}

function buildActionCards(workbench: CoachWorkbench, canWrite: boolean): ActionCard[] {
  if (!canWrite) return workbench.event.type === "training" ? [actionCard("records", "训练记录")] : [];

  const cards: ActionCard[] = [];
  if (workbench.event.type === "training") {
    if(workbench.canEditTraining === true) cards.push(actionCard("training", "训练内容"));
    cards.push(actionCard("training-assessment", "课堂评测"));
    cards.push(actionCard("records", "训练记录"));
  }
  if (workbench.event.type === "match") {
    cards.push(actionCard("match", "比赛录入"));
    cards.push(actionCard("tactical", "比赛战术板"));
  }
  if(workbench.canEditTraining === true) cards.push(actionCard("change", "变更活动"));
  return cards;
}

function actionCard(id: WorkbenchAction, label: string): ActionCard {
  const icons: Record<WorkbenchAction, string> = {
    attendance: "/assets/icons/check-circle.svg",
    records: "/assets/icons/tab-calendar.svg",
    match: "/assets/icons/c10-target-rose.svg",
    tactical: "/assets/icons/c10-target-violet.svg",
    training: "/assets/icons/tab-training.svg",
    "training-assessment": "/assets/icons/c164-category-assessment.svg",
    change: "/assets/icons/alert.svg",
  };
  const glyphs: Partial<Record<WorkbenchAction, string>> = {
    training: "✦",
    "training-assessment": "◎",
    change: "↻",
  };
  return glyphs[id]
    ? { id, label, glyph: glyphs[id] }
    : { id, label, icon: icons[id] };
}

function attendanceSummary(rosterRows: RosterRow[]) {
  const presentRows = rosterRows.filter((item) => item.present);
  return {
    attendancePresent: presentRows.length,
    attendanceTotal: rosterRows.length,
    joinedNames: presentRows.map((item) => item.name).join(" · "),
  };
}

function routeForAction(action: WorkbenchAction, eventId: string, _templateId: string) {
  const routes: Record<WorkbenchAction, string> = {
    attendance: `/pages/coach/attendance/index?id=${eventId}`,
    records: `/pages/coach/lesson/index?id=${eventId}`,
    match: `/pages/coach/match/index?id=${eventId}`,
    tactical: `/pages/coach/tactical-board/index?eventId=${eventId}`,
    training: `/pages/coach/content-select/index?eventId=${eventId}`,
    "training-assessment": `/pages/coach/training-assessment/index?eventId=${eventId}`,
    change: `/pages/coach/event-change/index?id=${eventId}`,
  };
  return routes[action];
}

function buildRosterRows(workbench: CoachWorkbench, isTraining: boolean, records: Map<string, TrainingRecord>): RosterRow[] {
  return workbench.roster.map((item) => ({
    ...item,
    record: records.get(item.studentId),
    statusLabel: (isTraining ? records.get(item.studentId)?.counted : isPresentStatus(item.status)) ? "已到" : "未到",
    present: isTraining ? records.get(item.studentId)?.counted === true : isPresentStatus(item.status),
    initial: (item.name || "学").slice(0, 1),
    initialStatus: item.status,
    displayName: item.name || "学员",
  }));
}

function isPresentStatus(value: string) {
  const status = value.toLowerCase();
  return status === "present" || status === "attended" || status === "late";
}

function contentSummaryView(summary:TrainingContentSummary|null,expanded:boolean) {
  let remaining=expanded?Number.MAX_SAFE_INTEGER:6;
  const groups=(summary?.groups??[]).map(group=>{const items=group.items.slice(0,remaining);remaining=Math.max(0,remaining-items.length);return {...group,items:items.map(item=>({...item,minutesLabel:item.configuredMinutes===null?"时长未配置":`${item.configuredMinutes} 分钟`}))};}).filter(group=>group.items.length);
  return {contentSummary:summary,contentExpanded:expanded,contentGroups:groups,contentCount:summary?.count??0,hasConfiguredContent:Boolean(summary?.count),hiddenContentCount:Math.max(0,(summary?.count??0)-6),contentMinutesLabel:summary?.configuredMinutes===null||summary?.configuredMinutes===undefined?"":`内容配置时长合计 ${summary.configuredMinutes} 分钟`};
}

function nextTransferRequest(page: unknown) { const p=page as {_transferRequest?: number}; return p._transferRequest=(p._transferRequest||0)+1; }
function currentTransferRequest(page: unknown, token: number) { return (page as {_transferRequest?: number})._transferRequest===token; }

function nextLoadRequest(page: unknown) { const p = page as { _loadRequest?: number }; return p._loadRequest = (p._loadRequest ?? 0) + 1; }
function currentLoadRequest(page: unknown, token: number) { return (page as { _loadRequest?: number })._loadRequest === token; }
