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
  meta: Array<{ label: string; value: string }>;
};

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取教练任务",
    home: null as CoachHome | null,
    teamsText: "",
    events: [] as ScheduleEvent[],
    visibleEvents: [] as CoachEventView[],
    date: DEV_TEST_DATE,
    viewMode: "day" as "day" | "week",
    activeFilter: "all" as Filter,
    filters,
    rangeLabel: "今日任务",
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
    meta: [
      event.teamName ? { label: "队伍", value: event.teamName } : null,
      event.participantCount ? { label: "名单", value: `${event.participantCount} 人` } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item)),
  };
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
