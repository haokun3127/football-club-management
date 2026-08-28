import { getCoachHome, getCoachLessonConfirmation } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate, shiftCalendarDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { formatShortDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachLessonConfirmation, LoadState, ScheduleEvent } from "../../../utils/types";

type HistoryRow = {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  teamLabel: string;
  venueLabel: string;
  hasTeam: boolean;
  hasVenue: boolean;
  studentCountLabel: string;
  statusLabel: string;
};

interface PageData {
  state: LoadState;
  message: string;
  retryLabel: string;
  from: string;
  to: string;
  rows: HistoryRow[];
  hasRows: boolean;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    retryLabel: "",
    from: "",
    to: "",
    rows: [],
    hasRows: false,
  },

  onLoad() {
    if (!requireRole("coach")) return false;
    return this.load();
  },

  async load(): Promise<boolean> {
    const to = currentLocalDate();
    const from = shiftCalendarDate(to, -29);
    this.setData({ state: "loading", message: "正在读取销课历史", retryLabel: "", from, to, rows: [], hasRows: false });

    try {
      const home = await getCoachHome({ from, to });
      const candidates = home.events.filter((event) => event.type === "training" && isCompleted(event.status) && Boolean(event.id));
      const rows: HistoryRow[] = [];
      for (const event of candidates) {
        const confirmation = await getCoachLessonConfirmation(event.id);
        if (!hasRealSettlement(event, confirmation)) continue;
        rows.push(toHistoryRow(event, confirmation));
      }
      this.setData({
        state: rows.length ? "ready" : "empty",
        message: rows.length ? "" : "最近 30 天暂无已销课记录。",
        retryLabel: "",
        from,
        to,
        rows,
        hasRows: rows.length > 0,
      });
      return true;
    } catch {
      this.setData({
        state: "error",
        message: "销课历史读取失败，请稍后重试。",
        retryLabel: "重新读取",
        from,
        to,
        rows: [],
        hasRows: false,
      });
      return false;
    }
  },

  retry() {
    return this.load();
  },

  openDetail(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/lesson-detail/index?id=${encodeURIComponent(id)}`);
  },
});

function isCompleted(status: string) {
  const value = status.trim().toLowerCase();
  return ["completed", "finished", "done", "已完成", "已结束"].includes(value);
}

function hasRealSettlement(event: ScheduleEvent, confirmation: CoachLessonConfirmation) {
  const participantIds = new Set(confirmation.participants.map((participant) => participant.studentId).filter(Boolean));
  if (!participantIds.size) return false;
  return [...participantIds].every((studentId) => confirmation.ledgers.some((ledger) => ledger.studentId === studentId
    && (ledger.sourceIds ?? []).includes(`app-client-lesson-${event.id}-${studentId}`)));
}

function toHistoryRow(event: ScheduleEvent, confirmation: CoachLessonConfirmation): HistoryRow {
  const participantCount = confirmation.participants.filter((participant) => Boolean(participant.studentId)).length;
  return {
    id: event.id,
    title: event.title && event.title !== "活动" ? event.title : "训练活动",
    dateLabel: formatShortDate(event.startsAt),
    timeLabel: formatTimeRange(event.startsAt, event.endsAt),
    teamLabel: event.teamName || "队伍待同步",
    venueLabel: event.venue || "场地待同步",
    hasTeam: Boolean(event.teamName),
    hasVenue: Boolean(event.venue),
    studentCountLabel: `${participantCount} 人已销课`,
    statusLabel: "已完成",
  };
}
