import { resolveClient } from "../../utils/api";
import { routeHome } from "../../utils/auth";
import { DEV_AUTO_SESSION, DEV_MODE } from "../../utils/config";
import { createDevSession } from "../../utils/mock";
import { resolveNavInset } from "../../utils/presentation";
import { getDevRole, getSession, mergeSessionContext, setAppContext, setSession, toggleDevRole } from "../../utils/store";
import type { AppRole, LoadState } from "../../utils/types";

interface LaunchData {
  state: LoadState;
  title: string;
  message: string;
  actionText: string;
  clientName: string;
  devHint: string;
  contentTop: number;
}

Page<LaunchData>({
  data: {
    state: "loading",
    title: "正在进入重庆天才足球",
    message: "正在确认俱乐部与账号状态",
    actionText: "",
    clientName: "足球俱乐部小程序",
    devHint: "",
    contentTop: 88,
  },
  onLoad() {
    this.setData({ contentTop: Math.max(88, resolveNavInset() + 68) });
    this.bootstrap();
  },
  async bootstrap() {
    this.setData({
      state: "loading",
      title: "正在进入重庆天才足球",
      message: "正在确认俱乐部与账号状态",
      actionText: "",
    });
    try {
      const context = await resolveClient();
      setAppContext(context);
      const existing = getSession();
      if (existing?.role) {
        setSession(mergeSessionContext(existing, context));
        deferAfterLaunch(() => routeHome(existing.role as AppRole));
        return;
      }
      if (DEV_MODE && DEV_AUTO_SESSION) {
        const role = getDevRole();
        setSession(createDevSession(context, role));
        this.setData({ devHint: `开发身份：${role === "parent" ? "家长" : "教练"}` });
        deferAfterLaunch(() => routeHome(role));
        return;
      }
      const code = await requestWechatCode();
      deferAfterLaunch(() => {
        wx.reLaunch({ url: `/pages/login/index?code=${encodeURIComponent(code)}` });
      });
    } catch (error) {
      this.setData({
        state: "error",
        title: "暂时无法进入小程序",
        message: readableError(error),
        actionText: "重试",
      });
    }
  },
  retry() {
    this.bootstrap();
  },
  switchDevRole() {
    if (!DEV_MODE) return;
    const role: AppRole = toggleDevRole();
    wx.showToast({ title: `已切换为${role === "parent" ? "家长" : "教练"}测试身份`, icon: "none" });
    this.bootstrap();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "暂时无法连接俱乐部服务，请检查网络后重试。";
}

// 热重载/重启时页面栈非空，appLaunch 阶段直接 reLaunch 会被框架拒绝
//（appLaunch with non-empty page stack）。推迟到启动阶段结束后执行。
const runtimeTimers = globalThis as unknown as {
  setTimeout: (callback: () => void, delay: number) => number;
};
function deferAfterLaunch(action: () => void) {
  runtimeTimers.setTimeout(action, 0);
}

function requestWechatCode() {
  return new Promise<string>((resolve, reject) => {
    wx.login({
      success: (result) => result.code ? resolve(result.code) : reject(new Error("微信登录未返回有效凭证")),
      fail: (error) => reject(new Error(error.errMsg || "微信登录失败")),
    });
  });
}
