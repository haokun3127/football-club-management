import { getCoachWorkbench, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityStatus, activityTypeLabel, formatCalendarDate, formatShortDate, formatTimeOnly, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

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
    contentProgressRows: [] as ContentProgressRow[],
    hasContentProgress: false,
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
      }));
      const attendancePresent = rosterRows.filter((item) => item.present).length;
      const joinedNames = rosterRows
        .filter((item) => item.present)
        .map((item) => item.name)
        .join(" · ");
      const contentProgressRows = buildContentProgress(workbench, Date.now());
      const workflowRows: CoachWorkbench["workflow"] = [];
      const trainingRows = workbench.event.type === "training" ? workbench.training.map((item) => ({ ...item })) : [];
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
        status: item.present ? "present" : "absent",
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
  const status = activityStatus(workbench.event.status);
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
  const startMs = parseEventTime(workbench.event.startsAt);
  const endMs = parseEventTime(workbench.event.endsAt);
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
    match: `/pages/coach/match-edit/index?eventId=${eventId}`,
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

// 生产活动时间按「北京墙钟存 Z」约定存储（展示端直接截取字符串）。
// 训练内容进度推导须先换算成真实 epoch：真实时刻 = 字面 Z 值 - 8 小时。
function parseEventTime(value?: string) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed - 8 * 60 * 60 * 1000 : parsed;
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
