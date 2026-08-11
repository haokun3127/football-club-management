import type { ClubUserRole } from "@football-club/domain";
import type { ClubAppClient } from "../data-capability/types.js";

export type AppRole = "parent" | "coach";

const coachMembershipRoles = new Set<ClubUserRole>(["coach", "owner", "admin", "operator"]);

export function resolveAvailableAppRoles(
  membershipRoles: ClubUserRole[],
  client: Pick<ClubAppClient, "roleEntrypoints">,
): AppRole[] {
  const available: AppRole[] = [];

  if (membershipRoles.includes("parent") && hasEntrypoints(client, "parent")) {
    available.push("parent");
  }
  if (membershipRoles.some((role) => coachMembershipRoles.has(role)) && hasEntrypoints(client, "coach")) {
    available.push("coach");
  }

  return available;
}

export function resolveCompatibleAppRole(availableRoles: AppRole[]): AppRole | null {
  if (availableRoles.includes("coach")) {
    return "coach";
  }

  return availableRoles.includes("parent") ? "parent" : null;
}

function hasEntrypoints(client: Pick<ClubAppClient, "roleEntrypoints">, role: AppRole): boolean {
  const entrypoints = client.roleEntrypoints?.[role];
  return Array.isArray(entrypoints) && entrypoints.length > 0;
}
