import { DEV_IDENTITY_ROLE, STORAGE_KEYS } from "./config";
import type { AppContext, AppRole, SessionState } from "./types";

let appContext: AppContext | null = null;
let sessionState: SessionState | null = null;

export function restoreAppState() {
  getAppContext();
  getSession();
}

export function setAppContext(context: AppContext) {
  appContext = context;
  wx.setStorageSync(STORAGE_KEYS.context, context);
}

export function getAppContext() {
  if (appContext) return appContext;
  const stored = wx.getStorageSync<AppContext | "">(STORAGE_KEYS.context);
  appContext = stored || null;
  return appContext;
}

export function setSession(session: SessionState) {
  sessionState = session;
  setAppContext(session);
  wx.setStorageSync(STORAGE_KEYS.session, session);
}

export function getSession() {
  if (sessionState) return sessionState;
  const stored = wx.getStorageSync<SessionState | "">(STORAGE_KEYS.session);
  sessionState = stored || null;
  return sessionState;
}

export function clearSession() {
  sessionState = null;
  wx.removeStorageSync(STORAGE_KEYS.session);
}

export function setCurrentStudentId(studentId: string) {
  const session = getSession();
  if (!session) return;
  setSession({ ...session, currentStudentId: studentId });
}

export function getDevRole(): AppRole {
  const stored = wx.getStorageSync<AppRole | "">(STORAGE_KEYS.devRole);
  return stored || DEV_IDENTITY_ROLE;
}

export function toggleDevRole(): AppRole {
  const next = getDevRole() === "parent" ? "coach" : "parent";
  wx.setStorageSync(STORAGE_KEYS.devRole, next);
  clearSession();
  return next;
}
