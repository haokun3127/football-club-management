import type { AppRole } from "../../utils/types";

type TabItem = {
  key: string;
  label: string;
  path: string;
  activeIcon: string;
  inactiveIcon: string;
};

const LABELS: Record<AppRole, TabItem[]> = {
  parent: [
    { key: "schedule", label: "日程", path: "/pages/parent/schedule/index", activeIcon: "/assets/icons/tab-calendar-active.png", inactiveIcon: "/assets/icons/tab-calendar-inactive.png" },
    { key: "growth", label: "成长", path: "/pages/parent/growth/index", activeIcon: "/assets/icons/tab-growth-active.png", inactiveIcon: "/assets/icons/tab-growth-inactive.png" },
    { key: "child", label: "我的孩子", path: "/pages/parent/child/index", activeIcon: "/assets/icons/tab-child-active.png", inactiveIcon: "/assets/icons/tab-child-inactive.png" },
    { key: "discover", label: "发现", path: "/pages/parent/content/index", activeIcon: "/assets/icons/tab-discover-active.png", inactiveIcon: "/assets/icons/tab-discover-inactive.png" },
  ],
  coach: [
    { key: "schedule", label: "日程", path: "/pages/coach/schedule/index", activeIcon: "/assets/icons/tab-calendar-active.png", inactiveIcon: "/assets/icons/tab-calendar-inactive.png" },
    { key: "training", label: "训练管理", path: "/pages/coach/training/index", activeIcon: "/assets/icons/tab-training-active.png", inactiveIcon: "/assets/icons/tab-training-inactive.png" },
    { key: "me", label: "我的", path: "/pages/coach/me/index", activeIcon: "/assets/icons/tab-user-active.png", inactiveIcon: "/assets/icons/tab-user-inactive.png" },
  ],
};

function buildItems(role: AppRole, active: string): Array<TabItem & { icon: string }> {
  return (LABELS[role] ?? LABELS.parent).map((item) => ({
    ...item,
    icon: item.key === active ? item.activeIcon : item.inactiveIcon,
  }));
}

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
    items: buildItems("parent", "schedule"),
  },
  observers: {
    role(this: any, value: AppRole) {
      this.setData({ items: buildItems(value, this.data.active as string) });
    },
    active(this: any, value: string) {
      this.setData({ items: buildItems(this.data.role as AppRole, value) });
    },
  },
  lifetimes: {
    attached(this: any) {
      const role = this.data.role as AppRole;
      this.setData({ items: buildItems(role, this.data.active as string) });
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
