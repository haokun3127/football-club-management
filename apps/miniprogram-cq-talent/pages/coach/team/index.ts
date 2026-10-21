import { loadActiveTeam } from "../../../utils/coach-team-context";
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
  section:string; pageTitle:string;
  hasTeamOptions: boolean; hasMatches: boolean;
  teamId: string; teamOptions: Array<{ id: string; name: string }>;
  matches: Array<{ eventId: string; title: string; subtitle: string; score: string }>;
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
  requestedTeamId:"",
  onLoad(query: {teamId?:string;section?:string}={}) {
    this.requestedTeamId=query.teamId || "";
    const section=["roster","matches","coaches"].includes(query.section || "") ? query.section! : "all";
    this.setData({section,pageTitle:({roster:"队员名单",matches:"比赛记录",coaches:"教练组"} as Record<string,string>)[section] || "球队详情"});
    return this.load(query.teamId);
  },
  chooseTeam(){openPage("/pages/coach/team-selector/index");},
  openScouts() { if (requireRole("coach")) openPage("/pages/coach/scout/index"); },
  async load(teamId?: string) {
    if (!requireRole("coach")) return;
    const token = nextTeamRequest(this);
    teamId = teamId || this.data.teamId;
    this.setData({...emptyPageData("loading", "正在读取队伍信息"),section:this.data.section,pageTitle:this.data.pageTitle});
    try {
      const context = await loadActiveTeam(teamId || this.requestedTeamId || undefined);
      const detail=context.detail;
      if(!currentTeamRequest(this,token))return;
      if(!detail){this.setData({state:"empty",message:context.options.length ? "请选择球队后查看" : "暂无授权球队",hasTeam:false});return;}
      if (!currentTeamRequest(this, token)) return;
      const hasTeam = detail.team !== null;
      const members = hasTeam ? toMembers(detail) : [];
      const coaches = hasTeam ? toCoaches(detail) : [];
      this.setData({
        state: hasTeam ? "ready" : "empty",
        message: hasTeam ? "" : "暂无授权球队",
        retryLabel: "",
        hasTeam,
        hasTeamOptions: (detail.teamOptions || []).length > 1, hasMatches: (detail.formalMatches || []).length > 0,
        teamId: detail.team?.id || "", teamOptions: detail.teamOptions || [],
        matches: (detail.formalMatches || []).map(item => ({ eventId: item.eventId, title: item.title,
          subtitle: `${new Date(Date.parse(item.startsAt) + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ")} · ${item.match.opponentName || "对手未配置"} · ${item.venue || "地点未配置"}`,
          score: typeof item.match.homeScore === "number" && typeof item.match.awayScore === "number" ? `${item.match.homeScore} : ${item.match.awayScore}` : "未记录比分" })),
        hasMembers: members.length > 0,
        teamName: detail.team?.name ?? "",
        season: detail.team?.season ?? "",
        heroStats: hasTeam ? toHeroStats(detail) : emptyHeroStats(),
        members,
        memberEmptyMessage: hasTeam && !members.length ? "本队暂无在队学员" : "",
        hasCoaches: coaches.length > 0,
        coaches,
        coachEmptyMessage: hasTeam && !coaches.length ? "暂未配置队伍教练" : "",
      });
    } catch {
      if (!currentTeamRequest(this, token)) return;
      this.setData(emptyPageData("error", "队伍信息读取失败，请稍后重试。", "重新读取"));
    }
  },
  onUnload() { nextTeamRequest(this); },
  retry() {
    this.load();
  },
  goBack() {
    wx.navigateBack();
  },
  selectTeam(event: { currentTarget: { dataset: { id: string } } }) { return this.load(event.currentTarget.dataset.id); },
  openMatch(event: { currentTarget: { dataset: { id: string } } }) {
    if (this.data.matches.some((match: PageData["matches"][number]) => match.eventId === event.currentTarget.dataset.id)) openPage(`/pages/coach/match/index?id=${encodeURIComponent(event.currentTarget.dataset.id)}`);
  },
  openRadar(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id) openPage(`/pages/coach/student-radar/index?student=${encodeURIComponent(id)}&team=${encodeURIComponent(this.data.teamId)}`);
  },
});

function emptyPageData(state: LoadState, message: string, retryLabel = ""): PageData {
  return {
    section:"all",pageTitle:"球队详情",hasTeamOptions: false, hasMatches: false, teamId: "", teamOptions: [], matches: [],
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

function nextTeamRequest(page: unknown) { const p=page as {_request?:number}; return p._request=(p._request||0)+1; }
function currentTeamRequest(page: unknown, token: number) { return (page as {_request?:number})._request===token; }
