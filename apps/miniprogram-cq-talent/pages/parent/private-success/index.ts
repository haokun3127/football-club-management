import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";

interface PageData {
  coach: string;
  date: string;
  slot: string;
  goals: string;
}

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    coach: "",
    date: "",
    slot: "",
    goals: "",
  },
  onLoad(query: { coach?: string; date?: string; slot?: string; goals?: string }) {
    requireRole("parent");
    const decode = (value?: string) => {
      if (!value) return "";
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    this.setData({
      coach: decode(query.coach) || "待同步",
      date: decode(query.date),
      slot: decode(query.slot),
      goals: decode(query.goals),
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
