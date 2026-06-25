import type { FastifyInstance } from "fastify";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerTrainingRoutes(app: FastifyInstance, context: RouteContext) {
  app.post<{
    Params: {
      clubId: string;
    };
    Body: Parameters<RouteContext["store"]["createTrainingSession"]>[1];
  }>(
    "/clubs/:clubId/training/sessions",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.createTrainingSession,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.createTrainingSession(request.params.clubId, request.body);
    },
  );
}
