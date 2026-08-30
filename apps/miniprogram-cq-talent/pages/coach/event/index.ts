import { getCoachWorkbench, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityTypeLabel, formatCalendarDate, formatShortDate, formatTimeOnly, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type WorkbenchAction = "attendance" | "lesson" | "match" | "tactical" | "training" | "assessment" | "change";

type ActionCard = {
  id: WorkbenchAction;
  label: string;
  icon: string;
};

type RosterRow = CoachWorkbench["roster"][number] & { statusLabel: string; present: boolean; initial: string; displayName: string };

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
    trainingContentSummary: "",
    attendancePresent: 0,
    attendanceTotal: 0,
    joinedNames: "",
    attendanceSaving: false,
    attendanceError: "",
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
      const rosterRows = workbench.roster.map((item) => ({
        ...item,
        statusLabel: isPresentStatus(item.status) ? "已到" : "未到",
        present: isPresentStatus(item.status),
        initial: (item.name || "学").slice(0, 1),
        displayName: (item.name || "学员").slice(0, 4),
      }));
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
        trainingContentSummary,
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
        attendancePresent,
        attendanceTotal: rosterRows.length,
        joinedNames,
        attendanceSaving: false,
        attendanceError: "",
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
        attendancePresent: 0,
        attendanceTotal: 0,
        joinedNames: "",
        attendanceSaving: false,
        attendanceError: "",
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
  openAttendance() {
    if (this.data.eventId) openPage(`/pages/coach/attendance/index?id=${this.data.eventId}`);
  },
  async toggleAttendance(event: { currentTarget?: { dataset?: { index?: string | number } } }) {
    if (!this.data.canWrite || this.data.attendanceSaving) return;
    const index = Number(event.currentTarget?.dataset?.index);
    const current = this.data.rosterRows[index];
    if (!Number.isInteger(index) || !current || !this.data.eventId) return;
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
      })));
      this.setData({ attendanceSaving: false });
    } catch {
      this.setData({ ...attendanceSummary(previousRows), rosterRows: previousRows, attendanceSaving: false, attendanceError: "出勤保存失败，请重试" });
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
  if (!canWrite) return [];

  const cards: ActionCard[] = [];
  if (workbench.event.type === "training") cards.push(actionCard("training", "训练内容"));
  if (workbench.event.type === "match") {
    cards.push(actionCard("match", "比赛录入"));
    cards.push(actionCard("tactical", "比赛战术板"));
  }
  if (workbench.assessmentTemplateId) cards.push(actionCard("assessment", "评测录入"));
  cards.push(actionCard("change", "变更活动"));
  return cards;
}

function actionCard(id: WorkbenchAction, label: string): ActionCard {
  const icons: Record<WorkbenchAction, string> = {
    attendance: "/assets/icons/check-circle.svg",
    lesson: "/assets/icons/tab-calendar.svg",
    match: "/assets/icons/c10-target-rose.svg",
    tactical: "/assets/icons/c10-target-violet.svg",
    training: "/assets/icons/tab-training.svg",
    assessment: "/assets/icons/c164-category-assessment.svg",
    change: "/assets/icons/alert.svg",
  };
  return { id, label, icon: icons[id] };
}

function attendanceSummary(rosterRows: RosterRow[]) {
  const presentRows = rosterRows.filter((item) => item.present);
  return {
    attendancePresent: presentRows.length,
    attendanceTotal: rosterRows.length,
    joinedNames: presentRows.map((item) => item.name).join(" · "),
  };
}

function routeForAction(action: WorkbenchAction, eventId: string, templateId: string) {
  const routes: Record<Exclude<WorkbenchAction, "assessment">, string> = {
    attendance: `/pages/coach/attendance/index?id=${eventId}`,
    lesson: `/pages/coach/lesson/index?id=${eventId}`,
    match: `/pages/coach/match/index?id=${eventId}`,
    tactical: `/pages/coach/tactical-board/index?eventId=${eventId}`,
    training: `/pages/coach/content-select/index?eventId=${eventId}`,
    change: `/pages/coach/event-change/index?id=${eventId}`,
  };
  if (action === "assessment") return templateId ? `/pages/coach/test-entry/index?eventId=${eventId}&templateId=${templateId}` : "";
  return routes[action];
}

function isPresentStatus(value: string) {
  const status = value.toLowerCase();
  return status === "present" || status === "attended" || status === "late";
}
