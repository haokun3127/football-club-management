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
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      return context.store.createTrainingSession(request.params.clubId, request.body);
    },
  );

  app.post<{
    Params: {
      clubId: string;
      trainingSessionId: string;
    };
    Body: Parameters<RouteContext["store"]["recordTrainingObservation"]>[2];
  }>(
    "/clubs/:clubId/training/sessions/:trainingSessionId/observations",
    {
      schema: {
        ...schemas.clubTrainingSessionParams,
        ...schemas.recordTrainingObservation,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      return reply.code(201).send(context.store.recordTrainingObservation(
        request.params.clubId,
        request.params.trainingSessionId,
        request.body,
      ));
    },
  );
}
