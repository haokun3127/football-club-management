import type { ClubUserRole } from "@football-club/domain";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthContext, MembershipResolver } from "../auth/context.js";
import { sendError } from "../http/errors.js";
import type { ApiStore } from "../store.js";

type AccessRole = "admin" | "coach" | "parent";

const adminRoles = new Set<ClubUserRole>(["owner", "admin", "operator"]);

export interface RouteContext {
  store: ApiStore;
  membershipResolver?: MembershipResolver;
  resolveClubAuth(request: FastifyRequest, reply: FastifyReply, clubId: string): Promise<AuthContext | null>;
  requireClubMembership(request: FastifyRequest, reply: FastifyReply, clubId: string): Promise<boolean>;
  sendError: typeof sendError;
  requireClubRole(
    request: FastifyRequest,
    reply: FastifyReply,
    clubId: string,
    roles: AccessRole[],
  ): Promise<boolean>;
  requireStudentAccess(
    request: FastifyRequest,
    reply: FastifyReply,
    clubId: string,
    studentId: string,
    options?: { write?: boolean },
  ): Promise<boolean>;
}

export function createRouteContext(store: ApiStore, membershipResolver?: MembershipResolver): RouteContext {
  const resolveAuth = async (request: FastifyRequest, reply: FastifyReply, clubId: string): Promise<AuthContext | null> => {
    if (!membershipResolver) {
      return null;
    }

    const context = await membershipResolver.resolve(request, clubId);
    if (!context) {
      sendError(reply, 403, "club_membership_required", "Active club membership required");
      return null;
    }

    return context;
  };

  return {
    store,
    membershipResolver,
    sendError,
    resolveClubAuth: resolveAuth,
    async requireClubMembership(request, reply, clubId) {
      if (!membershipResolver) {
        return true;
      }

      return Boolean(await resolveAuth(request, reply, clubId));
    },
    async requireClubRole(request, reply, clubId, roles) {
      if (!membershipResolver) {
        return true;
      }

      const context = await resolveAuth(request, reply, clubId);
      if (!context) {
        return false;
      }

      if (!hasAnyRole(context, roles)) {
        sendError(reply, 403, "forbidden", "Club role is not permitted for this operation");
        return false;
      }

      return true;
    },
    async requireStudentAccess(request, reply, clubId, studentId, options) {
      if (!membershipResolver) {
        return true;
      }

      const context = await resolveAuth(request, reply, clubId);
      if (!context) {
        return false;
      }

      if (hasAnyRole(context, ["admin", "coach"])) {
        return true;
      }

      if (!options?.write && hasAnyRole(context, ["parent"]) && store.isGuardianOfStudent(clubId, context.user.id, studentId)) {
        return true;
      }

      sendError(reply, 403, "forbidden", "Student is not accessible for this membership");
      return false;
    },
  };
}

function hasAnyRole(context: AuthContext, roles: AccessRole[]): boolean {
  const membershipRoles = new Set(context.membership.roles);

  return roles.some((role) => {
    if (role === "admin") {
      return [...adminRoles].some((adminRole) => membershipRoles.has(adminRole));
    }

    return membershipRoles.has(role);
  });
}
