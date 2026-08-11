import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { activityStatus, formatCalendarDate, resolveNavInset } from "../../../utils/presentation";
import type { CoachHome, CoachTask, CoachTaskAction, LoadState, ScheduleEvent } from "../../../utils/types";

const WEEK_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type Filter = "all" | "training" | "match" | "pending";

type CoachEventView = ScheduleEvent & {
  startTime: string;
  durationText: string;
  hasDuration: boolean;
  statusLabel: string;
  statusTone: string;
  typeColor: string;
  coachName: string;
  hasCoachName: boolean;
  locationLabel: string;
  hasLocationDetail: boolean;
  hasTeamName: boolean;
  hasVenue: boolean;
  hasNextAction: boolean;
};

type CoachTaskView = CoachTask & {
  hasDueAt: boolean;
  dueLabel: string;
};

Page({
  data: {
    navInset: resolveNavInset(),
    state: "loading" as LoadState,
    message: "正在读取教练日程",
    home: null as CoachHome | null,
    date: currentLocalDate(),
    selectedDate: currentLocalDate(),
    viewMode: "day" as "day" | "week",
    activeFilter: "all" as Filter,
    dayStrip: [] as Array<{ date: string; weekLabel: string; dayNum: string }>,
    rangeLabel: "",
    coachName: "",
    coachInitial: "",
    hasCoachInitial: false,
    teamChips: [] as Array<{ name: string }>,
    hasTeams: false,
    summaryItems: [] as Array<{ key: "training" | "match" | "pending"; label: string; value: string; tone: string }>,
    eventViews: [] as CoachEventView[],
    visibleEvents: [] as CoachEventView[],
    hasVisibleEvents: false,
    taskCards: [] as CoachTaskView[],
    hasTaskCards: false,
    heroEvent: null as CoachEventView | null,
    hasHeroEvent: false,
    heroDateLabel: "",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    const range = resolveRange(this.data.date, this.data.viewMode);
    this.setData({ state: "loading", message: "正在读取教练日程" });
    try {
      const home = await getCoachHome(range);
      const coachName = home.coachName?.trim() || "";
      const eventViews = home.events.map((event) => toCoachEventView(event, coachName));
      const taskCards = home.tasks.map(toCoachTaskView);
      const heroEvent = eventViews.find((event) => event.status === "in_progress") ?? eventViews[0] ?? null;
      const hasWork = eventViews.length > 0 || taskCards.length > 0;
      this.setData({
        state: hasWork ? "ready" : "empty",
        message: hasWork ? "" : "所选日期范围内没有日程或待处理任务",
        home,
        selectedDate: this.data.date,
        dayStrip: buildDayStrip(range.from),
        rangeLabel: rangeLabel(range, this.data.viewMode),
        coachName,
        coachInitial: coachName.slice(0, 1),
        hasCoachInitial: Boolean(coachName),
        teamChips: home.teams.map((name) => ({ name })),
        hasTeams: home.teams.length > 0,
        summaryItems: [
          { key: "training", label: `今日${home.summary.training}节训练课`, value: "", tone: "brand" },
          { key: "match", label: `比赛${home.summary.matches}场`, value: "", tone: "blue" },
          { key: "pending", label: `待处理${home.summary.pending}`, value: "", tone: "amber" },
        ],
        eventViews,
        heroEvent,
        hasHeroEvent: Boolean(heroEvent),
        heroDateLabel: formatCalendarDate(this.data.date),
        taskCards,
        hasTaskCards: taskCards.length > 0,
      });
      this.applyFilter();
    } catch {
      this.setData({
        state: "error",
        message: "日程读取失败，请稍后重试",
        visibleEvents: [],
        hasVisibleEvents: false,
        taskCards: [],
        hasTaskCards: false,
      });
    }
  },
  onDateChange(event: { detail: { value: string } }) {
    this.setData({ date: event.detail.value });
    this.load();
  },
  selectDay(event: { currentTarget: { dataset: { date?: string } } }) {
    const date = event.currentTarget.dataset.date;
    if (!date) return;
    this.setData({ date, viewMode: "day" });
    this.load();
  },
  changeWeek(event: { currentTarget: { dataset: { offset?: string | number } } }) {
    const offset = Number(event.currentTarget.dataset.offset);
    if (offset !== -7 && offset !== 7) return;
    this.setData({ date: addDays(this.data.date, offset), viewMode: "day" });
    this.load();
  },
  openMe() {
    openPage("/pages/coach/me/index");
  },
  switchView(event: { currentTarget: { dataset: { mode?: "day" | "week" } } }) {
    const viewMode = event.currentTarget.dataset.mode;
    if (!viewMode || viewMode === this.data.viewMode) return;
    this.setData({ viewMode });
    this.load();
  },
  switchFilter(event: { currentTarget: { dataset: { filter?: Filter } } }) {
    const activeFilter = event.currentTarget.dataset.filter;
    if (!activeFilter) return;
    this.setData({ activeFilter });
    this.applyFilter();
  },
  applyFilter() {
    const activeFilter = this.data.activeFilter as Filter;
    const visibleEvents = (this.data.eventViews as CoachEventView[]).filter((event) => {
      if (activeFilter === "pending") return event.hasNextAction;
      if (activeFilter === "training" || activeFilter === "match") return event.type === activeFilter;
      return true;
    });
    this.setData({ visibleEvents, hasVisibleEvents: visibleEvents.length > 0 });
  },
  openEvent(event: { detail?: { eventId?: string }; currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.detail?.eventId ?? event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/event/index?id=${id}`);
  },
  openTask(event: { detail?: { eventId?: string; action?: CoachTaskAction }; currentTarget?: { dataset?: { id?: string; action?: CoachTaskAction } } }) {
    const id = event.detail?.eventId ?? event.currentTarget?.dataset?.id;
    const action = event.detail?.action ?? event.currentTarget?.dataset?.action;
    if (!id) return;
    const routes: Record<CoachTaskAction, string> = {
      attendance: `/pages/coach/attendance/index?id=${id}`,
      lesson: `/pages/coach/lesson/index?id=${id}`,
      match: `/pages/coach/match/index?id=${id}`,
      assessment: `/pages/coach/test-entry/index?eventId=${id}`,
      training: `/pages/coach/training/index?eventId=${id}`,
      view: `/pages/coach/event/index?id=${id}`,
    };
    openPage(routes[action ?? "view"]);
  },
  retry() {
    this.load();
  },
});

function toCoachEventView(event: ScheduleEvent, coachName: string): CoachEventView {
  const status = activityStatus(event.status);
  const locationLabel = [event.teamName, event.venue].filter(Boolean).join(" · ");
  return {
    ...event,
    startTime: event.startsAt?.slice(11, 16) || "",
    durationText: durationLabel(event.startsAt, event.endsAt),
    hasDuration: Boolean(durationLabel(event.startsAt, event.endsAt)),
    statusLabel: status.label,
    statusTone: status.tone,
    typeColor: event.type === "training" ? "#a80f1b" : event.type === "match" ? "#1976d2" : "#6b7280",
    coachName,
    hasCoachName: Boolean(coachName),
    locationLabel,
    hasLocationDetail: Boolean(locationLabel),
    hasTeamName: Boolean(event.teamName),
    hasVenue: Boolean(event.venue),
    hasNextAction: Boolean(event.nextAction && event.nextActionLabel),
  };
}

function toCoachTaskView(task: CoachTask): CoachTaskView {
  return {
    ...task,
    hasDueAt: Boolean(task.dueAt),
    dueLabel: task.dueAt ? formatCalendarDate(task.dueAt) : "",
  };
}

function durationLabel(startsAt?: string, endsAt?: string): string {
  const start = Date.parse(startsAt ?? "");
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "";
  return `${Math.round((end - start) / 60000)}分钟`;
}

function resolveRange(date: string, viewMode: "day" | "week") {
  if (viewMode === "day") return { from: date, to: date };
  const monday = startOfWeek(date);
  return { from: monday, to: addDays(monday, 6) };
}

function startOfWeek(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7));
  return value.toISOString().slice(0, 10);
}

function buildDayStrip(monday: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const value = new Date(`${date}T00:00:00.000Z`);
    return { date, weekLabel: WEEK_LABELS[value.getUTCDay()], dayNum: String(value.getUTCDate()) };
  });
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function rangeLabel(range: { from: string; to: string }, viewMode: "day" | "week"): string {
  if (viewMode === "day") return formatCalendarDate(range.from);
  return `${formatCalendarDate(range.from)} - ${formatCalendarDate(range.to)}`;
}
