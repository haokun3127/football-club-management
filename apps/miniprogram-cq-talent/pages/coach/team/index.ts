import { getTeamTrainingGames } from "../../../utils/api";
import { gameScore, gameReadMessage, GAME_STATE_LABELS } from "../../../utils/training-games";
import { loadActiveTeam } from "../../../utils/coach-team-context";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachTeamDetail, LoadState } from "../../../utils/types";

type MatchRow = { key:string; kind:"formal"|"training_friendly"; eventId:string; gameId?:string; title:string; subtitle:string; score:string; startsAt:string };
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
  matches: MatchRow[]; visibleMatches: MatchRow[]; matchFilter:"all"|"formal"|"training_friendly"; gamesMessage:string; gamesLoading:boolean;
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
  visibleMembers: MemberView[];
  search: string;
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
    this.setData({...emptyPageData("loading", "正在读取队伍信息"),section:this.data.section,pageTitle:this.data.pageTitle});
    try {
      const context = await loadActiveTeam(teamId || this.requestedTeamId || undefined);
      const detail=context.detail;
      if(!currentTeamRequest(this,token))return;
      if(!detail){this.setData({state:"empty",message:context.options.length ? "请选择球队后查看" : "暂无授权球队",hasTeam:false});return;}
      if (!currentTeamRequest(this, token)) return;
      this.requestedTeamId = "";
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
        matches: (detail.formalMatches || []).map(item => ({ key:`formal:${item.eventId}`,kind:"formal" as const,startsAt:item.startsAt,eventId: item.eventId, title: item.title,
          subtitle: `${new Date(Date.parse(item.startsAt) + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ")} · ${item.match.opponentName || "对手未配置"} · ${item.venue || "地点未配置"}`,
          score: typeof item.match.homeScore === "number" && typeof item.match.awayScore === "number" ? `${item.match.homeScore} : ${item.match.awayScore}` : "未记录比分" })),
        hasMembers: members.length > 0,
        teamName: detail.team?.name ?? "",
        season: detail.team?.season ?? "",
        heroStats: hasTeam ? toHeroStats(detail) : emptyHeroStats(),
        members, visibleMembers: members, search: "",
        memberEmptyMessage: hasTeam && !members.length ? "本队暂无在队学员" : "",
        hasCoaches: coaches.length > 0,
        coaches,
        coachEmptyMessage: hasTeam && !coaches.length ? "暂未配置队伍教练" : "",
      });
      this.filterMatches();
      if(this.data.section==="matches"||this.data.section==="all")void this.loadFriendlyGames(this.data.teamId,token);
    } catch {
      if (!currentTeamRequest(this, token)) return;
      this.setData({ ...emptyPageData("error", "队伍信息读取失败，请稍后重试。", "重新读取"), section: this.data.section, pageTitle: this.data.pageTitle });
    }
  },
  async loadFriendlyGames(teamId:string,token:number) {
    this.setData({gamesLoading:true});
    try {
      const result=await getTeamTrainingGames(teamId);if(!currentTeamRequest(this,token))return;
      const friendly:MatchRow[]=result.games.map(({game,event})=>({key:`training_friendly:${game.id}`,kind:"training_friendly",gameId:game.id,eventId:event.id,startsAt:event.startsAt,title:`${game.sideAName} · ${game.sideBName}`,subtitle:`训练内友谊赛 · ${GAME_STATE_LABELS[game.state]} · ${event.title}${event.status==='cancelled'?'（已取消）':''} · ${event.startsAt.slice(0,10)}`,score:gameScore(game)}));
      this.setData({matches:[...this.data.matches.filter((item:MatchRow)=>item.kind==="formal"),...friendly].sort((a:MatchRow,b:MatchRow)=>b.startsAt.localeCompare(a.startsAt)),gamesMessage:result.enabled?"训练内结果仅覆盖已记录场次，草稿和作废状态单独标明。":"训练内友谊赛记录尚未启用"});this.filterMatches();
    }catch(error){if(currentTeamRequest(this,token))this.setData({gamesMessage:gameReadMessage(error)});}
    finally{if(currentTeamRequest(this,token))this.setData({gamesLoading:false});}
  },
  filterMatches(){this.setData({visibleMatches:this.data.matches.filter((item:MatchRow)=>this.data.matchFilter==="all"||item.kind===this.data.matchFilter),hasMatches:this.data.matches.length>0});},
  selectMatchFilter(event:{currentTarget:{dataset:{kind:string}}}){const kind=event.currentTarget.dataset.kind;if(!["all","formal","training_friendly"].includes(kind))return;this.setData({matchFilter:kind});this.filterMatches();},
  searchMembers(event: { detail: { value: string } }) {
    const search = event.detail.value;
    const query = search.trim().toLocaleLowerCase();
    this.setData({ search, visibleMembers: this.data.members.filter((member: MemberView) => member.name.toLocaleLowerCase().includes(query)) });
  },
  onShow() { if (this.data.state === "ready") return this.load(); },
  onUnload() { nextTeamRequest(this); },
  retry() {
    this.load();
  },
  goBack() {
    wx.navigateBack();
  },
  selectTeam(event: { currentTarget: { dataset: { id: string } } }) { return this.load(event.currentTarget.dataset.id); },
  openMatch(event: { currentTarget: { dataset: { id: string } } }) {
    const id=event.currentTarget.dataset.id;
    const item=this.data.matches.find((match:MatchRow)=>match.key===id||(match.kind==="formal"&&match.eventId===id));if(!item)return;
    if(item.kind==="training_friendly"&&item.gameId)openPage(`/pages/coach/training-game/index?eventId=${encodeURIComponent(item.eventId)}&gameId=${encodeURIComponent(item.gameId)}`);
    else openPage(`/pages/coach/match/index?id=${encodeURIComponent(item.eventId)}`);
  },
  openRadar(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const id = event.currentTarget?.dataset?.id;
    if (id && this.data.members.some((member: MemberView) => member.id === id)) openPage(`/pages/coach/student-radar/index?student=${encodeURIComponent(id)}&team=${encodeURIComponent(this.data.teamId)}`);
  },
});

function emptyPageData(state: LoadState, message: string, retryLabel = ""): PageData {
  return {
    section:"all",pageTitle:"球队详情",hasTeamOptions: false, hasMatches: false, teamId: "", teamOptions: [], matches: [], visibleMatches:[],matchFilter:"all",gamesMessage:"",gamesLoading:false,
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
    members: [], visibleMembers: [], search: "",
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
