import { DEV_USER_IDS } from "./config";
import type { AppContext, AppRole, SessionState } from "./types";

export function createDevSession(context: AppContext, role: AppRole): SessionState {
  return {
    ...context,
    role,
    token: `dev-${role}-session`,
    userId: DEV_USER_IDS[role],
    displayName: role === "parent" ? "已绑定家长" : "已绑定教练",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
