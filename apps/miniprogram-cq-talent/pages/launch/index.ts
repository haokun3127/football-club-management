import { resolveClient } from "../../utils/api";
import { routeHome } from "../../utils/auth";
import { DEV_MODE } from "../../utils/config";
import { createDevSession } from "../../utils/mock";
import { getDevRole, getSession, setAppContext, setSession, toggleDevRole } from "../../utils/store";
import type { AppRole, LoadState } from "../../utils/types";

interface LaunchData {
  state: LoadState;
  title: string;
  message: string;
  actionText: string;
  clientName: string;
  devHint: string;
}

Page<LaunchData>({
  data: {
    state: "loading",
    title: "正在进入重庆天才足球",
    message: "正在解析小程序客户端和账号绑定状态",
    actionText: "",
    clientName: "足球俱乐部小程序",
    devHint: "",
  },
  onLoad() {
    this.bootstrap();
  },
  async bootstrap() {
    this.setData({
      state: "loading",
      title: "正在进入重庆天才足球",
      message: "正在解析小程序客户端和账号绑定状态",
      actionText: "",
    });
    try {
      const context = await resolveClient();
      setAppContext(context);
      const existing = getSession();
      if (existing?.role) {
        routeHome(existing.role);
        return;
      }
      if (DEV_MODE) {
        const role = getDevRole();
        setSession(createDevSession(context, role));
        this.setData({ devHint: `开发身份：${role === "parent" ? "家长" : "教练"}` });
        routeHome(role);
        return;
      }
      this.setData({
        state: "pending",
        title: "需要完成手机号绑定",
        message: "请使用微信手机号授权匹配俱乐部档案。",
        actionText: "重新检测",
        clientName: context.capabilities.client?.name || "足球俱乐部小程序",
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
