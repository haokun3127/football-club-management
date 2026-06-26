import type { FastifyReply, FastifyRequest } from "fastify";
import type { MembershipResolver } from "../auth/context.js";
import { sendError } from "../http/errors.js";
import type { ApiStore } from "../store.js";

export interface RouteContext {
  store: ApiStore;
  membershipResolver?: MembershipResolver;
  requireClubMembership(request: FastifyRequest, reply: FastifyReply, clubId: string): Promise<boolean>;
  sendError: typeof sendError;
}

export function createRouteContext(store: ApiStore, membershipResolver?: MembershipResolver): RouteContext {
  return {
    store,
    membershipResolver,
    sendError,
    async requireClubMembership(request, reply, clubId) {
      if (!membershipResolver) {
        return true;
      }

      const context = await membershipResolver.resolve(request, clubId);

      if (!context) {
        await sendError(reply, 403, "forbidden", "Active club membership required");
        return false;
      }

      return true;
    },
  };
}
