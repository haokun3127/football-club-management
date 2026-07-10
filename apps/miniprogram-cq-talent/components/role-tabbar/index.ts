import type { AppRole } from "../../utils/types";

const LABELS: Record<AppRole, Array<{ key: string; label: string; path: string; icon: string }>> = {
  parent: [
    { key: "schedule", label: "日程", path: "/pages/parent/schedule/index", icon: "/assets/icons/tab-calendar.svg" },
    { key: "growth", label: "成长", path: "/pages/parent/growth/index", icon: "/assets/icons/tab-growth.svg" },
    { key: "child", label: "孩子", path: "/pages/parent/child/index", icon: "/assets/icons/tab-child.svg" },
  ],
  coach: [
    { key: "schedule", label: "工作台", path: "/pages/coach/schedule/index", icon: "/assets/icons/tab-calendar.svg" },
    { key: "training", label: "训练", path: "/pages/coach/training/index", icon: "/assets/icons/tab-training.svg" },
    { key: "me", label: "我的", path: "/pages/coach/me/index", icon: "/assets/icons/tab-user.svg" },
  ],
};

Component({
  properties: {
    role: {
      type: String,
      value: "parent",
    },
    active: {
      type: String,
      value: "schedule",
    },
  },
  data: {
    items: LABELS.parent,
  },
  observers: {
    role(this: any, value: AppRole) {
      this.setData({ items: LABELS[value] ?? LABELS.parent });
    },
  },
  lifetimes: {
    attached(this: any) {
      const role = this.data.role as AppRole;
      this.setData({ items: LABELS[role] ?? LABELS.parent });
    },
  },
  methods: {
    handleTap(this: any, event: { currentTarget: { dataset: { key?: string; path?: string } } }) {
      const { key, path } = event.currentTarget.dataset;
      if (!path || key === this.data.active) return;
      wx.reLaunch({ url: path });
    },
  },
});
