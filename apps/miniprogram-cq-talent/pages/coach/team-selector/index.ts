import { getCoachTrainingProjectTree } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, TrainingTeamOption } from "../../../utils/types";

const COACH_TRAINING_TEAM_KEY = "coach-training-team-id";

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
  onLoad() {
    this.load();
  },
  async load() {
    if (!requireRole("coach")) return;
    this.setData({ state: "loading", message: "正在读取可选训练球队" });
    try {
      const tree = await getCoachTrainingProjectTree();
      const options = tree.teamOptions ?? [];
      const selected = resolveSelectedTeam(options, wx.getStorageSync<string>(COACH_TRAINING_TEAM_KEY), tree.team?.id);
      const teams = options.map((team) => ({
        id: team.id,
        name: team.name,
        metaLabel: team.id === selected ? "当前选择 · 后台已分配" : team.season ? `${team.season} · 后台已分配` : "后台已分配",
        isSelected: team.id === selected,
      }));
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
    if (!id) return;
    wx.setStorageSync(COACH_TRAINING_TEAM_KEY, id);
    wx.navigateBack();
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});

function resolveSelectedTeam(options: TrainingTeamOption[], storedId: string, fallbackId?: string): string {
  return options.find((team) => team.id === storedId)?.id
    ?? options.find((team) => team.id === fallbackId)?.id
    ?? options[0]?.id
    ?? "";
}
