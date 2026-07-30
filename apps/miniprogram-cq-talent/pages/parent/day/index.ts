import { getParentCalendar } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { DEV_MODE, DEV_TEST_DATE } from "../../../utils/config";
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
}

interface PageData {
  state: LoadState;
  message: string;
  date: string;
  dateLabel: string;
  events: DayEventView[];
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
  },
  onLoad(query: { date?: string }) {
    this.load(query?.date || today());
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
      this.setData({
        state: events.length ? "ready" : "empty",
        message: events.length ? "" : "当天暂无活动安排。",
        events: events.map((event: ScheduleEvent) => presentEvent(event)),
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "活动读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load(this.data.date || today());
  },
  openEvent(event: { currentTarget: { dataset: { id: string } } }) {
    openPage(`/pages/parent/event/index?id=${event.currentTarget.dataset.id}`);
  },
});

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

function today(): string {
  if (DEV_MODE) return DEV_TEST_DATE;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
