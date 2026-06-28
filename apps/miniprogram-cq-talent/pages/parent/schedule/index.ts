import { mockEvents } from "../../../utils/mock";
import { openPage } from "../../../utils/navigation";

Page({
  data: {
    events: mockEvents,
  },
  openEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    wx.showToast({ title: `活动详情待接入 ${event.currentTarget.dataset.id ?? ""}`, icon: "none" });
  },
  goGrowth() {
    openPage("/pages/parent/growth/index");
  },
  goChild() {
    openPage("/pages/parent/child/index");
  },
});
