import { getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { LoadState, StudentSummary } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  children: StudentSummary[];
  activeChildId: string;
  wechatLabel: string;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    children: [],
    activeChildId: "",
    wechatLabel: "微信已绑定",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取绑定信息" });
    try {
      const children = (await getParentChildren()).map((child: StudentSummary) => ({ ...child, avatarLetter: child.name.slice(0, 1) }));
      const stored = wx.getStorageSync("activeStudentId") as string | "";
      const activeChildId = stored && children.some((child: StudentSummary) => child.id === stored)
        ? stored
        : children[0]?.id || "";
      this.setData({
        state: children.length ? "ready" : "empty",
        message: children.length ? "" : "当前账号暂未绑定学员，请联系俱乐部管理员。",
        children,
        activeChildId,
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "绑定信息读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
  goBack() { wx.navigateBack(); },
  switchChild(event: { currentTarget: { dataset: { id: string } } }) {
    const id = event.currentTarget.dataset.id;
    wx.setStorageSync("activeStudentId", id);
    this.setData({ activeChildId: id });
    wx.showToast({ title: "已切换学员", icon: "success" });
  },
  unbindWechat() {
    wx.showModal({
      title: "解除微信绑定",
      content: "解绑后需重新登录，确定要解绑吗？",
      success: (result) => {
        if (result.confirm) {
          wx.showToast({ title: "解绑需联系俱乐部管理员", icon: "none" });
        }
      },
    });
  },
  addFamilyMember() {
    wx.showToast({ title: "家庭成员由俱乐部管理员添加", icon: "none" });
  },
});
