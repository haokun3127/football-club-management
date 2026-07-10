import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_TEST_DATE } from "../../../utils/config";
import { openPage } from "../../../utils/navigation";
import type { CoachHome, CoachTaskAction, LoadState, ScheduleEvent } from "../../../utils/types";

type Filter = "all" | "pending" | "training" | "match";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "全部", value: "all" },
  { label: "待处理", value: "pending" },
  { label: "训练", value: "training" },
  { label: "比赛", value: "match" },
];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取教练任务",
    home: null as CoachHome | null,
    teamsText: "",
    events: [] as ScheduleEvent[],
    visibleEvents: [] as ScheduleEvent[],
    date: DEV_TEST_DATE,
    viewMode: "day" as "day" | "week",
    activeFilter: "all" as Filter,
    filters,
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
    });
    this.setData({ visibleEvents });
  },
  openEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id) openPage(`/pages/coach/event/index?id=${id}`);
  },
  openTask(event: { currentTarget: { dataset: { id?: string; action?: CoachTaskAction } } }) {
    const { id, action } = event.currentTarget.dataset;
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

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "任务工作台读取失败。";
}
