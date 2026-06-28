Page({
  data: {},
  goSchedule() {
    wx.navigateTo({ url: "/pages/coach/schedule/index" });
  },
  goTraining() {
    wx.navigateTo({ url: "/pages/coach/training/index" });
  },
});
