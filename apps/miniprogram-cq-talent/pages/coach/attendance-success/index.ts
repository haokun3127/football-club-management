Page({
  data: {
    title: "活动",
    date: "",
    venue: "",
    present: 0,
    absent: 0,
    correction: false,
  },
  onLoad(query: { title?: string; date?: string; venue?: string; present?: string; absent?: string; correction?: string }) {
    this.setData({
      title: query?.title ? decodeURIComponent(query.title) : "活动",
      date: query?.date ? decodeURIComponent(query.date) : "",
      venue: query?.venue ? decodeURIComponent(query.venue) : "",
      present: Number(query?.present || 0),
      absent: Number(query?.absent || 0),
      correction: query?.correction === "1",
    });
  },
  backToEvent() {
    wx.navigateBack({ delta: 2 });
  },
  done() {
    wx.navigateBack({ delta: 2 });
  },
});
