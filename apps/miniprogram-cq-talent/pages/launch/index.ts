import { APP_CLIENT_KEY } from "../../utils/config";
import { createMockSession, mockContext } from "../../utils/mock";
import { request } from "../../utils/request";
import { setAppContext, setSession } from "../../utils/store";

interface LaunchPageThis {
  setData: (data: Record<string, unknown>) => void;
  resolveClient: () => Promise<void>;
}

Page({
  data: {
    statusText: "正在准备客户端配置...",
  },
  onLoad(this: LaunchPageThis) {
    this.resolveClient();
  },
  async resolveClient(this: LaunchPageThis) {
    try {
      const result = await request<typeof mockContext>({
        path: `/app-clients/resolve?clientKey=${APP_CLIENT_KEY}`,
      });
      setAppContext(result);
      this.setData({ statusText: "客户端配置已获取，请使用 mock 登录进入 MVP 页面。" });
    } catch {
      setAppContext(mockContext);
      this.setData({ statusText: "当前使用本地 mock 配置。真实 resolve 接口联调后会自动切换。" });
    }
  },
  loginAsParent() {
    setSession(createMockSession("parent"));
    wx.navigateTo({ url: "/pages/parent/schedule/index" });
  },
  loginAsCoach() {
    setSession(createMockSession("coach"));
    wx.navigateTo({ url: "/pages/coach/schedule/index" });
  },
});
