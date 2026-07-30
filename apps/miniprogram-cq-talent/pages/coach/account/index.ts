import { getCoachHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { clearSession } from "../../../utils/store";
import type { LoadState } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  coachName: string;
  coachInitial: string;
  teamLabel: string;
  phoneLabel: string;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    coachName: "教练",
    coachInitial: "教",
    teamLabel: "",
    phoneLabel: "未绑定",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取账号信息" });
    try {
      const home = await getCoachHome();
      const coachName = home.coachName || "教练";
      this.setData({
        state: "ready",
        coachName,
        coachInitial: coachName.slice(0, 1),
        teamLabel: home.teams.length ? `${home.teams.join(" / ")} · 主教练` : "重庆天才足球俱乐部",
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "账号信息读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
  editName() {
    wx.showToast({ title: "昵称修改需联系俱乐部管理员", icon: "none" });
  },
  editPhone() {
    wx.showToast({ title: "手机号修改需验证后由管理员变更", icon: "none" });
  },
  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需重新选择身份登录",
      success: (result) => {
        if (result.confirm) {
          clearSession();
          wx.reLaunch({ url: "/pages/launch/index" });
        }
      },
    });
  },
});
