import { getCoachHome, getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeRange, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachHome, CoachTeamDetail, LoadState, ScheduleEvent } from "../../../utils/types";

type HeroMetric = { label: string; value: string };

type TrainingCard = {
  id: string;
  title: string;
  timeLabel: string;
  venue: string;
  hasVenue: boolean;
  status: string;
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
    heroMetrics: emptyHeroMetrics(),
    trainingCards: [] as TrainingCard[],
    hasTrainingCards: false,
  },
  onLoad() {
    if (!requireRole("coach")) return;
    return this.load();
  },
  async load() {
    this.setData({
      state: "loading",
      message: "正在读取训练管理",
      retryLabel: "",
      heroMetrics: emptyHeroMetrics(),
      trainingCards: [],
      hasTrainingCards: false,
    });
    try {
      const [home, team] = await Promise.all([
        getCoachHome(currentMonthRange(new Date())),
        getCoachTeam(),
      ]);
      const trainingCards = toTrainingCards(home.events);
      this.setData({
        state: trainingCards.length ? "ready" : "empty",
        message: trainingCards.length ? "" : "本月暂无训练活动",
        retryLabel: "",
        heroMetrics: toHeroMetrics(home, team),
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
  openTeamAbility() {
    openPage("/pages/coach/team-ability/index");
  },
  openTeam() {
    openPage("/pages/coach/team/index");
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

function toHeroMetrics(home: CoachHome, team: CoachTeamDetail): HeroMetric[] {
  return [
    { label: "累计课时", value: String(team.stats.completedTrainingCount) },
    { label: "平均出勤", value: team.stats.attendanceRate === null ? "--" : `${team.stats.attendanceRate}%` },
    { label: "在队人数", value: String(team.stats.memberCount) },
    { label: "本月比赛", value: String(home.summary.matches) },
  ];
}

function toTrainingCards(events: ScheduleEvent[]): TrainingCard[] {
  return events
    .filter((event) => event.type === "training")
    .map((event) => ({
      id: event.id,
      title: event.title,
      timeLabel: `${formatCalendarDate(event.startsAt)} · ${formatTimeRange(event.startsAt, event.endsAt)}`,
      venue: event.venue,
      hasVenue: Boolean(event.venue),
      status: event.status,
      hasStatus: Boolean(event.status),
      participantLabel: typeof event.participantCount === "number" ? `${event.participantCount} 人` : "",
      hasParticipantCount: typeof event.participantCount === "number",
    }));
}
