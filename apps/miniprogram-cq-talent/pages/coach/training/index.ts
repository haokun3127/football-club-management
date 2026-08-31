import { getCoachHome, getCoachTrainingProjectTree } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeOnly, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, ScheduleEvent, TrainingProjectTree, TrainingTeamOption } from "../../../utils/types";

const COACH_TRAINING_TEAM_KEY = "coach-training-team-id";

type HeroMetric = { label: string; value: string };

type TrainingCard = {
  id: string;
  title: string;
  timeLabel: string;
  venue: string;
  hasVenue: boolean;
  status: string;
  statusLabel: string;
  statusTone: string;
  hasStatus: boolean;
  participantLabel: string;
  hasParticipantCount: boolean;
};

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取训练管理",
    retryLabel: "",
    selectedTeamName: "",
    selectedTeamMetaLabel: "",
    hasSelectedTeam: false,
    heroMetrics: emptyHeroMetrics(),
    trainingCards: [] as TrainingCard[],
    hasTrainingCards: false,
  },
  onLoad() {
    if (!requireRole("coach")) return;
    return this.load();
  },
  onShow() {
    if (this.data.state !== "loading") return this.load();
  },
  async load() {
    this.setData({
      state: "loading",
      message: "正在读取训练管理",
      retryLabel: "",
      selectedTeamName: "",
      selectedTeamMetaLabel: "",
      hasSelectedTeam: false,
      heroMetrics: emptyHeroMetrics(),
      trainingCards: [],
      hasTrainingCards: false,
    });
    try {
      const [home, tree] = await Promise.all([
        getCoachHome(currentMonthRange(new Date())),
        getCoachTrainingProjectTree(),
      ]);
      const selectedTeam = resolveTrainingTeam(tree, wx.getStorageSync<string>(COACH_TRAINING_TEAM_KEY));
      const teamEvents = selectedTeam ? home.events.filter((event) => event.teamName === selectedTeam.name) : [];
      const trainingCards = toTrainingCards(teamEvents);
      this.setData({
        state: selectedTeam ? "ready" : "empty",
        message: selectedTeam ? "" : "暂未分配训练球队，请联系俱乐部后台管理员。",
        retryLabel: "",
        selectedTeamName: selectedTeam?.name ?? "",
        selectedTeamMetaLabel: selectedTeam ? teamMetaLabel(selectedTeam) : "",
        hasSelectedTeam: Boolean(selectedTeam),
        heroMetrics: toHeroMetrics(teamEvents),
        trainingCards,
        hasTrainingCards: trainingCards.length > 0,
      });
    } catch {
      this.setData({
        state: "error",
        message: "训练管理读取失败，请稍后重试。",
        retryLabel: "重新读取",
        heroMetrics: emptyHeroMetrics(),
        trainingCards: [],
        hasTrainingCards: false,
      });
    }
  },
  openTrainingEvent(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/event/index?id=${encodeURIComponent(id)}`);
  },
  openTrainingTeamSelector() {
    openPage("/pages/coach/team-selector/index");
  },
  openTeamAbility() {
    openPage("/pages/coach/team-ability/index");
  },
  openTeam() {
    openPage("/pages/coach/team/index");
  },
  openTestTasks() {
    openPage("/pages/coach/test-tasks/index");
  },
  retry() {
    this.load();
  },
});

function currentMonthRange(now: Date): { from: string; to: string } {
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    from: localDate(year, month, 1),
    to: localDate(year, month + 1, 0),
  };
}

function localDate(year: number, month: number, day: number): string {
  const value = new Date(year, month, day);
  const localYear = value.getFullYear();
  const localMonth = String(value.getMonth() + 1).padStart(2, "0");
  const localDay = String(value.getDate()).padStart(2, "0");
  return `${localYear}-${localMonth}-${localDay}`;
}

function emptyHeroMetrics(): HeroMetric[] {
  return [
    { label: "累计课时", value: "--" },
    { label: "平均出勤", value: "--" },
    { label: "在队人数", value: "--" },
    { label: "本月比赛", value: "--" },
  ];
}

function toHeroMetrics(events: ScheduleEvent[]): HeroMetric[] {
  const trainingCount = events.filter((event) => event.type === "training").length;
  const matchCount = events.filter((event) => event.type === "match").length;
  const attendanceCount = events.filter((event) => event.nextAction === "attendance").length;
  const scheduledCount = events.filter((event) => isScheduled(event.status)).length;
  return [
    { label: "本月训练", value: String(trainingCount) },
    { label: "本月比赛", value: String(matchCount) },
    { label: "待点名", value: String(attendanceCount) },
    { label: "已排课程", value: String(scheduledCount) },
  ];
}

function resolveTrainingTeam(tree: TrainingProjectTree, storedTeamId: string): TrainingTeamOption | null {
  const options = tree.teamOptions ?? [];
  return options.find((team) => team.id === storedTeamId)
    ?? options.find((team) => team.id === tree.team?.id)
    ?? options[0]
    ?? null;
}

function teamMetaLabel(team: TrainingTeamOption): string {
  return team.season ? `${team.season} · 后台已分配` : "后台已分配";
}

function isScheduled(status: string): boolean {
  return ["scheduled", "published", "active", "upcoming", "已排定"].includes(status.trim().toLowerCase());
}

function toTrainingCards(events: ScheduleEvent[]): TrainingCard[] {
  return events
    .filter((event) => event.type === "training")
    .map((event) => {
      const status = trainingStatus(event.status);
      return {
        id: event.id,
        title: event.title,
        timeLabel: `${formatCalendarDate(event.startsAt)} · ${formatTimeOnly(event.startsAt)}`,
        venue: event.venue,
        hasVenue: Boolean(event.venue),
        status: event.status,
        statusLabel: status.label,
        statusTone: status.tone,
        hasStatus: Boolean(status.label),
        participantLabel: typeof event.participantCount === "number" ? `${event.participantCount} 人` : "",
        hasParticipantCount: typeof event.participantCount === "number",
      };
    });
}

function trainingStatus(value: string): { label: string; tone: string } {
  const normalized = value.trim().toLowerCase();
  if (["scheduled", "published", "active", "upcoming", "已排定"].includes(normalized)) return { label: "已排定", tone: "scheduled" };
  if (["pending", "draft", "unconfirmed", "待确认"].includes(normalized)) return { label: "待确认", tone: "pending" };
  if (["completed", "finished", "done", "已结束", "已完成"].includes(normalized)) return { label: "已结束", tone: "completed" };
  return value ? { label: value, tone: "neutral" } : { label: "", tone: "" };
}
