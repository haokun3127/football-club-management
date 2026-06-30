import { getParentChildren, getParentStudentHome, pendingWrite } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, StudentHome, StudentSummary } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取孩子档案",
    children: [] as StudentSummary[],
    activeStudentId: "",
    studentHome: null as StudentHome | null,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取孩子档案" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      setCurrentStudentId(active.id);
      const studentHome = await getParentStudentHome(active);
      this.setData({ state: "ready", message: "", children, activeStudentId: active.id, studentHome });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  switchChild(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id || id === this.data.activeStudentId) return;
    setCurrentStudentId(id);
    this.load();
  },
  async submitPrivateLessonInterest() {
    const result = await pendingWrite("私教意向");
    wx.showToast({ title: result.title, icon: "none" });
  },
  retry() {
    this.load();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "孩子档案读取失败。";
}
