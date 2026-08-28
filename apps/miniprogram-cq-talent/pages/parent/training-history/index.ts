import { getParentCalendar, getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveParentPageDate } from "../../../utils/date";
import { formatShortDate, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, ScheduleEvent } from "../../../utils/types";

interface HistoryRow {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  placeLabel: string;
  statusLabel: string;
  done: boolean;
}

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取训练历程",
    rows: [] as HistoryRow[],
  },
  onLoad() {
    void this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取训练历程" });
    try {
      const children = await getParentChildren();
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", rows: [] });
        return;
      }
      const today = resolveParentPageDate();
      const events = await fetchCalendarRange(today, 180);
      const trainings = events
        .filter((event) => event.type === "training" && eventBelongsToStudent(event, active.id))
        .sort((left, right) => right.startsAt.localeCompare(left.startsAt));
      const rows = trainings.map(presentRow);
      this.setData({ state: rows.length ? "ready" : "empty", message: rows.length ? "" : "暂无训练历程", rows });
    } catch {
      this.setData({ state: "error", message: "训练历程读取失败，请点击重试" });
    }
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    void this.load();
  },
});

function presentRow(event: ScheduleEvent): HistoryRow {
  const done = event.status === "completed";
  return {
    id: event.id,
    title: event.title,
    dateLabel: formatShortDate(event.startsAt),
    timeLabel: formatTimeRange(event.startsAt, event.endsAt),
    placeLabel: [event.teamName, event.venue].filter(Boolean).join(" · "),
    statusLabel: done ? "已完成" : "未完成",
    done,
  };
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 服务端单次日程查询上限 31 天，分块并行拉取
async function fetchCalendarRange(today: string, days: number) {
  const chunks: Array<Promise<Awaited<ReturnType<typeof getParentCalendar>>>> = [];
  for (let offset = days; offset > 0; offset -= 31) {
    const from = shiftDate(today, -offset);
    const to = offset - 31 <= 0 ? today : shiftDate(today, -offset + 30);
    chunks.push(getParentCalendar(from, to));
  }
  const results = await Promise.all(chunks);
  return results.flat();
}

function eventBelongsToStudent(event: ScheduleEvent, studentId: string) {
  return event.childIds?.includes(studentId) ?? false;
}
