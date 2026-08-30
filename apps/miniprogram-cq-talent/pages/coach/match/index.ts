import { getCoachMatchDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { loadMatchEventDraft } from "../../../utils/match-event-draft";
import { openPage } from "../../../utils/navigation";
import type { CoachMatchDetail, LoadState } from "../../../utils/types";

type TimelineItem = {
  id: string;
  minute?: number;
  minuteLabel: string;
  typeLabel: string;
  tone: "score" | "assist" | "defense" | "discipline" | "neutral";
  studentName: string;
  note?: string;
  hasNote: boolean;
  createdAt?: string;
};

type PeriodChip = { id: "first-half" | "second-half"; periodLabel: string; scoreLabel: string };

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
  canEditMatch: boolean;
  periodChips: PeriodChip[];
  timeline: TimelineItem[];
  hasTimeline: boolean;
  hasLocalDraftNotice: boolean;
  localDraftUpdatedAtLabel: string;
  localDraftNavigationLocked: boolean;
}

let loadToken = 0;

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
    canEditMatch: false,
    periodChips: [],
    timeline: [],
    hasTimeline: false,
    hasLocalDraftNotice: false,
    localDraftUpdatedAtLabel: "",
    localDraftNavigationLocked: false,
  },
  onLoad(query?: Record<string, string | undefined>) {
    const session = requireRole("coach");
    if (!session) return;
    return this.load(query?.id || "", session.capabilities?.match?.eventTypes);
  },
  onShow() {
    if (!this.data.eventId || !this.data.hasLoaded) return;
    const session = requireRole("coach");
    if (!session) return;
    return this.load(this.data.eventId, session.capabilities?.match?.eventTypes);
  },
  async load(eventId: string, capabilityEventTypes?: string[]): Promise<boolean> {
    if (!eventId) {
      this.setData({ ...emptyState("缺少活动 ID"), state: "empty" });
      return false;
    }

    const requestToken = ++loadToken;
    this.setData({
      ...emptyState("正在读取比赛记录"),
      state: "loading",
      eventId,
      hasLoaded: false,
    });

    try {
      const detail = await getCoachMatchDetail(eventId);
      if (requestToken !== loadToken) return false;
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
      const draft = findCompatibleLocalDraft(eventId, detail, capabilityEventTypes);
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
         canEditMatch: true,
        periodChips: toPeriodChips(),
        timeline,
        hasTimeline: timeline.length > 0,
        hasLocalDraftNotice: Boolean(draft),
        localDraftUpdatedAtLabel: draft ? formatLocalDraftUpdatedAt(draft.updatedAt) : "",
        localDraftNavigationLocked: false,
      });
      return true;
    } catch {
      if (requestToken !== loadToken) return false;
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
    const session = requireRole("coach");
    if (!session) return;
    this.load(this.data.eventId, session.capabilities?.match?.eventTypes);
  },
  goBack() {
    wx.navigateBack();
  },
  openMatchEventAdd() {
    if (!this.data.eventId || !this.data.canAddEvent) return;
    openPage(`/pages/coach/match-event-add/index?eventId=${this.data.eventId}`);
  },
  openMatchEdit() {
    if (!this.data.eventId || !this.data.canEditMatch) return;
    openPage(`/pages/coach/match-edit/index?eventId=${this.data.eventId}`);
  },
  continueLocalDraft() {
    if (!this.data.eventId || !this.data.hasLocalDraftNotice || this.data.localDraftNavigationLocked) return;
    this.setData({ localDraftNavigationLocked: true });
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
    canEditMatch: false,
    periodChips: [],
    timeline: [],
    hasTimeline: false,
    hasLocalDraftNotice: false,
    localDraftUpdatedAtLabel: "",
    localDraftNavigationLocked: false,
  };
}

function findCompatibleLocalDraft(eventId: string, detail: CoachMatchDetail, capabilityEventTypes?: string[]) {
  const draft = loadMatchEventDraft(eventId);
  if (!draft || draft.eventId !== eventId) return null;
  const hasStudent = detail.roster.some((student) => student.studentId === draft.studentId);
  const hasType = (capabilityEventTypes ?? []).includes(draft.type);
  return hasStudent && hasType ? draft : null;
}

function formatLocalDraftUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "本机草稿时间待同步";
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  return `本机保存于 ${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())} ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
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
    tone: matchEventTone(event.type),
    studentName: nameByStudentId.get(event.studentId) || "学员待同步",
    note: event.note,
    hasNote: Boolean(event.note),
    createdAt: event.createdAt,
  })).sort(compareTimelineItems);
}

function toPeriodChips(): PeriodChip[] {
  return [
    { id: "first-half", periodLabel: "上半场", scoreLabel: "比分待同步" },
    { id: "second-half", periodLabel: "下半场", scoreLabel: "比分待同步" },
  ];
}

function matchEventTone(type: CoachMatchDetail["events"][number]["type"]): TimelineItem["tone"] {
  switch (type) {
    case "goal":
    case "penalty":
    case "own_goal":
      return "score";
    case "assist":
      return "assist";
    case "save":
    case "tackle":
    case "foul":
      return "defense";
    case "yellow_card":
    case "red_card":
      return "discipline";
    default:
      return "neutral";
  }
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
    foul: "犯规",
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
