import { STORAGE_KEYS } from "./config";
import type { AppContext, SessionState } from "./types";

let appContext: AppContext | null = null;
let sessionState: SessionState | null = null;

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
