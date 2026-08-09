import { getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityStatus, activityTypeLabel, formatCalendarDate, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type WorkbenchAction = "attendance" | "lesson" | "match" | "tactical" | "training" | "assessment" | "change";

type ActionCard = {
  id: WorkbenchAction;
  label: string;
  toneClass: string;
};

type RosterRow = CoachWorkbench["roster"][number] & { statusLabel: string };

type EventView = {
  title: string;
  typeLabel: string;
  statusLabel: string;
  statusTone: string;
  teamName: string;
  hasTeamName: boolean;
  venue: string;
  hasVenue: boolean;
  timeLabel: string;
  hasTime: boolean;
};

Page({
  data: {
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
    hasRoster: false,
    hasWorkflow: false,
    hasTraining: false,
    hasMatch: false,
    hasPendingRows: false,
    hasActionCards: false,
    hasAssessmentTemplate: false,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.load(query?.id || "");
  },
  async load(id: string) {
    if (!id) {
      this.setData({ state: "error", message: "缺少活动 ID" });
      return;
    }
    this.setData({ state: "loading", message: "正在读取活动工作台", eventId: id });
    try {
      const workbench = await getCoachWorkbench(id);
      const eventView = presentEvent(workbench);
      const canWrite = workbench.event.status !== "cancelled";
      const rosterRows = workbench.roster.map((item) => ({ ...item, statusLabel: rosterStatusLabel(item.status) }));
      const workflowRows = workbench.workflow.map((item) => ({ ...item }));
      const trainingRows = workbench.event.type === "training" ? workbench.training.map((item) => ({ ...item })) : [];
      const matchRows = workbench.event.type === "match" ? workbench.match.map((item) => ({ ...item })) : [];
      const pendingRows = workbench.pending.map((item) => ({ ...item }));
      const actionCards = buildActionCards(workbench, canWrite);
      const hasDetails = rosterRows.length > 0
        || workflowRows.length > 0
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
        rosterRows,
        rosterCount: rosterRows.length,
        workflowRows,
        trainingRows,
        matchRows,
        pendingRows,
        actionCards,
        assessmentTemplateId: workbench.assessmentTemplateId || "",
        canWrite,
        hasRoster: rosterRows.length > 0,
        hasWorkflow: workflowRows.length > 0,
        hasTraining: trainingRows.length > 0,
        hasMatch: matchRows.length > 0,
        hasPendingRows: pendingRows.length > 0,
        hasActionCards: actionCards.length > 0,
        hasAssessmentTemplate: Boolean(workbench.assessmentTemplateId),
      });
    } catch {
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
      });
    }
  },
  openAction(event: { currentTarget?: { dataset?: { action?: WorkbenchAction } } }) {
    const action = event.currentTarget?.dataset?.action;
    const id = this.data.eventId;
    if (!this.data.canWrite || !id || !action || !this.data.actionCards.some((item: ActionCard) => item.id === action)) return;

    const route = routeForAction(action, id, this.data.assessmentTemplateId);
    if (route) openPage(route);
  },
  retry() {
    this.load(this.data.eventId);
  },
  goBack() {
    wx.navigateBack();
  },
});

function presentEvent(workbench: CoachWorkbench): EventView {
  const status = activityStatus(workbench.event.status);
  const hasTime = Boolean(workbench.event.startsAt && workbench.event.endsAt);
  return {
    title: workbench.event.title,
    typeLabel: activityTypeLabel(workbench.event.type),
    statusLabel: status.label,
    statusTone: status.tone,
    teamName: workbench.event.teamName || "",
    hasTeamName: Boolean(workbench.event.teamName),
    venue: workbench.event.venue || "",
    hasVenue: Boolean(workbench.event.venue),
    timeLabel: hasTime ? `${formatCalendarDate(workbench.event.startsAt)} · ${formatTimeRange(workbench.event.startsAt, workbench.event.endsAt)}` : "",
    hasTime,
  };
}

function buildActionCards(workbench: CoachWorkbench, canWrite: boolean): ActionCard[] {
  if (!canWrite) return [];

  const cards: ActionCard[] = [];
  if (workflowPending(workbench, "点名")) cards.push({ id: "attendance", label: "点名", toneClass: "action-tile--primary" });
  if (workbench.event.type !== "other" && workflowPending(workbench, "销课")) cards.push({ id: "lesson", label: "销课", toneClass: "" });
  if (workbench.event.type === "training") cards.push({ id: "training", label: "训练内容", toneClass: "" });
  if (workbench.event.type === "match") {
    cards.push({ id: "match", label: "比赛录入", toneClass: "action-tile--match" });
    cards.push({ id: "tactical", label: "比赛战术板", toneClass: "action-tile--match" });
  }
  if (workbench.assessmentTemplateId) cards.push({ id: "assessment", label: "评测录入", toneClass: "" });
  cards.push({ id: "change", label: "变更活动", toneClass: "" });
  return cards;
}

function workflowPending(workbench: CoachWorkbench, label: string) {
  return workbench.workflow.some((item) => item.label === label && item.status === "pending");
}

function routeForAction(action: WorkbenchAction, eventId: string, templateId: string) {
  const routes: Record<Exclude<WorkbenchAction, "assessment">, string> = {
    attendance: `/pages/coach/attendance/index?id=${eventId}`,
    lesson: `/pages/coach/lesson/index?id=${eventId}`,
    match: `/pages/coach/match/index?id=${eventId}`,
    tactical: `/pages/coach/tactical-board/index?eventId=${eventId}`,
    training: `/pages/coach/training/index?eventId=${eventId}`,
    change: `/pages/coach/event-change/index?id=${eventId}`,
  };
  if (action === "assessment") return templateId ? `/pages/coach/test-entry/index?eventId=${eventId}&templateId=${templateId}` : "";
  return routes[action];
}

function rosterStatusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "待确认",
    invited: "待确认",
    confirmed: "已确认",
    present: "已到场",
    attended: "已到场",
    absent: "缺席",
    late: "迟到",
    leave_requested: "请假",
    leave: "请假",
    excused: "免扣",
  };
  return labels[value.toLowerCase()] ?? "待确认";
}
