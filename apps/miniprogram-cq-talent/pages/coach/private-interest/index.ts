import { requireRole } from "../../../utils/auth";

interface TimeSlot {
  day: string;
  slots: Array<{ label: string; active: boolean }>;
}

const STORAGE_KEY = "coach-private-interest";

const WEEK_DAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const SLOT_LABELS = ["上午", "下午", "晚上"];

Page({
  data: {
    accepting: true,
    week: [] as TimeSlot[],
  },
  onLoad() {
    if (!requireRole("coach")) return;
    const saved = wx.getStorageSync(STORAGE_KEY) as { accepting?: boolean; active?: Record<string, boolean> } | "";
    const active = (saved && saved.active) || { "周六-上午": true, "周六-下午": true, "周日-上午": true };
    this.setData({
      accepting: saved && typeof saved.accepting === "boolean" ? saved.accepting : true,
      week: WEEK_DAYS.map((day) => ({
        day,
        slots: SLOT_LABELS.map((label) => ({
          label,
          active: Boolean(active[`${day}-${label}`]),
        })),
      })),
    });
  },
  toggleAccepting() {
    const accepting = !this.data.accepting;
    this.setData({ accepting });
    this.persist();
    wx.showToast({ title: accepting ? "已开启私教预约" : "已关闭私教预约", icon: "none" });
  },
  toggleSlot(event: { currentTarget: { dataset: { day: string; label: string } } }) {
    const { day, label } = event.currentTarget.dataset;
    const week = this.data.week.map((row: TimeSlot) =>
      row.day !== day ? row : {
        day: row.day,
        slots: row.slots.map((slot) => slot.label !== label ? slot : { ...slot, active: !slot.active }),
      },
    );
    this.setData({ week });
    this.persist();
  },
  persist() {
    const active: Record<string, boolean> = {};
    this.data.week.forEach((row: TimeSlot) => {
      row.slots.forEach((slot) => {
        if (slot.active) active[`${row.day}-${slot.label}`] = true;
      });
    });
    wx.setStorageSync(STORAGE_KEY, { accepting: this.data.accepting, active });
  },
});
