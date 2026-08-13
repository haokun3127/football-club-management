import type { AppRole } from "./types";

const ROLE_TABS: Record<AppRole, Record<string, string>> = {
  parent: {
    schedule: "/pages/parent/schedule/index",
    growth: "/pages/parent/growth/index",
    child: "/pages/parent/child/index",
    discover: "/pages/parent/content/index",
  },
  coach: {
    schedule: "/pages/coach/schedule/index",
    training: "/pages/coach/training/index",
    me: "/pages/coach/me/index",
  },
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
  const url = ROLE_TABS[role][key];
  if (url) openTab(url);
}
