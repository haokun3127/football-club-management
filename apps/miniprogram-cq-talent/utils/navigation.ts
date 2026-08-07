import type { AppRole } from "./types";

const ROLE_TABS: Record<AppRole, Record<string, string>> = {
  parent: {
    schedule: "/pages/parent/schedule/index",
    growth: "/pages/parent/growth/index",
    child: "/pages/parent/child/index",
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
      console.warn("[navigation] openPage navigateTo failed", {
        url,
        errMsg: err?.errMsg,
        pageStackDepth: getCurrentPages().length,
      });
    },
  });
}

export function openRoleTab(role: AppRole, key: string) {
  const url = ROLE_TABS[role][key];
  if (url) openPage(url);
}
