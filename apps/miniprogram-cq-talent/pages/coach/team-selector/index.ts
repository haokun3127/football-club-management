import { rememberActiveTeam, resolveActiveTeam } from "../../../utils/coach-team-context";
import { getCoachTrainingProjectTree } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState } from "../../../utils/types";



type TeamOption = { id: string; name: string; metaLabel: string; isSelected: boolean };

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  teams: TeamOption[];
  hasTeams: boolean;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading",
    message: "正在读取可选训练球队",
    teams: [],
    hasTeams: false,
  },
  openWorkspace:false,
  onLoad(query?:{destination?:string}) { this.openWorkspace=query?.destination==="workspace";return this.load(); },
  async load() {
    if (!requireRole("coach")) return;
    this.setData({ state: "loading", message: "正在读取可选训练球队" });
    try {
      const tree = await getCoachTrainingProjectTree();
      const options = tree.teamOptions ?? [];
      const selected = resolveActiveTeam(options);
      const teams = options.map(team=>({id:team.id,name:team.name,metaLabel:team.season || "后台已分配",isSelected:team.id===selected}));
      this.setData({
        state: teams.length ? "ready" : "empty",
        message: teams.length ? "" : "暂未分配训练球队，请联系俱乐部后台管理员。",
        teams,
        hasTeams: teams.length > 0,
      });
    } catch {
      this.setData({ state: "error", message: "队伍列表读取失败，请稍后重试", teams: [], hasTeams: false });
    }
  },
  selectTeam(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id || !this.data.teams.some((team:TeamOption)=>team.id===id)) return;
    rememberActiveTeam(id);
    const url=`/pages/coach/training/index?teamId=${encodeURIComponent(id)}`;
    if(this.openWorkspace)wx.redirectTo({url});
    else wx.navigateBack({fail:()=>wx.reLaunch({url})});
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});
