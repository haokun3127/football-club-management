import { getCoachHome, switchActiveRole } from "../../../utils/api";
import { requireRole, routeHome } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { clearSession, persistAuthenticatedSession } from "../../../utils/store";
import type { LoadState } from "../../../utils/types";

type ProfileStat = { label: string; value: string };

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  displayName: string;
  avatarLetter: string;
  teamsText: string;
  hasTeams: boolean;
  profileStats: ProfileStat[];
  canSwitchToParent: boolean;
}

Page<PageData>({
  data: emptyPageData("idle", ""),
  onLoad() {
    return this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;

    const requestToken = nextRequestToken(this);
    const displayName = sessionDisplayName(session.displayName);
    this.setData({
      ...emptyPageData("loading", "正在读取教练身份"),
      displayName,
      avatarLetter: displayName.slice(0, 1),
    });

    try {
      const home = await getCoachHome(recentThirtyDayRange(new Date()));
      if (!isCurrentRequest(this, requestToken)) return;

      const teams = toTeams(home.teams);
      this.setData({
        state: "ready",
        message: "",
        displayName,
        avatarLetter: displayName.slice(0, 1),
        teamsText: teams.length ? teams.join("、") : "暂无近30天负责球队",
        hasTeams: teams.length > 0,
        profileStats: toProfileStats(home.summary),
        canSwitchToParent: session.availableRoles.includes("parent"),
      });
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData({
        ...emptyPageData("error", "教练身份读取失败，请稍后重试。"),
        displayName,
        avatarLetter: displayName.slice(0, 1),
      });
    }
  },
  retry() {
    return this.load();
  },
  openAccount() {
    openPage("/pages/coach/account/index");
  },
  openPermissions() {
    openPage("/pages/coach/permissions/index");
  },
  openPrivateInterest() {
    openPage("/pages/coach/private-interest/index");
  },
  openHelp() {
    openPage("/pages/coach/help/index");
  },
  async switchToParent() {
    const session = requireRole("coach");
    if (!session || !session.availableRoles.includes("parent")) return;
    try {
      const result = await switchActiveRole("parent");
      const nextSession = persistAuthenticatedSession(result);
      if (!nextSession) return;
      routeHome(nextSession.role);
    } catch {
      // The current coach session remains active so the user can try again.
    }
  },
  logout() {
    const state = this as unknown as LogoutState;
    if (state._c16LogoutModalOpen || state._c16LogoutFinished) return;
    state._c16LogoutModalOpen = true;

    wx.showModal({
      title: "退出登录",
      content: "退出后需重新选择身份登录",
      success: (result) => {
        state._c16LogoutModalOpen = false;
        if (!result.confirm || state._c16LogoutFinished) return;
        state._c16LogoutFinished = true;
        clearSession();
        wx.reLaunch({ url: "/pages/launch/index" });
      },
    });
  },
});

interface LogoutState {
  _c16LogoutModalOpen?: boolean;
  _c16LogoutFinished?: boolean;
}

function emptyPageData(state: LoadState, message: string): PageData {
  return {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state,
    message,
    displayName: "教练",
    avatarLetter: "教",
    teamsText: "暂无近30天负责球队",
    hasTeams: false,
    profileStats: toProfileStats({ total: 0, training: 0, matches: 0 }),
    canSwitchToParent: false,
  };
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

function sessionDisplayName(value: string | undefined) {
  return value?.trim() || "教练";
}

function toTeams(teams: string[]) {
  return teams.filter((team, index) => Boolean(team?.trim()) && teams.indexOf(team) === index);
}

function toProfileStats(summary: { total: number; training: number; matches: number }): ProfileStat[] {
  return [
    { label: "近 30 天日程", value: String(summary.total) },
    { label: "训练场次", value: String(summary.training) },
    { label: "比赛场次", value: String(summary.matches) },
  ];
}

function nextRequestToken(page: unknown) {
  const state = page as { _c16RequestToken?: number };
  state._c16RequestToken = (state._c16RequestToken ?? 0) + 1;
  return state._c16RequestToken;
}

function isCurrentRequest(page: unknown, requestToken: number) {
  return (page as { _c16RequestToken?: number })._c16RequestToken === requestToken;
}
