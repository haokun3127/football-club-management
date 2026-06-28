import { mockEvents } from "../../../utils/mock";
import { openPage } from "../../../utils/navigation";

Page({
  data: {
    events: mockEvents,
  },
  openAttendance() {
    wx.showToast({ title: "点名写入 BFF 待接入", icon: "none" });
  },
  openWrite() {
    wx.showToast({ title: "训练/比赛记录待接入", icon: "none" });
  },
  goTraining() {
    openPage("/pages/coach/training/index");
  },
  goMe() {
    openPage("/pages/coach/me/index");
  },
});
