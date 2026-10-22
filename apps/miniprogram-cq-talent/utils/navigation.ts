import type { AppRole } from "./types";

export type TabItem = {
  key: string;
  label: string;
  path: string;
  activeIcon: string;
  inactiveIcon: string;
};

export const ROLE_TABS: Record<AppRole, TabItem[]> = {
  parent: [
    { key: "home", label: "首页", path: "/pages/parent/home/index", activeIcon: "/assets/icons/tab-discover-active.png", inactiveIcon: "/assets/icons/tab-discover-inactive.png" },
    { key: "schedule", label: "日程", path: "/pages/parent/schedule/index", activeIcon: "/assets/icons/tab-calendar-active.png", inactiveIcon: "/assets/icons/tab-calendar-inactive.png" },
    { key: "growth", label: "成长", path: "/pages/parent/growth/index", activeIcon: "/assets/icons/tab-growth-active.png", inactiveIcon: "/assets/icons/tab-growth-inactive.png" },
    { key: "child", label: "我的", path: "/pages/parent/child/index", activeIcon: "/assets/icons/tab-user-active.png", inactiveIcon: "/assets/icons/tab-user-inactive.png" },
  ],
  coach: [
    { key: "schedule", label: "日程", path: "/pages/coach/schedule/index", activeIcon: "/assets/icons/tab-calendar-active.png", inactiveIcon: "/assets/icons/tab-calendar-inactive.png" },
    { key: "training", label: "球队", path: "/pages/coach/training/index", activeIcon: "/assets/icons/tab-training-active.png", inactiveIcon: "/assets/icons/tab-training-inactive.png" },
    { key: "me", label: "我的", path: "/pages/coach/me/index", activeIcon: "/assets/icons/tab-user-active.png", inactiveIcon: "/assets/icons/tab-user-inactive.png" },
  ],
};

export function openPage(url: string) {
  wx.navigateTo({
    url,
    fail: (err) => {
      console.warn("[navigation] openPage navigateTo failed, falling back to reLaunch", {
        url,
        errMsg: err?.errMsg,
        pageStackDepth: getCurrentPages().length,
      });
      wx.reLaunch({ url });
    },
  });
}

export function openTab(url: string) {
  wx.reLaunch({ url });
}

export function openRoleTab(role: AppRole, key: string) {
  const url = ROLE_TABS[role].find(item => item.key === key)?.path
    ?? (role === "parent" && key === "discover" ? "/pages/parent/content/index" : undefined);
  if (url) openTab(url);
}
