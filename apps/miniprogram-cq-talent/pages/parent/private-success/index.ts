import { requireRole } from "../../../utils/auth";

interface PageData {
  coach: string;
  date: string;
  slot: string;
  goals: string;
}

Page<PageData>({
  data: {
    coach: "",
    date: "",
    slot: "",
    goals: "",
  },
  onLoad(query: { coach?: string; date?: string; slot?: string; goals?: string }) {
    requireRole("parent");
    this.setData({
      coach: query.coach || "待同步",
      date: query.date || "",
      slot: query.slot || "",
      goals: query.goals || "",
    });
  },
  backToSchedule() {
    wx.reLaunch({ url: "/pages/parent/schedule/index" });
  },
  backToChild() {
    wx.navigateBack({ delta: 2 });
  },
  goBack() { wx.navigateBack(); },
});
