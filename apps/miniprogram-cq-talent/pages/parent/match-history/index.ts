import { getParentCalendar, getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveParentPageDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { formatShortDate, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, ScheduleEvent } from "../../../utils/types";

type MatchHistoryRow = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  contextLabel: string;
  opponentLabel: string;
  scoreLabel: string;
  statusLabel: string;
  done: boolean;
};

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取比赛记录",
    rows: [] as MatchHistoryRow[],
  },
  onLoad() {
    void this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取比赛记录", rows: [] });
    try {
      const children = await getParentChildren();
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "暂无绑定学员", rows: [] });
        return;
      }
      const events = await fetchCalendarRange(resolveParentPageDate(), 180);
      const uniqueEvents = new Map<string, ScheduleEvent>();
      events.forEach((event) => uniqueEvents.set(event.id, event));
      const rows = [...uniqueEvents.values()]
        .filter((event) => event.type === "match" && eventBelongsToStudent(event, active.id))
        .sort((left, right) => right.startsAt.localeCompare(left.startsAt))
        .map(presentRow);
      this.setData({ state: rows.length ? "ready" : "empty", message: rows.length ? "" : "暂无比赛记录", rows });
    } catch {
      this.setData({ state: "error", message: "比赛记录读取失败，请点击重试", rows: [] });
    }
  },
  openMatch(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/parent/event/index?id=${id}`);
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    void this.load();
  },
});

function presentRow(event: ScheduleEvent): MatchHistoryRow {
  const match = event.match;
  const done = ["completed", "finished", "done", "已完成", "已结束"].includes(String(match?.status ?? event.status).toLowerCase());
  const context = [event.teamName, event.venue].filter(Boolean).join(" · ");
  const opponent = match?.opponentName?.trim();
  const hasScore = typeof match?.homeScore === "number" && typeof match?.awayScore === "number";
  return {
    id: event.id,
    title: event.title,
    dateLabel: formatShortDate(event.startsAt),
    timeLabel: formatTimeRange(event.startsAt, event.endsAt),
    contextLabel: context,
    opponentLabel: opponent ? `对手：${opponent}` : "对手待同步",
    scoreLabel: hasScore ? `${match?.homeScore}:${match?.awayScore}` : "比分待同步",
    statusLabel: matchStatusLabel(match?.status ?? event.status),
    done,
  };
}

function matchStatusLabel(status: string) {
  const value = status.trim().toLowerCase();
  if (["completed", "finished", "done", "已完成", "已结束"].includes(value)) return "已完成";
  if (["scheduled", "published", "upcoming", "待开始"].includes(value)) return "待开始";
  if (["cancelled", "canceled", "已取消"].includes(value)) return "已取消";
  if (["ongoing", "in_progress", "started", "进行中"].includes(value)) return "进行中";
  return status || "状态待同步";
}

function eventBelongsToStudent(event: ScheduleEvent, studentId: string) {
  if (event.childIds?.length) return event.childIds.includes(studentId);
  return event.children?.some((child) => child.id === studentId) ?? false;
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

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
