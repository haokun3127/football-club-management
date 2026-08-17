import { getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachTeamDetail, LoadState } from "../../../utils/types";

type HeroStat = { label: string; value: string; valueClass: string };

type MemberView = {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
};

type CoachView = {
  id: string;
  name: string;
  initial: string;
  roleLabel: string;
  avatarBg: string;
  avatarColor: string;
};

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  retryLabel: string;
  hasTeam: boolean;
  hasMembers: boolean;
  teamName: string;
  season: string;
  heroStats: HeroStat[];
  members: MemberView[];
  memberEmptyMessage: string;
  hasCoaches: boolean;
  coaches: CoachView[];
  coachEmptyMessage: string;
}

const AVATAR_THEMES = [
  { bg: "#fee2e2", color: "#a80f1b" },
  { bg: "#fef3c7", color: "#d97706" },
  { bg: "#e0e7ff", color: "#4f46e5" },
  { bg: "#ecfdf5", color: "#059669" },
];

Page<PageData>({
  data: emptyPageData("loading", "正在读取队伍信息"),
  onLoad() {
    return this.load();
  },
  async load() {
    if (!requireRole("coach")) return;
    this.setData(emptyPageData("loading", "正在读取队伍信息"));
    try {
      const detail = await getCoachTeam();
      const hasTeam = detail.team !== null;
      const members = hasTeam ? toMembers(detail) : [];
      const coaches = hasTeam ? toCoaches(detail) : [];
      this.setData({
        state: hasTeam ? "ready" : "empty",
        message: hasTeam ? "" : "近30天暂无可展示的球队",
        retryLabel: "",
        hasTeam,
        hasMembers: members.length > 0,
        teamName: detail.team?.name ?? "",
        season: detail.team?.season ?? "",
        heroStats: hasTeam ? toHeroStats(detail) : emptyHeroStats(),
        members,
        memberEmptyMessage: hasTeam && !members.length ? "近30天暂无执教学员" : "",
        hasCoaches: coaches.length > 0,
        coaches,
        coachEmptyMessage: hasTeam && !coaches.length ? "暂未配置队伍教练" : "",
      });
    } catch {
      this.setData(emptyPageData("error", "队伍信息读取失败，请稍后重试。", "重新读取"));
    }
  },
  retry() {
    this.load();
  },
  goBack() {
    wx.navigateBack();
  },
  openRadar(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/student-radar/index?student=${encodeURIComponent(id)}`);
  },
});

function emptyPageData(state: LoadState, message: string, retryLabel = ""): PageData {
  return {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state,
    message,
    retryLabel,
    hasTeam: false,
    hasMembers: false,
    teamName: "",
    season: "",
    heroStats: emptyHeroStats(),
    members: [],
    memberEmptyMessage: "",
    hasCoaches: false,
    coaches: [],
    coachEmptyMessage: "",
  };
}

function emptyHeroStats(): HeroStat[] {
  return [
    { label: "在队人数", value: "--", valueClass: "" },
    { label: "累计训练", value: "--", valueClass: "" },
    { label: "出勤率", value: "--", valueClass: "" },
  ];
}

function toHeroStats(detail: CoachTeamDetail): HeroStat[] {
  return [
    { label: "在队人数", value: String(detail.stats.memberCount), valueClass: "" },
    { label: "累计训练", value: String(detail.stats.completedTrainingCount), valueClass: "" },
    {
      label: "出勤率",
      value: detail.stats.attendanceRate === null ? "--" : `${detail.stats.attendanceRate}%`,
      valueClass: detail.stats.attendanceRate === null ? "" : "hero-stat__value--positive",
    },
  ];
}

function toMembers(detail: CoachTeamDetail): MemberView[] {
  return detail.members.map((member, index) => {
    const theme = AVATAR_THEMES[index % AVATAR_THEMES.length] ?? AVATAR_THEMES[0]!;
    return {
      id: member.id,
      name: member.name,
      initial: member.name.slice(0, 1),
      avatarBg: theme.bg,
      avatarColor: theme.color,
    };
  });
}

function toCoaches(detail: CoachTeamDetail): CoachView[] {
  return (detail.coaches ?? []).map((coach, index) => {
    const theme = AVATAR_THEMES[index % AVATAR_THEMES.length] ?? AVATAR_THEMES[0]!;
    return {
      id: coach.id,
      name: coach.name,
      initial: coach.name.slice(0, 1),
      roleLabel: coach.role,
      avatarBg: theme.bg,
      avatarColor: theme.color,
    };
  });
}
