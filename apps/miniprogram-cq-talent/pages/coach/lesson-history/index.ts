import { getCoachHome, getCoachLessonConfirmation } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate, shiftCalendarDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { formatShortDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachLessonConfirmation, LoadState, ScheduleEvent } from "../../../utils/types";

type HistoryRow = {
  id: string;
  title: string;
  avatarLetter: string;
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
  historyTeamDateLabel: string;
  historyTimeVenueLabel: string;
  recordWindowLabel: string;
  recentRecordCount: number;
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
    historyTeamDateLabel: "活动信息待同步",
    historyTimeVenueLabel: "时间与场地待同步",
    recordWindowLabel: "近 30 天",
    recentRecordCount: 0,
  },

  onLoad() {
    if (!requireRole("coach")) return false;
    return this.load();
  },

  async load(showAll = false): Promise<boolean> {
    const to = currentLocalDate();
    const from = shiftCalendarDate(to, -29);
    const recordWindowLabel = showAll ? "全部记录" : "近 30 天";
    this.setData({
      state: "loading",
      message: "正在读取销课历史",
      retryLabel: "",
      from,
      to,
      rows: [],
      hasRows: false,
      historyTeamDateLabel: "活动信息待同步",
      historyTimeVenueLabel: "时间与场地待同步",
      recordWindowLabel,
      recentRecordCount: 0,
    });

    try {
      const home = await getCoachHome({ from, to });
      const candidates = home.events.filter((event) => event.type === "training" && isCompleted(event.status) && Boolean(event.id));
      const allRows: HistoryRow[] = [];
      for (const event of candidates) {
        const confirmation = await getCoachLessonConfirmation(event.id);
        if (!hasRealSettlement(event, confirmation)) continue;
        allRows.push(toHistoryRow(event, confirmation));
      }
      const rows = showAll ? allRows : allRows.slice(0, 5);
      const latest = allRows[0];
      this.setData({
        state: allRows.length ? "ready" : "empty",
        message: allRows.length ? "" : "最近 30 天暂无已销课记录。",
        retryLabel: "",
        from,
        to,
        rows,
        hasRows: allRows.length > 0,
        historyTeamDateLabel: latest ? `${latest.teamLabel} · ${latest.dateLabel}` : "活动信息待同步",
        historyTimeVenueLabel: latest ? `${latest.timeLabel} · ${latest.venueLabel}` : "时间与场地待同步",
        recordWindowLabel,
        recentRecordCount: allRows.length,
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
        historyTeamDateLabel: "活动信息待同步",
        historyTimeVenueLabel: "时间与场地待同步",
        recordWindowLabel,
        recentRecordCount: 0,
      });
      return false;
    }
  },

  retry() {
    return this.load(this.data.recordWindowLabel === "全部记录");
  },

  showAll() {
    return this.load(true);
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
    && (ledger.sourceIds ?? []).some((sourceId) => isSettlementSourceForEvent(sourceId, event.id, studentId))));
}

function isSettlementSourceForEvent(sourceId: string, eventId: string, studentId: string) {
  return sourceId === `app-client-lesson-${eventId}-${studentId}`
    || sourceId === eventId
    || sourceId.startsWith(`${eventId}-`);
}

function toHistoryRow(event: ScheduleEvent, confirmation: CoachLessonConfirmation): HistoryRow {
  const participantCount = confirmation.participants.filter((participant) => Boolean(participant.studentId)).length;
  return {
    id: event.id,
    title: event.title && event.title !== "活动" ? event.title : "训练活动",
    avatarLetter: historyAvatarLetter(event.title),
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

function historyAvatarLetter(title: string) {
  const value = title && title !== "活动" ? title.trim() : "训练";
  return value ? value.charAt(0) : "训";
}
