import { getCoachMatchDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachMatchDetail, LoadState } from "../../../utils/types";

type TimelineItem = {
  id: string;
  minute?: number;
  minuteLabel: string;
  typeLabel: string;
  studentName: string;
  note?: string;
  hasNote: boolean;
  createdAt?: string;
};

interface MatchPageData {
  state: LoadState;
  message: string;
  retryLabel: string;
  eventId: string;
  hasLoaded: boolean;
  eventTitle: string;
  teamName: string;
  hasTeamName: boolean;
  opponentName: string;
  hasOpponentName: boolean;
  scoreLabel: string;
  hasScore: boolean;
  matchStatus: string;
  hasMatchStatus: boolean;
  hasMatch: boolean;
  canAddEvent: boolean;
  timeline: TimelineItem[];
  hasTimeline: boolean;
}

Page<MatchPageData>({
  data: {
    state: "loading",
    message: "正在读取比赛记录",
    retryLabel: "",
    eventId: "",
    hasLoaded: false,
    eventTitle: "",
    teamName: "",
    hasTeamName: false,
    opponentName: "",
    hasOpponentName: false,
    scoreLabel: "比分待同步",
    hasScore: false,
    matchStatus: "",
    hasMatchStatus: false,
    hasMatch: false,
    canAddEvent: false,
    timeline: [],
    hasTimeline: false,
  },
  onLoad(query?: Record<string, string | undefined>) {
    if (!requireRole("coach")) return;
    return this.load(query?.id || "");
  },
  onShow() {
    if (!this.data.eventId || !this.data.hasLoaded) return;
    return this.load(this.data.eventId);
  },
  async load(eventId: string): Promise<boolean> {
    if (!eventId) {
      this.setData({ ...emptyState("缺少活动 ID"), state: "empty" });
      return false;
    }

    this.setData({
      ...emptyState("正在读取比赛记录"),
      state: "loading",
      eventId,
      hasLoaded: false,
    });

    try {
      const detail = await getCoachMatchDetail(eventId);
      if (!detail.match) {
        this.setData({
          ...emptyState("当前活动尚未有已记录的比赛信息"),
          state: "empty",
          eventId,
          eventTitle: detail.event.title,
          hasLoaded: true,
        });
        return false;
      }

      const timeline = toTimeline(detail);
      const score = hasRecordedScore(detail);
      const teamName = detail.event.teamName || "";
      const opponentName = detail.match.opponentName || "";
      const matchStatus = matchStatusLabel(detail.match.status);
      this.setData({
        state: "ready",
        message: "",
        retryLabel: "",
        eventId,
        hasLoaded: true,
        eventTitle: detail.event.title,
        teamName,
        hasTeamName: Boolean(teamName),
        opponentName,
        hasOpponentName: Boolean(opponentName),
        scoreLabel: score ? `${detail.match.homeScore}:${detail.match.awayScore}` : "比分待同步",
        hasScore: score,
        matchStatus,
        hasMatchStatus: Boolean(matchStatus),
        hasMatch: true,
        canAddEvent: true,
        timeline,
        hasTimeline: timeline.length > 0,
      });
      return true;
    } catch {
      this.setData({
        ...emptyState("比赛记录读取失败，请稍后重试。"),
        state: "error",
        retryLabel: "重新读取",
        eventId,
        hasLoaded: true,
      });
      return false;
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  goBack() {
    wx.navigateBack();
  },
  openMatchEventAdd() {
    if (!this.data.eventId || !this.data.canAddEvent) return;
    openPage(`/pages/coach/match-event-add/index?eventId=${this.data.eventId}`);
  },
});

function emptyState(message: string): Omit<MatchPageData, "state"> {
  return {
    message,
    retryLabel: "",
    eventId: "",
    hasLoaded: false,
    eventTitle: "",
    teamName: "",
    hasTeamName: false,
    opponentName: "",
    hasOpponentName: false,
    scoreLabel: "比分待同步",
    hasScore: false,
    matchStatus: "",
    hasMatchStatus: false,
    hasMatch: false,
    canAddEvent: false,
    timeline: [],
    hasTimeline: false,
  };
}

function hasRecordedScore(detail: CoachMatchDetail) {
  return typeof detail.match?.homeScore === "number" && typeof detail.match.awayScore === "number";
}

function toTimeline(detail: CoachMatchDetail): TimelineItem[] {
  const nameByStudentId = new Map(detail.roster.map((student) => [student.studentId, student.name]));
  return detail.events.map((event) => ({
    id: event.id,
    minute: event.minute,
    minuteLabel: typeof event.minute === "number" ? `${event.minute}分` : "时间待同步",
    typeLabel: matchEventLabel(event.type),
    studentName: nameByStudentId.get(event.studentId) || "学员待同步",
    note: event.note,
    hasNote: Boolean(event.note),
    createdAt: event.createdAt,
  })).sort(compareTimelineItems);
}

function compareTimelineItems(left: TimelineItem, right: TimelineItem) {
  const leftHasMinute = typeof left.minute === "number";
  const rightHasMinute = typeof right.minute === "number";
  if (leftHasMinute && rightHasMinute && left.minute !== right.minute) return left.minute! - right.minute!;
  if (leftHasMinute !== rightHasMinute) return leftHasMinute ? -1 : 1;

  const byCreatedAt = (left.createdAt || "").localeCompare(right.createdAt || "");
  return byCreatedAt || left.id.localeCompare(right.id);
}

function matchEventLabel(type: CoachMatchDetail["events"][number]["type"]) {
  const labels: Record<CoachMatchDetail["events"][number]["type"], string> = {
    goal: "进球",
    assist: "助攻",
    save: "扑救",
    tackle: "抢断",
    yellow_card: "黄牌",
    red_card: "红牌",
    penalty: "点球",
    own_goal: "乌龙球",
  };
  return labels[type];
}

function matchStatusLabel(status: string | undefined) {
  const labels: Record<string, string> = {
    completed: "已完成",
    scheduled: "待比赛",
    cancelled: "已取消",
  };
  return status ? labels[status] || status : "";
}
