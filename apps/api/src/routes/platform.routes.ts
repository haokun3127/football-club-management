import type { FastifyInstance } from "fastify";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerPlatformRoutes(app: FastifyInstance, context: RouteContext) {
  app.get("/health", { schema: schemas.health }, async () => context.store.getHealth());

  app.get("/clubs", { schema: schemas.clubsResponse }, async () => context.store.listClubs());

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
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      const config = await context.store.getClubConfig(request.params.clubId);

      if (!config) {
        return reply.code(404).send({ error: "Club not found" });
      }

      return config;
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: Parameters<RouteContext["store"]["createTeam"]>[0];
  }>(
    "/clubs/:clubId/teams",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.createTeam,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.createTeam({
        ...request.body,
        clubId: request.params.clubId,
      });
    },
  );

  app.post<{
    Params: {
      clubId: string;
      teamId: string;
    };
    Body: Omit<Parameters<RouteContext["store"]["joinTeam"]>[0], "clubId" | "teamId">;
  }>(
    "/clubs/:clubId/teams/:teamId/members",
    {
      schema: {
        ...schemas.clubTeamParams,
        ...schemas.joinTeam,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.joinTeam({
        ...request.body,
        clubId: request.params.clubId,
        teamId: request.params.teamId,
      });
    },
  );
}
