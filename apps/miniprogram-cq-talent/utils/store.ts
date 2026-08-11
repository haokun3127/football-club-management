import { DEV_IDENTITY_ROLE, STORAGE_KEYS } from "./config";
import type { AppContext, AppRole, LoginResult, SessionState } from "./types";

let appContext: AppContext | null = null;
let sessionState: SessionState | null = null;
type StoredSessionState = Omit<SessionState, "availableRoles"> & { availableRoles?: AppRole[] };

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

export function setSession(session: StoredSessionState) {
  sessionState = normalizeSession(session);
  setAppContext(sessionState);
  wx.setStorageSync(STORAGE_KEYS.session, sessionState);
}

export function getSession() {
  if (!sessionState) {
    const stored = wx.getStorageSync<StoredSessionState | "">(STORAGE_KEYS.session);
    sessionState = stored ? normalizeSession(stored) : null;
    if (sessionState && sessionState !== stored) {
      wx.setStorageSync(STORAGE_KEYS.session, sessionState);
    }
  }
  if (sessionState?.expiresAt && Date.parse(sessionState.expiresAt) <= Date.now()) {
    clearSession();
  }
  return sessionState;
}

export function persistAuthenticatedSession(result: LoginResult) {
  if (
    result.status !== "authenticated"
    || !result.session?.activeRole
    || !result.profile
    || !result.client?.id
    || !result.availableRoles.includes(result.session.activeRole)
  ) {
    return null;
  }

  const session: SessionState = {
    clubId: result.clubId,
    clientId: result.client.id,
    capabilities: result.capabilities,
    role: result.session.activeRole,
    availableRoles: result.availableRoles,
    token: result.session.token,
    userId: result.profile.userId,
    displayName: result.profile.displayName,
    currentStudentId: result.children[0]?.id,
    expiresAt: result.session.expiresAt,
  };
  setSession(session);
  return session;
}

export function clearSession() {
  sessionState = null;
  appContext = null;
  wx.removeStorageSync(STORAGE_KEYS.session);
  wx.removeStorageSync(STORAGE_KEYS.context);
  wx.removeStorageSync(STORAGE_KEYS.devRole);
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

function normalizeSession(session: StoredSessionState): SessionState {
  const availableRoles = normalizeAvailableRoles(session.availableRoles, session.role);
  if (session.availableRoles && availableRoles === session.availableRoles) {
    return session as SessionState;
  }
  return { ...session, availableRoles };
}

function normalizeAvailableRoles(value: unknown, fallback: AppRole): AppRole[] {
  if (Array.isArray(value)) {
    const roles = value.filter((role): role is AppRole => role === "parent" || role === "coach");
    if (roles.length) return roles;
  }
  return [fallback];
}
