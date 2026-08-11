import { getParentChildren, switchActiveRole } from "../../../utils/api";
import { requireRole, routeHome } from "../../../utils/auth";
import { clearSession, persistAuthenticatedSession } from "../../../utils/store";
import type { LoadState } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  displayName: string;
  initial: string;
  profileLabel: string;
  phoneLabel: string;
  canSwitchToCoach: boolean;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    displayName: "家长",
    initial: "家",
    profileLabel: "重庆天才足球俱乐部",
    phoneLabel: "已通过微信授权",
    canSwitchToCoach: false,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取账号信息", canSwitchToCoach: session.availableRoles.includes("coach") });
    try {
      const children = await getParentChildren();
      const displayName = session.displayName || "家长";
      this.setData({
        state: "ready",
        message: "",
        displayName,
        initial: displayName.slice(0, 1),
        profileLabel: children.length ? `已绑定 ${children.length} 位孩子` : "重庆天才足球俱乐部",
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "账号信息读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
  editPhone() {
    wx.showToast({ title: "请联系俱乐部管理员更新登记手机号", icon: "none" });
  },
  async switchToCoach() {
    const session = requireRole("parent");
    if (!session || !session.availableRoles.includes("coach")) return;
    try {
      const result = await switchActiveRole("coach");
      const nextSession = persistAuthenticatedSession(result);
      if (!nextSession) {
        wx.showToast({ title: "身份切换失败，请稍后重试", icon: "none" });
        return;
      }
      routeHome(nextSession.role);
    } catch {
      wx.showToast({ title: "身份切换失败，请稍后重试", icon: "none" });
    }
  },
  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需要重新授权手机号才能进入小程序。",
      success: (result) => {
        if (!result.confirm) return;
        clearSession();
        wx.reLaunch({ url: "/pages/login/index" });
      },
    });
  },
});
