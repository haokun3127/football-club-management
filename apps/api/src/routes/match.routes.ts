import type { FastifyInstance } from "fastify";
import type { RecordMatchInput } from "@football-club/domain";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerMatchRoutes(app: FastifyInstance, context: RouteContext) {
  app.get<{
    Params: {
      clubId: string;
    };
    Querystring: {
      eventId?: string;
    };
  }>(
    "/clubs/:clubId/matches",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.matchDetailQuery,
        ...schemas.matchDetail,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }

      if (!request.query.eventId) {
        return context.sendError(reply, 400, "bad_request", "eventId query is required");
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      if (auth?.membership.roles.includes("parent")) {
        const event = (await context.store.listCalendarEvents(request.params.clubId) as Array<{ id: string; participants?: Array<{ studentId: string }> }>)
          .find((item) => item.id === request.query.eventId);
        const canRead = event?.participants?.some((participant) =>
          context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, participant.studentId),
        );
        if (!canRead) {
          return context.sendError(reply, 403, "forbidden", "Match is not accessible for this parent membership");
        }
      }

      const detail = await context.store.getMatchDetailByEvent(request.params.clubId, request.query.eventId);
      if (!detail) {
        return context.sendError(reply, 404, "not_found", "Match detail not found");
      }

      return detail;
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: Omit<RecordMatchInput, "clubId">;
  }>(
    "/clubs/:clubId/matches",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.recordMatch,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const result = await context.store.recordMatchSummary({
        ...request.body,
        clubId: request.params.clubId,
      });

      return reply.code(201).send(result);
    },
  );
}
