import type { FastifyInstance } from "fastify";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerTrainingRoutes(app: FastifyInstance, context: RouteContext) {
  app.get<{
    Params: {
      clubId: string;
    };
    Querystring: {
      eventId?: string;
    };
  }>(
    "/clubs/:clubId/training/sessions",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.trainingSessionQuery,
        ...schemas.trainingSessionList,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      if (request.query.eventId) {
        const session = await context.store.getTrainingSessionByEvent(request.params.clubId, request.query.eventId);
        return session ? [session] : [];
      }

      return context.sendError(reply, 400, "bad_request", "eventId query is required");
    },
  );

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
    };
    Body: { eventId: string; kind?: "team" | "small_group" | "private" | "specialty"; sessionPlanId?: string; intensity?: "low" | "medium" | "high" };
  }>(
    "/clubs/:clubId/training/sessions/ensure",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.ensureTrainingSession,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      try {
        const session = await context.store.ensureTrainingSessionForEvent(
          request.params.clubId,
          request.body.eventId,
          request.body,
        );
        return reply.code(201).send(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Training session initialization failed";
        return context.sendError(reply, 400, "bad_request", message);
      }
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
