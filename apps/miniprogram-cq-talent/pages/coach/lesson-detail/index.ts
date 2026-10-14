import { requireRole } from "../../../utils/auth";
Page({
  data: { message: "正在打开训练记录" },
  onLoad(query?: Record<string, string | undefined>) {
    if (!requireRole("coach")) return;
    if (!query?.id) { this.setData({ message: "缺少训练活动，请返回日历重新进入。" }); return; }
    wx.redirectTo({ url: `/pages/coach/lesson/index?id=${encodeURIComponent(query.id)}`, fail: () => this.setData({ message: "打开失败，请返回日历重试。" }) });
  },
});
