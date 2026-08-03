import { getParentChildren } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { resolveMenuActionTop, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, StudentSummary } from "../../../utils/types";

interface PageData {
  state: LoadState;
  message: string;
  children: StudentSummary[];
  activeChild: (StudentSummary & { avatarLetter: string }) | null;
  activeChildId: string;
  wechatLabel: string;
  navInset: number;
  navActionTop: number;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    children: [],
    activeChild: null,
    activeChildId: "",
    wechatLabel: "微信已绑定",
    navInset: resolveNavInset(),
    navActionTop: resolveMenuActionTop(),
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
      const activeChild = children.find((child: StudentSummary) => child.id === activeChildId) ?? null;
      this.setData({
        state: children.length ? "ready" : "empty",
        message: children.length ? "" : "当前账号暂未绑定学员，请联系俱乐部管理员。",
        children,
        activeChild,
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
    const activeChild = this.data.children.find((child: StudentSummary & { avatarLetter?: string }) => child.id === id) ?? null;
    this.setData({ activeChildId: id, activeChild });
    wx.showToast({ title: "已切换学员", icon: "success" });
  },
  chooseChild() {
    if (this.data.children.length < 2) {
      wx.showToast({ title: "当前仅绑定一位学员", icon: "none" });
      return;
    }
    wx.showActionSheet({
      itemList: this.data.children.map((child: StudentSummary) => child.name),
      success: (result) => {
        const child = this.data.children[result.tapIndex];
        if (!child) return;
        this.switchChild({ currentTarget: { dataset: { id: child.id } } });
      },
    });
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
  openAccount() {
    openPage("/pages/parent/account/index");
  },
  addFamilyMember() {
    wx.showToast({ title: "家庭成员由俱乐部管理员添加", icon: "none" });
  },
});
