import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_TEST_DATE } from "../../../utils/config";
import { openPage } from "../../../utils/navigation";
import { activityStatus, formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachHome, CoachTaskAction, LoadState, ScheduleEvent } from "../../../utils/types";

type Filter = "all" | "pending" | "training" | "match";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "全部", value: "all" },
  { label: "待处理", value: "pending" },
  { label: "训练", value: "training" },
  { label: "比赛", value: "match" },
];

type CoachEventView = ScheduleEvent & {
  timeLabel: string;
  dateLabel: string;
  statusLabel: string;
  statusTone: string;
  startTime: string;
  durationText: string;
  typeColor: string;
  meta: Array<{ label: string; value: string }>;
};

const TYPE_COLORS: Record<string, string> = { training: "#a80f1b", match: "#1a3a6b", other: "#6b7280" };
const WEEK_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取教练任务",
    home: null as CoachHome | null,
    teamsText: "",
    events: [] as ScheduleEvent[],
    visibleEvents: [] as CoachEventView[],
    date: DEV_TEST_DATE,
    selectedDate: DEV_TEST_DATE,
    viewMode: "day" as "day" | "week",
    activeFilter: "all" as Filter,
    filters,
    rangeLabel: "今日任务",
    coachInitial: "教",
    dayStrip: [] as Array<{ date: string; weekLabel: string; dayNum: string }>,
    statTraining: "今日0节训练课",
    statMatches: "0 场比赛",
    statPending: 0,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取教练任务" });
    try {
      const to = this.data.viewMode === "week" ? addDays(this.data.date, 6) : this.data.date;
      const home = await getCoachHome({ from: this.data.date, to });
      this.setData({
        state: home.events.length ? "ready" : "empty",
        message: home.events.length ? "" : "当前日期范围没有负责的活动。",
        home,
        teamsText: home.teams.length ? home.teams.join("、") : "暂无负责球队",
        events: home.events,
        rangeLabel: this.data.viewMode === "week" ? `${formatCalendarDate(this.data.date)}起 7 天` : formatCalendarDate(this.data.date),
        coachInitial: (home.coachName ?? "教").slice(0, 1),
        dayStrip: buildDayStrip(this.data.date),
        selectedDate: this.data.date,
        statTraining: `${this.data.viewMode === "week" ? "本周" : "今日"}${home.summary.training}节训练课`,
        statMatches: `${home.summary.matches} 场比赛`,
        statPending: home.summary.pending,
      });
      this.applyFilter();
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
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
    const visibleEvents = (this.data.events as ScheduleEvent[]).filter((event) => {
      if (activeFilter === "pending") return event.nextAction && event.nextAction !== "view";
      if (activeFilter === "training" || activeFilter === "match") return event.type === activeFilter;
      return true;
    }).map(toCoachEventView);
    this.setData({ visibleEvents });
  },
  openEvent(event: { detail?: { eventId?: string }; currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.detail?.eventId ?? event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/event/index?id=${id}`);
  },
  openTask(event: { detail?: { eventId?: string; action?: CoachTaskAction }; currentTarget?: { dataset?: { id?: string; action?: CoachTaskAction } } }) {
    const id = event.detail?.eventId ?? event.currentTarget?.dataset?.id;
    const action = event.detail?.action ?? event.currentTarget?.dataset?.action;
    if (!id) return;
    const routes: Partial<Record<CoachTaskAction, string>> = {
      attendance: `/pages/coach/attendance/index?id=${id}`,
      lesson: `/pages/coach/lesson/index?id=${id}`,
      match: `/pages/coach/match/index?id=${id}`,
      assessment: `/pages/coach/test-entry/index?eventId=${id}`,
      training: `/pages/coach/training/index?eventId=${id}`,
      view: `/pages/coach/event/index?id=${id}`,
    };
    openPage(routes[action ?? "view"] ?? `/pages/coach/event/index?id=${id}`);
  },
  retry() {
    this.load();
  },
});

function toCoachEventView(event: ScheduleEvent): CoachEventView {
  const status = activityStatus(event.status);
  return {
    ...event,
    timeLabel: formatTimeRange(event.startsAt, event.endsAt),
    dateLabel: formatCalendarDate(event.startsAt),
    statusLabel: status.label,
    statusTone: status.tone,
    startTime: event.startsAt?.slice(11, 16) || "待定",
    durationText: durationLabel(event.startsAt, event.endsAt),
    typeColor: TYPE_COLORS[event.type] ?? "#6b7280",
    meta: [
      event.teamName ? { label: "队伍", value: event.teamName } : null,
      event.participantCount ? { label: "名单", value: `${event.participantCount} 人` } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
  };
}

function durationLabel(startsAt?: string, endsAt?: string) {
  const start = Date.parse(startsAt ?? "");
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "时长待定";
  return `${Math.round((end - start) / 60000)}分钟`;
}

function buildDayStrip(center: string) {
  const base = new Date(`${center}T00:00:00.000Z`);
  const mondayOffset = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(base);
    day.setUTCDate(base.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { date, weekLabel: WEEK_LABELS[day.getUTCDay()], dayNum: String(day.getUTCDate()) };
  });
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "任务工作台读取失败。";
}
