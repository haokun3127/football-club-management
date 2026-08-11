import { DEV_DISPLAY_NAMES, DEV_USER_IDS } from "./config";
import type { AppContext, AppRole, SessionState } from "./types";

export function createDevSession(context: AppContext, role: AppRole): SessionState {
  return {
    ...context,
    role,
    availableRoles: [role],
    token: `dev-${role}-session`,
    userId: DEV_USER_IDS[role],
    displayName: DEV_DISPLAY_NAMES[role],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
