import { openPage } from "../../../utils/navigation";

Page({
  data: {
    taskTitle: "能力评估",
    studentCount: 0,
    dateLabel: "今天",
  },
  onLoad(query: { title?: string; count?: string }) {
    this.setData({
      taskTitle: query?.title ? decodeURIComponent(query.title) : "能力评估",
      studentCount: Number(query?.count || 0),
    });
  },
  viewResults() {
    openPage("/pages/coach/team-ability/index");
  },
  backToList() {
    wx.navigateBack({ delta: 2 });
  },
});
