import { openPrivacyContract } from "../../utils/privacy";
import { wechatLogin } from "../../utils/api";
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
    agreementAccepted:false,
    agreementVisible:false,
    isBlocked: false,
    navTop: 88,
    privacyAgreed: false,
  },
  phoneAuthorizationReserved: false,
  phoneAuthorizationCallbackConsumed: false,
  phoneAuthorizationTimeoutId: undefined as number | undefined,
  redirectTarget: "" as string,
  onLoad(query?: Record<string, string | undefined>) {
    const code = query?.code ? decodeURIComponent(query.code) : "";
    const redirect = query?.redirect ? decodeURIComponent(query.redirect) : "";
    this.redirectTarget = isRedirectTarget(redirect) ? redirect : "";
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
    if (!this.data.agreementAccepted || this.phoneAuthorizationReserved) return;
    this.phoneAuthorizationReserved = true;
    this.phoneAuthorizationCallbackConsumed = false;
    runtimeTimers.setTimeout(() => {
      if (!this.data.agreementAccepted || !this.phoneAuthorizationReserved || this.phoneAuthorizationCallbackConsumed) return;
      this.setData({ submitting: true, authorizationLocked: true, state: "loading", errorType: "", message: "正在匹配俱乐部档案" });
    }, 0);
    this.phoneAuthorizationTimeoutId = runtimeTimers.setTimeout(() => {
      this.phoneAuthorizationTimeoutId = undefined;
      if (!this.phoneAuthorizationReserved || this.phoneAuthorizationCallbackConsumed) return;
      this.setData({ submitting: false, authorizationLocked: true, state: "error", errorType: "authorization_timeout", message: "微信授权未返回，请点击重试。" });
    }, AUTHORIZATION_CALLBACK_TIMEOUT_MS);
  },
  // 隐私门禁（官方推荐交互）：取号按钮使用耦合 open-type="getPhoneNumber|agreePrivacyAuthorization"，
  // 同一次点击先完成《小程序用户隐私保护指引》同意、再进入手机号授权；微信保证隐私未同意前
  // 实际取号不会执行，因此无需禁用态门禁。此回调在用户同意后触发，仅更新展示状态。
  onPrivacyAgreed() {
    this.setData({ privacyAgreed: true });
  },
  async onGetPhoneNumber(event: { detail: { code?: string; errMsg?: string } }) {
    if (!this.phoneAuthorizationReserved || this.phoneAuthorizationCallbackConsumed) return;
    this.phoneAuthorizationCallbackConsumed = true;
    if (this.phoneAuthorizationTimeoutId !== undefined) {
      runtimeTimers.clearTimeout(this.phoneAuthorizationTimeoutId);
      this.phoneAuthorizationTimeoutId = undefined;
    }
    if (!event.detail.code) {
      const errMsg = (event.detail.errMsg ?? "").toLowerCase();
      const privacyRefused = errMsg.includes("privacy");
      const tooFrequent = errMsg.includes("too frequently");
      this.setData({
        submitting: false,
        authorizationLocked: true,
        state: "error",
        errorType: privacyRefused ? "privacy_refused" : tooFrequent ? "authorization_too_frequent" : "authorization_cancelled",
        message: privacyRefused
          ? "需先同意《隐私政策》后才能授权手机号，请点击重试。"
          : tooFrequent
            ? "微信授权操作过于频繁，请稍后重试。"
            : "需要授权手机号才能匹配俱乐部身份。请点击重试。",
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
      if(result.status === "role_configuration_required") {this.setData({state:"pending",errorType:"role_configuration_required",message:"身份配置尚未完成，请联系俱乐部管理员设置默认身份。"});return;}
      if (result.status !== "authenticated" || !result.session || !result.role || !result.profile) {
        this.setData({ state: "pending", errorType: result.status === "binding_required" ? "binding_required" : "login_rejected", isBlocked: true, message: "当前手机号尚未匹配到有效的家长或教练档案，请联系俱乐部管理员。" });
        return;
      }
      if (result.role === "parent" && !result.children.length) {
        this.setData({ state: "pending", errorType: "parent_without_children", isBlocked: true, message: "家长档案尚未绑定孩子，请联系俱乐部补充资料。" });
        return;
      }
      if(!result.session.activeRole){this.setData({state:"pending",errorType:"role_configuration_required",message:"身份配置尚未完成，请联系俱乐部管理员设置默认身份。"});return;}
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
    this.setData({
      submitting: false,
      authorizationLocked: false,
      errorType: "",
    });
    this.refreshWechatCode();
  },
  onAgreementChange(event:{detail:{checked:boolean}}) {if(!this.data.submitting)this.setData({agreementAccepted:event.detail.checked});},
  toggleAgreement(){if(!this.data.submitting)this.setData({agreementAccepted:!this.data.agreementAccepted});},
  openAgreement(){this.setData({agreementVisible:true});},
  closeAgreement(){this.setData({agreementVisible:false});},
  openPrivacy(){openPrivacyContract();},
  onUnload(){
    if(this.phoneAuthorizationTimeoutId!==undefined)runtimeTimers.clearTimeout(this.phoneAuthorizationTimeoutId);
    this.phoneAuthorizationReserved=false;
    this.phoneAuthorizationCallbackConsumed=true;
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
    if (this.redirectTarget && canRedirectToRole(this.redirectTarget, session.role)) {
      // A forced re-login keeps the user's place: return to the page that
      // triggered the 401 instead of dropping them onto the role home.
      wx.reLaunch({ url: this.redirectTarget });
      return;
    }
    routeHome(session.role);
  },
  backToLaunch() {
    wx.reLaunch({ url: "/pages/launch/index" });
  },
});

function isRedirectTarget(value: string): boolean {
  return value.startsWith("/pages/") && !value.startsWith("/pages/login/") && !value.startsWith("/pages/launch/");
}

function canRedirectToRole(target: string, role: AppRole): boolean {
  if (target.startsWith("/pages/coach/")) return role === "coach";
  if (target.startsWith("/pages/parent/")) return role === "parent";
  return true; // Shared pages accept either role.
}
