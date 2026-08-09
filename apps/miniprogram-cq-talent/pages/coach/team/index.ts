import { getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveNavInset } from "../../../utils/presentation";
import type { CoachTeamDetail, LoadState } from "../../../utils/types";

type HeroStat = { label: string; value: string };

type MemberView = {
  id: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarColor: string;
};

interface PageData {
  navInset: number;
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
  };
}

function emptyHeroStats(): HeroStat[] {
  return [
    { label: "在队人数", value: "--" },
    { label: "近30天训练", value: "--" },
    { label: "出勤率", value: "--" },
  ];
}

function toHeroStats(detail: CoachTeamDetail): HeroStat[] {
  return [
    { label: "在队人数", value: String(detail.stats.memberCount) },
    { label: "近30天训练", value: String(detail.stats.trainingCount) },
    { label: "出勤率", value: detail.stats.attendanceRate === null ? "--" : `${detail.stats.attendanceRate}%` },
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
