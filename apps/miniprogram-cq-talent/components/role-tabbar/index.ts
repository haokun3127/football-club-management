import { ROLE_TABS, type TabItem } from "../../utils/navigation";
import type { AppRole } from "../../utils/types";

function buildItems(role: AppRole, active: string): Array<TabItem & { icon: string }> {
  return (ROLE_TABS[role] ?? ROLE_TABS.parent).map((item) => ({
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
    flow: {
      type: Boolean,
      value: false,
    },
    theme: {
      type: String,
      value: "light",
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
    handleChange(event: { detail: { value?: string } }) {
      const item = (this.data.items as Array<TabItem>).find((entry) => entry.key === event.detail.value);
      if (item && item.key !== this.data.active) wx.reLaunch({ url: item.path });
    },
    handleTap(this: any, event: { currentTarget: { dataset: { key?: string; path?: string } } }) {
      const { key } = event.currentTarget.dataset;
      const item = (this.data.items as TabItem[]).find(entry => entry.key === key);
      if (item && key !== this.data.active) wx.reLaunch({ url: item.path });
    },
  },
});
