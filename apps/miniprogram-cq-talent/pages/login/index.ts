import { wechatLogin } from "../../utils/api";
import { routeHome } from "../../utils/auth";
import { getAppContext, setSession } from "../../utils/store";
import type { LoadState } from "../../utils/types";

Page({
  data: {
    state: "ready" as LoadState,
    message: "首次使用需要验证微信手机号，以匹配俱乐部登记档案。",
    wxLoginCode: "",
    submitting: false,
    isBlocked: false,
    navTop: 88,
  },
  onLoad(query?: Record<string, string | undefined>) {
    const code = query?.code ? decodeURIComponent(query.code) : "";
    // Keep the G2 top navigation envelope at 88px.
    this.setData({ wxLoginCode: code, navTop: 88 });
    if (!code) this.refreshWechatCode();
  },
  refreshWechatCode() {
    this.setData({ state: "loading", message: "正在连接微信账号", isBlocked: false });
    wx.login({
      success: (result) => {
        if (!result.code) {
          this.setData({ state: "error", message: "微信登录未返回有效凭证，请重试。" });
          return;
        }
        this.setData({ state: "ready", message: "请授权手机号完成身份匹配。", wxLoginCode: result.code });
      },
      fail: (error) => this.setData({ state: "error", message: error.errMsg || "微信登录失败，请重试。" }),
    });
  },
  async onGetPhoneNumber(event: { detail: { code?: string; errMsg?: string } }) {
    if (this.data.submitting) return;
    if (!event.detail.code) {
      this.setData({ state: "error", message: "需要授权手机号才能匹配俱乐部身份。您也可以联系俱乐部确认登记手机号。" });
      return;
    }
    if (!this.data.wxLoginCode) {
      this.refreshWechatCode();
      return;
    }
    const context = getAppContext();
    if (!context) {
      wx.reLaunch({ url: "/pages/launch/index" });
      return;
    }
    this.setData({ submitting: true, state: "loading", message: "正在匹配俱乐部档案" });
    try {
      const result = await wechatLogin(this.data.wxLoginCode, event.detail.code);
      if (result.status !== "authenticated" || !result.session || !result.role || !result.profile) {
        this.setData({ state: "pending", isBlocked: true, message: "当前手机号尚未匹配到有效的家长或教练档案，请联系俱乐部管理员。" });
        return;
      }
      if (result.role === "parent" && !result.children.length) {
        this.setData({ state: "pending", isBlocked: true, message: "家长档案尚未绑定孩子，请联系俱乐部补充资料。" });
        return;
      }
      setSession({
        ...context,
        capabilities: result.capabilities,
        role: result.role,
        token: result.session.token,
        userId: result.profile.userId,
        displayName: result.profile.displayName,
        currentStudentId: result.children[0]?.id,
        expiresAt: new Date(Date.now() + result.session.expiresInSeconds * 1000).toISOString(),
      });
      routeHome(result.role);
    } catch (error) {
      const record = error as { code?: string; message?: string };
      this.setData({ state: "error", message: record.code === "wechat_login_failed" ? "微信验证失败，请重新授权手机号。" : record.message || "身份匹配失败，请稍后重试。" });
    } finally {
      this.setData({ submitting: false });
    }
  },
  retry() {
    this.refreshWechatCode();
  },
  backToLaunch() {
    wx.reLaunch({ url: "/pages/launch/index" });
  },
});
