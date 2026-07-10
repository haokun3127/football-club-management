import type { AppRole } from "../../utils/types";

const LABELS: Record<AppRole, Array<{ key: string; label: string; path: string }>> = {
  parent: [
    { key: "schedule", label: "日程", path: "/pages/parent/schedule/index" },
    { key: "growth", label: "成长", path: "/pages/parent/growth/index" },
    { key: "child", label: "我的孩子", path: "/pages/parent/child/index" },
  ],
  coach: [
    { key: "schedule", label: "日程", path: "/pages/coach/schedule/index" },
    { key: "training", label: "训练管理", path: "/pages/coach/training/index" },
    { key: "me", label: "我的", path: "/pages/coach/me/index" },
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
