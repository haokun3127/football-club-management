import type { FastifyReply, FastifyRequest } from "fastify";
import type { MembershipResolver } from "../auth/context.js";
import type { ApiStore } from "../store.js";

export interface RouteContext {
  store: ApiStore;
  membershipResolver?: MembershipResolver;
  requireClubMembership(request: FastifyRequest, reply: FastifyReply, clubId: string): Promise<boolean>;
}

export function createRouteContext(store: ApiStore, membershipResolver?: MembershipResolver): RouteContext {
  return {
    store,
    membershipResolver,
    async requireClubMembership(request, reply, clubId) {
      if (!membershipResolver) {
        return true;
      }

      const context = await membershipResolver.resolve(request, clubId);

      if (!context) {
        await reply.code(403).send({ error: "Active club membership required" });
        return false;
      }

      return true;
    },
  };
}
