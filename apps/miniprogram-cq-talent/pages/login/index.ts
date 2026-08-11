import { switchActiveRole, wechatLogin } from "../../utils/api";
import { routeHome } from "../../utils/auth";
import { getAppContext, persistAuthenticatedSession } from "../../utils/store";
import type { AppRole, LoadState, LoginResult } from "../../utils/types";

const AUTHORIZATION_CALLBACK_TIMEOUT_MS = 10_000;
const runtimeTimers = globalThis as unknown as {
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (timerId: number) => void;
};

Page({
  data: {
    state: "ready" as LoadState,
    message: "首次使用需要验证微信手机号，以匹配俱乐部登记档案。",
    errorType: "",
    wxLoginCode: "",
    submitting: false,
    authorizationLocked: false,
    roleChooserVisible: false,
    canChooseParent: false,
    canChooseCoach: false,
    isBlocked: false,
    navTop: 88,
  },
  phoneAuthorizationReserved: false,
  phoneAuthorizationCallbackConsumed: false,
  phoneAuthorizationTimeoutId: undefined as number | undefined,
  pendingRoleLogin: null as LoginResult | null,
  roleSelectionInProgress: false,
  onLoad(query?: Record<string, string | undefined>) {
    const code = query?.code ? decodeURIComponent(query.code) : "";
    // Keep the G2 top navigation envelope at 88px.
    this.setData({ wxLoginCode: code, navTop: 88 });
    if (!code) this.refreshWechatCode();
  },
  refreshWechatCode() {
    this.setData({ state: "loading", errorType: "", message: "正在连接微信账号", isBlocked: false });
    wx.login({
      success: (result) => {
        if (!result.code) {
          this.setData({ state: "error", errorType: "wx_login_empty_code", message: "微信登录未返回有效凭证，请重试。" });
          return;
        }
        this.setData({ state: "ready", errorType: "", message: "请授权手机号完成身份匹配。", wxLoginCode: result.code });
      },
      fail: () => this.setData({ state: "error", errorType: "wx_login_failed", message: "微信登录失败，请重试。" }),
    });
  },
  onPhoneAuthorizationTap() {
    if (this.phoneAuthorizationReserved) return;
    this.phoneAuthorizationReserved = true;
    this.phoneAuthorizationCallbackConsumed = false;
    runtimeTimers.setTimeout(() => {
      if (!this.phoneAuthorizationReserved || this.phoneAuthorizationCallbackConsumed) return;
      this.setData({ submitting: true, authorizationLocked: true, state: "loading", errorType: "", message: "正在匹配俱乐部档案" });
    }, 0);
    this.phoneAuthorizationTimeoutId = runtimeTimers.setTimeout(() => {
      this.phoneAuthorizationTimeoutId = undefined;
      if (!this.phoneAuthorizationReserved || this.phoneAuthorizationCallbackConsumed) return;
      this.setData({ submitting: false, authorizationLocked: true, state: "error", errorType: "authorization_timeout", message: "微信授权未返回，请点击重试。" });
    }, AUTHORIZATION_CALLBACK_TIMEOUT_MS);
  },
  async onGetPhoneNumber(event: { detail: { code?: string; errMsg?: string } }) {
    if (!this.phoneAuthorizationReserved || this.phoneAuthorizationCallbackConsumed) return;
    this.phoneAuthorizationCallbackConsumed = true;
    if (this.phoneAuthorizationTimeoutId !== undefined) {
      runtimeTimers.clearTimeout(this.phoneAuthorizationTimeoutId);
      this.phoneAuthorizationTimeoutId = undefined;
    }
    if (!event.detail.code) {
      const tooFrequent = event.detail.errMsg?.toLowerCase().includes("too frequently");
      this.setData({
        submitting: false,
        authorizationLocked: true,
        state: "error",
        errorType: tooFrequent ? "authorization_too_frequent" : "authorization_cancelled",
        message: tooFrequent ? "微信授权操作过于频繁，请稍后重试。" : "需要授权手机号才能匹配俱乐部身份。请点击重试。",
      });
      return;
    }
    if (!this.data.wxLoginCode) {
      this.setData({ submitting: false, authorizationLocked: true, state: "error", errorType: "missing_wx_login_code", message: "微信登录凭证不可用，请点击重试。" });
      return;
    }
    const context = getAppContext();
    if (!context) {
      this.setData({ submitting: false, authorizationLocked: true, state: "error", errorType: "missing_app_context", message: "请查看首页后重新进行身份验证。" });
      wx.reLaunch({ url: "/pages/launch/index" });
      return;
    }
    this.setData({ submitting: true, authorizationLocked: true, state: "loading", errorType: "", message: "正在匹配俱乐部档案" });
    try {
      const result = await wechatLogin(this.data.wxLoginCode, event.detail.code);
      if (result.status !== "authenticated" || !result.session || !result.role || !result.profile) {
        this.setData({ state: "pending", errorType: result.status === "binding_required" ? "binding_required" : "login_rejected", isBlocked: true, message: "当前手机号尚未匹配到有效的家长或教练档案，请联系俱乐部管理员。" });
        return;
      }
      if (result.role === "parent" && !result.children.length) {
        this.setData({ state: "pending", errorType: "parent_without_children", isBlocked: true, message: "家长档案尚未绑定孩子，请联系俱乐部补充资料。" });
        return;
      }
      if (!result.session.activeRole && result.availableRoles.length > 1) {
        this.pendingRoleLogin = result;
        this.setData({
          state: "ready",
          message: "请选择进入小程序的身份。",
          roleChooserVisible: true,
          canChooseParent: result.availableRoles.includes("parent"),
          canChooseCoach: result.availableRoles.includes("coach"),
        });
        return;
      }
      this.finishAuthenticatedSession(result);
    } catch (error) {
      const record = error as { code?: string; message?: string };
      this.setData({ state: "error", errorType: record.code === "wechat_login_failed" ? "wechat_login_failed" : "login_failed", message: record.code === "wechat_login_failed" ? "微信验证失败，请重新授权手机号。" : "身份匹配失败，请稍后重试。" });
    } finally {
      this.setData({ submitting: false });
    }
  },
  retry() {
    if (this.phoneAuthorizationTimeoutId !== undefined) {
      runtimeTimers.clearTimeout(this.phoneAuthorizationTimeoutId);
      this.phoneAuthorizationTimeoutId = undefined;
    }
    this.phoneAuthorizationReserved = false;
    this.phoneAuthorizationCallbackConsumed = false;
    this.pendingRoleLogin = null;
    this.roleSelectionInProgress = false;
    this.setData({
      submitting: false,
      authorizationLocked: false,
      errorType: "",
      roleChooserVisible: false,
      canChooseParent: false,
      canChooseCoach: false,
    });
    this.refreshWechatCode();
  },
  chooseParentRole() {
    return this.chooseRole("parent");
  },
  chooseCoachRole() {
    return this.chooseRole("coach");
  },
  async chooseRole(role: AppRole) {
    const pending = this.pendingRoleLogin;
    if (
      this.roleSelectionInProgress
      || !pending?.session
      || pending.session.activeRole !== null
      || !pending.availableRoles.includes(role)
    ) return;

    this.roleSelectionInProgress = true;
    this.setData({ submitting: true, errorType: "", message: "正在切换身份。" });
    try {
      const result = await switchActiveRole(role, pending.session.token);
      this.pendingRoleLogin = null;
      this.setData({ roleChooserVisible: false, canChooseParent: false, canChooseCoach: false });
      this.finishAuthenticatedSession(result);
    } catch {
      this.setData({ state: "ready", errorType: "role_selection_failed", message: "身份切换失败，请重新选择。" });
    } finally {
      this.roleSelectionInProgress = false;
      this.setData({ submitting: false });
    }
  },
  finishAuthenticatedSession(result: LoginResult) {
    if (result.session?.activeRole === "parent" && !result.children.length) {
      this.setData({ state: "pending", errorType: "parent_without_children", isBlocked: true, message: "家长档案尚未绑定孩子，请联系俱乐部补充资料。" });
      return;
    }
    const session = persistAuthenticatedSession(result);
    if (!session) {
      this.setData({ state: "error", errorType: "login_rejected", message: "身份匹配失败，请稍后重试。" });
      return;
    }
    routeHome(session.role);
  },
  backToLaunch() {
    wx.reLaunch({ url: "/pages/launch/index" });
  },
});
