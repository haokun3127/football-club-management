import { mockRadar } from "../../../utils/mock";
import { openPage } from "../../../utils/navigation";

Page({
  data: {
    radar: mockRadar,
  },
  openMetric(event: { detail?: { metricId?: string } }) {
    wx.showToast({ title: `指标下钻待接入 ${event.detail?.metricId ?? ""}`, icon: "none" });
  },
  goSchedule() {
    openPage("/pages/parent/schedule/index");
  },
  goChild() {
    openPage("/pages/parent/child/index");
  },
});
