import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";

type TeamState = "loading" | "ready" | "empty" | "pending";

interface PageData {
  navInset: number;
  displayName: string;
  avatarLetter: string;
  teamState: TeamState;
  teamText: string;
  phoneText: string;
  bindingText: string;
}

Page<PageData>({
  data: accountPageData(),
  onLoad() {
    return this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;

    const requestToken = nextRequestToken(this);
    const displayName = sessionDisplayName(session.displayName);
    this.setData(accountPageData(displayName, "loading", "正在同步团队信息"));

    try {
      const home = await getCoachHome(recentThirtyDayRange(new Date()));
      if (!isCurrentRequest(this, requestToken)) return;

      const teams = toTeams(home.teams);
      this.setData(accountPageData(
        displayName,
        teams.length ? "ready" : "empty",
        teams.length ? teams.join("、") : "暂无近30天负责球队",
      ));
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData(accountPageData(displayName, "pending", "团队信息待同步"));
    }
  },
  goBack() {
    wx.navigateBack();
  },
});

function accountPageData(
  displayName = "姓名待同步",
  teamState: TeamState = "pending",
  teamText = "团队信息待同步",
): PageData {
  return {
    navInset: resolveNavInset(),
    displayName,
    avatarLetter: displayName.slice(0, 1),
    teamState,
    teamText,
    phoneText: "当前会话未提供",
    bindingText: "状态待同步",
  };
}

function sessionDisplayName(value: string | undefined) {
  return value?.trim() || "姓名待同步";
}

function recentThirtyDayRange(today: Date) {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  from.setDate(from.getDate() - 29);
  return { from: toLocalDate(from), to: toLocalDate(today) };
}

function toLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTeams(teams: string[]) {
  return teams.filter((team, index) => Boolean(team?.trim()) && teams.indexOf(team) === index);
}

function nextRequestToken(page: unknown) {
  const state = page as { _c163RequestToken?: number };
  state._c163RequestToken = (state._c163RequestToken ?? 0) + 1;
  return state._c163RequestToken;
}

function isCurrentRequest(page: unknown, requestToken: number) {
  return (page as { _c163RequestToken?: number })._c163RequestToken === requestToken;
}
