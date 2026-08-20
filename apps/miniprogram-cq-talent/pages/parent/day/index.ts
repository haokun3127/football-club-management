import { getParentCalendar } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { DEV_PARENT_PAGE_DATE_OVERRIDE } from "../../../utils/config";
import { resolveParentPageDate } from "../../../utils/date";
import { resolveMenuActionTop, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, ScheduleEvent } from "../../../utils/types";

interface DayEventView {
  id: string;
  title: string;
  type: ScheduleEvent["type"];
  barColor: string;
  timeLabel: string;
  placeLabel: string;
  statusLabel: string;
  statusBg: string;
  statusColor: string;
  coachLabel: string;
}

interface PageData {
  state: LoadState;
  message: string;
  date: string;
  dateLabel: string;
  events: DayEventView[];
  allEvents: DayEventView[];
  activeType: DayEventView["type"] | "all";
  navInset: number;
  menuInset: number;
  navActionTop: number;
}

const TYPE_COLORS: Record<ScheduleEvent["type"], string> = {
  training: "#a80f1b",
  match: "#1976d2",
  other: "#ff9800",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    date: "",
    dateLabel: "",
    events: [],
    allEvents: [],
    activeType: "all",
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    navActionTop: resolveMenuActionTop(),
  },
  onLoad(query: { date?: string }) {
    this.load(query?.date || parentPageToday());
  },
  async load(date: string) {
    const session = requireRole("parent");
    if (!session) return;
    const d = new Date(`${date}T00:00:00`);
    this.setData({
      state: "loading",
      message: "正在读取当日活动",
      date,
      dateLabel: `${d.getMonth() + 1}月${d.getDate()}日 星期${WEEKDAYS[d.getDay()]}`,
    });
    try {
      const events = await getParentCalendar(date, date);
      const presented = events.map((event: ScheduleEvent) => presentEvent(event));
      this.setData({
        state: presented.length ? "ready" : "empty",
        message: presented.length ? "" : "当天暂无活动安排。",
        allEvents: presented,
        events: applyTypeFilter(presented, this.data.activeType),
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "活动读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load(this.data.date || parentPageToday());
  },
  openFilter() {
    const options: Array<{ key: DayEventView["type"] | "all"; label: string }> = [
      { key: "all", label: "全部" },
      { key: "training", label: "训练" },
      { key: "match", label: "比赛" },
      { key: "other", label: "其他" },
    ];
    wx.showActionSheet({
      itemList: options.map((option) => option.label),
      success: ({ tapIndex }) => {
        const selected = options[tapIndex];
        if (!selected) return;
        const filtered = applyTypeFilter(this.data.allEvents, selected.key);
        this.setData({
          activeType: selected.key,
          events: filtered,
          state: filtered.length ? "ready" : "empty",
          message: filtered.length ? "" : `当天暂无${selected.label === "全部" ? "" : selected.label}活动。`,
        });
      },
    });
  },
  goBack() {
    wx.navigateBack();
  },
  openEvent(event: { currentTarget: { dataset: { id: string } } }) {
    openPage(`/pages/parent/event/index?id=${event.currentTarget.dataset.id}`);
  },
});

function applyTypeFilter(events: DayEventView[], type: DayEventView["type"] | "all"): DayEventView[] {
  if (type === "all") return events;
  return events.filter((event) => event.type === type);
}

function presentEvent(event: ScheduleEvent): DayEventView {
  const status = statusOf(event);
  return {
    id: event.id,
    title: event.title,
    type: event.type,
    barColor: TYPE_COLORS[event.type] ?? "#8e97a6",
    timeLabel: timeLabel(event),
    placeLabel: [event.teamName, event.venue].filter(Boolean).join(" · "),
    statusLabel: status.label,
    statusBg: status.bg,
    statusColor: status.color,
    coachLabel: "待同步",
  };
}

function statusOf(event: ScheduleEvent): { label: string; bg: string; color: string } {
  const now = Date.now();
  const start = Date.parse(event.startsAt);
  const end = event.endsAt ? Date.parse(event.endsAt) : NaN;
  if (event.status === "cancelled") {
    return { label: "已取消", bg: "#f3f4f6", color: "#667085" };
  }
  if (event.status === "completed" || (Number.isFinite(end) && end < now)) {
    return { label: "已结束", bg: "#f3f4f6", color: "#667085" };
  }
  if (Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)) {
    return { label: "进行中", bg: "#fee2e2", color: "#a80f1b" };
  }
  return { label: "待开始", bg: "#fff3e0", color: "#c2410c" };
}

function timeLabel(event: ScheduleEvent): string {
  const start = event.startsAt.slice(11, 16);
  const end = event.endsAt ? event.endsAt.slice(11, 16) : "";
  return end ? `${start}-${end}` : start;
}

function parentPageToday(): string {
  return resolveParentPageDate(new Date(), DEV_PARENT_PAGE_DATE_OVERRIDE);
}
