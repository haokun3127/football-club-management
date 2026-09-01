import { getCoachHome, getCoachTeam, switchActiveRole } from "../../../utils/api";
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
      const [home, teamDetail] = await Promise.all([
        getCoachHome(recentThirtyDayRange(new Date())),
        getCoachTeam(),
      ]);
      if (!isCurrentRequest(this, requestToken)) return;

      const currentTeamName = teamDetail.team?.name?.trim() || "暂无负责球队";
      this.setData({
        state: "ready",
        message: "",
        displayName,
        avatarLetter: displayName.slice(0, 1),
        teamsText: currentTeamName,
        hasTeams: Boolean(teamDetail.team),
        profileStats: toProfileStats(home.summary, teamDetail.stats),
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
    if (state._c16LogoutFinished) return;
    state._c16LogoutFinished = true;
    clearSession();
    wx.reLaunch({ url: "/pages/launch/index" });
  },
});

interface LogoutState {
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
    teamsText: "暂无负责球队",
    hasTeams: false,
    profileStats: toProfileStats({ total: 0 }, { memberCount: 0, attendanceRate: null }),
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

function toProfileStats(
  summary: { total: number },
  teamStats: { memberCount: number; attendanceRate: number | null },
): ProfileStat[] {
  return [
    { label: "近30天日程", value: String(summary.total) },
    { label: "在队学员", value: String(teamStats.memberCount) },
    { label: "平均出勤", value: teamStats.attendanceRate === null ? "待同步" : `${teamStats.attendanceRate}%` },
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
