import type { AppRole } from "./app-roles.js";
import { resolveAvailableAppRoles } from "./app-roles.js";
import type { AuthContext } from "./context.js";
import type { ClubAppClient } from "../data-capability/types.js";
import type { ApiStore } from "../store.js";
export interface RolePreference {
  defaultRole: AppRole | null;
  lastActiveRole: AppRole | null;
}
export function chooseAutomaticRole(
  enterable: AppRole[],
  preference: RolePreference,
): AppRole | null {
  for (const role of [preference.lastActiveRole, preference.defaultRole])
    if (role && enterable.includes(role)) return role;
  return enterable.length === 1 ? enterable[0]! : null;
}
export async function automaticRoleScope(
  store: ApiStore,
  clubId: string,
  auth: AuthContext,
  client: ClubAppClient,
) {
  const authorized = resolveAvailableAppRoles(
    auth.membership.roles,
    client,
  ).filter((role) =>
    role === "parent"
      ? store
          .listParents(clubId)
          .some((parent) => parent.userId === auth.user.id)
      : store
          .listCoaches(clubId)
          .some(
            (coach) =>
              coach.userId === auth.user.id && coach.status === "active",
          ),
  );
  const hasChildren =
    authorized.includes("parent") &&
    (await store.listOperationalStudents(clubId)).some((student) =>
      store.isGuardianOfStudent(clubId, auth.user.id, student.id),
    );
  return {
    authorized,
    enterable: authorized.filter((role) => role !== "parent" || hasChildren),
  };
}
