import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
import { clearDisposableLocalCache, clearSession } from "../../../utils/store";
import type { PhoneBinding } from "../../../utils/types";

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
    this.setData(accountPageData(displayName, "loading", "正在同步团队信息", session.phone, session.phoneBinding));

    try {
      const home = await getCoachHome(recentThirtyDayRange(new Date()));
      if (!isCurrentRequest(this, requestToken)) return;

      const teams = toTeams(home.teams);
      this.setData(accountPageData(
        displayName,
        teams.length ? "ready" : "empty",
        teams.length ? teams.join("、") : "暂无近30天负责球队",
        session.phone,
        session.phoneBinding,
      ));
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData(accountPageData(displayName, "pending", "团队信息待同步", session.phone, session.phoneBinding));
    }
  },
  goBack() {
    wx.navigateBack();
  },
  clearCache() {
    wx.showModal({
      title: "清除本地缓存",
      content: "将清除未提交的测评、比赛草稿和通知已读状态，登录与身份不会受影响。",
      success: (result) => {
        if (!result.confirm) return;
        const cleared = clearDisposableLocalCache();
        wx.showToast({ title: cleared ? `已清除 ${cleared} 项本地缓存` : "暂无可清除缓存", icon: "none" });
      },
    });
  },
  reauthorizeWechat() {
    wx.showModal({
      title: "重新授权微信手机号",
      content: "将退出当前会话，随后通过微信手机号重新匹配俱乐部档案。",
      success: (result) => {
        if (!result.confirm) return;
        clearSession();
        wx.reLaunch({ url: "/pages/login/index?reauthorize=1" });
      },
    });
  },
});

function accountPageData(
  displayName = "姓名待同步",
  teamState: TeamState = "pending",
  teamText = "团队信息待同步",
  phone?: string,
  phoneBinding?: PhoneBinding,
): PageData {
  return {
    navInset: resolveNavInset(),
    displayName,
    avatarLetter: displayName.slice(0, 1),
    teamState,
    teamText,
    phoneText: maskPhone(phone),
    bindingText: phoneBinding === "accepted" ? "已绑定" : "状态待同步",
  };
}

function maskPhone(phone: string | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? `${digits.slice(0, 3)}****${digits.slice(-4)}` : "当前会话未提供";
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
