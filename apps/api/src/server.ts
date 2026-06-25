import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { MembershipResolver } from "./auth/context.js";
import { schemas } from "./http/schemas.js";
import { InMemoryStore, type ApiStore } from "./store.js";

export interface ServerOptions {
  logger?: boolean;
  membershipResolver?: MembershipResolver;
}

export function buildServer(store: ApiStore = new InMemoryStore(), options: ServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  async function requireClubMembership(
    request: FastifyRequest,
    reply: FastifyReply,
    clubId: string,
  ): Promise<boolean> {
    if (!options.membershipResolver) {
      return true;
    }

    const context = await options.membershipResolver.resolve(request, clubId);

    if (!context) {
      await reply.code(403).send({ error: "Active club membership required" });
      return false;
    }

    return true;
  }

  app.get("/health", { schema: schemas.health }, async () => store.getHealth());

  app.get("/clubs", { schema: schemas.clubsResponse }, async () => store.listClubs());

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/config",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.clubConfig,
      },
    },
    async (request, reply) => {
      if (!await requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      const config = await store.getClubConfig(request.params.clubId);

      if (!config) {
        return reply.code(404).send({ error: "Club not found" });
      }

      return config;
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/calendar/events",
    { schema: schemas.clubParams },
    async (request, reply) => {
      if (!await requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return store.listCalendarEvents(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/students/:studentId/timeline",
    { schema: schemas.clubStudentParams },
    async (request, reply) => {
      if (!await requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return store.getStudentTimeline(request.params.clubId, request.params.studentId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/catalog/ability-metrics",
    { schema: schemas.clubParams },
    async (request, reply) => {
      if (!await requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return store.listAbilityMetrics(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/students/:studentId/metrics",
    { schema: schemas.clubStudentParams },
    async (request, reply) => {
      if (!await requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return store.getStudentMetrics(request.params.clubId, request.params.studentId);
    },
  );

  app.post<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/students/:studentId/derived-metrics/attacking-contribution",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.derivedMetric,
      },
    },
    async (request, reply) => {
      if (!await requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return store.computeAttackingContribution(request.params.clubId, request.params.studentId);
    },
  );

  return app;
}
