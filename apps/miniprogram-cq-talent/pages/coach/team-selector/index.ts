import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate } from "../../../utils/date";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState } from "../../../utils/types";

const COACH_SELECTED_TEAM_KEY = "coach-selected-team";

type TeamOption = { name: string; metaLabel: string; isSelected: boolean };

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
    message: "正在读取可选队伍",
    teams: [],
    hasTeams: false,
  },
  onLoad() {
    this.load();
  },
  async load() {
    if (!requireRole("coach")) return;
    this.setData({ state: "loading", message: "正在读取可选队伍" });
    try {
      const date = currentLocalDate();
      const home = await getCoachHome({ from: date, to: date });
      const stored = wx.getStorageSync<string>(COACH_SELECTED_TEAM_KEY);
      const selected = home.teams.find((name) => name === stored) ?? home.teams[0] ?? "";
      const teams = home.teams.map((name) => ({
        name,
        metaLabel: name === selected ? "当前选择 · 后台同步" : "后台同步",
        isSelected: name === selected,
      }));
      this.setData({
        state: teams.length ? "ready" : "empty",
        message: teams.length ? "" : "暂未分配可选队伍，请联系俱乐部后台管理员。",
        teams,
        hasTeams: teams.length > 0,
      });
    } catch {
      this.setData({ state: "error", message: "队伍列表读取失败，请稍后重试", teams: [], hasTeams: false });
    }
  },
  selectTeam(event: { currentTarget: { dataset: { name?: string } } }) {
    const name = event.currentTarget.dataset.name;
    if (!name) return;
    wx.setStorageSync(COACH_SELECTED_TEAM_KEY, name);
    wx.navigateBack();
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});
