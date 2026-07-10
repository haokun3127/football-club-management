import { getSession } from "./store";
import type { AppRole } from "./types";

const HOME_BY_ROLE: Record<AppRole, string> = {
  parent: "/pages/parent/schedule/index",
  coach: "/pages/coach/schedule/index",
};

export function routeHome(role: AppRole) {
  wx.reLaunch({ url: HOME_BY_ROLE[role] });
}

export function requireRole(role: AppRole) {
  const session = getSession();
  if (!session) {
    wx.reLaunch({ url: "/pages/launch/index" });
    return null;
  }
  if (session.role !== role) {
    routeHome(session.role);
    return null;
  }
  return session;
}
