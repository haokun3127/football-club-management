import { finishCoachEvent, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityStatus, activityTypeLabel, formatCalendarDate, formatShortDate, formatTimeOnly, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type TimerHost = { setInterval: (handler: () => void, timeout: number) => number; clearInterval: (id: number) => void };
const timerHost = globalThis as unknown as TimerHost;

type WorkbenchAction = "attendance" | "lesson" | "match" | "tactical" | "training" | "assessment" | "change";

type ActionCard = {
  id: WorkbenchAction;
  label: string;
  icon: string;
};

type ContentProgressRow = {
  id: string;
  name: string;
  status: "done" | "doing" | "todo";
  statusLabel: string;
  icon: string;
};

type RosterRow = CoachWorkbench["roster"][number] & { statusLabel: string; present: boolean; initial: string };

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
    inProgress: false,
    countdownText: "",
    contentProgressRows: [] as ContentProgressRow[],
    hasContentProgress: false,
    attendancePresent: 0,
    attendanceTotal: 0,
    joinedNames: "",
    finishing: false,
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
        statusLabel: rosterStatusLabel(item.status),
        present: isPresentStatus(item.status),
        initial: (item.name || "学").slice(0, 1),
      }));
      const attendancePresent = rosterRows.filter((item) => item.present).length;
      const joinedNames = rosterRows
        .filter((item) => item.present || item.status === "confirmed")
        .map((item) => item.name)
        .join(" · ");
      const inProgress = isInProgress(workbench.event.status, workbench.event.startsAt, workbench.event.endsAt);
      const contentProgressRows = buildContentProgress(workbench, Date.now());
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
        contentProgressRows,
        hasContentProgress: contentProgressRows.length > 0,
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
        inProgress,
        attendancePresent,
        attendanceTotal: rosterRows.length,
        joinedNames,
      });
      this.syncCountdown(inProgress, workbench.event.startsAt);
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
        inProgress: false,
        countdownText: "",
        attendancePresent: 0,
        attendanceTotal: 0,
        joinedNames: "",
      });
      this.syncCountdown(false, undefined);
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
  retry() {
    this.load(this.data.eventId);
  },
  countdownTimer: null as number | null,
  syncCountdown(inProgress: boolean, startsAt?: string) {
    if (this.countdownTimer !== null) {
      timerHost.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    const startMs = Date.parse(startsAt ?? "");
    if (!inProgress || !Number.isFinite(startMs)) {
      if (this.data.countdownText) this.setData({ countdownText: "" });
      return;
    }
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startMs);
      this.setData({ countdownText: formatCountdown(elapsed) });
    };
    tick();
    this.countdownTimer = timerHost.setInterval(tick, 1000);
  },
  async finishEvent() {
    if (this.data.finishing || !this.data.inProgress || !this.data.eventId) return;
    this.setData({ finishing: true });
    try {
      await finishCoachEvent(this.data.eventId);
      wx.showToast({ title: "训练已结束", icon: "success" });
      await this.load(this.data.eventId);
    } catch {
      wx.showToast({ title: "结束失败，请重试", icon: "none" });
    } finally {
      this.setData({ finishing: false });
    }
  },
  onUnload() {
    if (this.countdownTimer !== null) {
      timerHost.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  },
  goBack() {
    wx.navigateBack();
  },
});

function presentEvent(workbench: CoachWorkbench): EventView {
  const live = isInProgress(workbench.event.status, workbench.event.startsAt, workbench.event.endsAt);
  const status = live ? { label: "进行中", tone: "info" } : activityStatus(workbench.event.status);
  const hasTime = Boolean(workbench.event.startsAt && workbench.event.endsAt);
  const timeLabel = hasTime ? `${formatShortDate(workbench.event.startsAt)} ${formatTimeRange(workbench.event.startsAt, workbench.event.endsAt)}` : "";
  const sessionTeam = workbench.event.teamName || workbench.event.venue || "";
  const sessionMeta = [sessionTeam, timeLabel].filter(Boolean).join(" · ");
  return {
    title: workbench.event.title,
    typeLabel: activityTypeLabel(workbench.event.type),
    statusLabel: status.label,
    statusTone: status.tone,
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

function buildContentProgress(workbench: CoachWorkbench, now: number): ContentProgressRow[] {
  if (workbench.event.type !== "training") return [];
  const projects = workbench.selectedTrainingProjects;
  if (projects.length === 0) return [];
  const statusOf = (status: "done" | "doing" | "todo"): Pick<ContentProgressRow, "status" | "statusLabel" | "icon"> => ({
    done: { status, statusLabel: "完成", icon: "/assets/icons/c10-check-circle.svg" },
    doing: { status, statusLabel: "进行中", icon: "/assets/icons/clock.svg" },
    todo: { status, statusLabel: "待开始", icon: "/assets/icons/clock.svg" },
  }[status]);
  if (workbench.event.status === "completed") {
    return projects.map((project) => ({ id: project.id, name: project.name, ...statusOf("done") }));
  }
  const startMs = Date.parse(workbench.event.startsAt || "");
  const endMs = Date.parse(workbench.event.endsAt || "");
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return [];
  if (now < startMs) {
    return projects.map((project) => ({ id: project.id, name: project.name, ...statusOf("todo") }));
  }
  if (now >= endMs) {
    return projects.map((project) => ({ id: project.id, name: project.name, ...statusOf("done") }));
  }
  const durations = projects.map((project) => (typeof project.durationMinutes === "number" && project.durationMinutes > 0 ? project.durationMinutes : 0));
  const totalMinutes = durations.reduce((sum, value) => sum + value, 0);
  const weights = totalMinutes > 0 ? durations.map((value) => value / totalMinutes) : projects.map(() => 1 / projects.length);
  const sessionMs = endMs - startMs;
  let cursor = startMs;
  return projects.map((project, index) => {
    const blockStart = cursor;
    cursor += sessionMs * (weights[index] ?? 0);
    const status = now < blockStart ? "todo" : now < cursor ? "doing" : "done";
    return { id: project.id, name: project.name, ...statusOf(status) };
  });
}

function buildActionCards(workbench: CoachWorkbench, canWrite: boolean): ActionCard[] {
  if (!canWrite) return [];

  const cards: ActionCard[] = [];
  if (workflowPending(workbench, "点名")) cards.push(actionCard("attendance", "点名"));
  if (workbench.event.type !== "other" && workflowPending(workbench, "销课")) cards.push(actionCard("lesson", "销课"));
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

function workflowPending(workbench: CoachWorkbench, label: string) {
  return workbench.workflow.some((item) => item.label === label && item.status === "pending");
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

function isInProgress(status: string, startsAt?: string, endsAt?: string) {
  if (status !== "scheduled") return false;
  const start = Date.parse(startsAt ?? "");
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  const now = Date.now();
  return now >= start && now < end;
}

function isPresentStatus(value: string) {
  const status = value.toLowerCase();
  return status === "present" || status === "attended" || status === "late";
}

function formatCountdown(ms: number) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
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
