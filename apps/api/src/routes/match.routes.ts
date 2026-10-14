import { coachTeamRole } from "../application/coach-scope.js";
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

      if (auth && !auth.membership.roles.some(role => ["owner", "admin", "operator"].includes(role)) && !auth.membership.roles.includes("parent")) {
        const event = await context.store.getCalendarEvent(request.query.eventId);
        const coach = context.store.listCoaches(request.params.clubId).find(item => item.userId === auth.user.id);
        if (!coach || !event || event.clubId !== request.params.clubId || !(event.ownerCoachId === coach.id || event.primaryTeamId && coachTeamRole(context.store, request.params.clubId, coach.id, event.primaryTeamId))) return context.sendError(reply, 403, "forbidden", "Match is outside coach scope");
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

      const event = await context.store.getCalendarEvent(request.body.eventId);
      if (!event || event.clubId !== request.params.clubId || event.type !== "match") return context.sendError(reply, 400, "invalid_match", "Match event required");
      if (context.membershipResolver) {
        const auth = await context.resolveClubAuth(request, reply, request.params.clubId); if (!auth) return reply;
        if (!auth.membership.roles.some(role => ["owner", "admin", "operator"].includes(role))) {
          const coach = context.store.listCoaches(request.params.clubId).find(item => item.userId === auth.user.id);
          if (!coach || !(event.ownerCoachId === coach.id || event.primaryTeamId && coachTeamRole(context.store, request.params.clubId, coach.id, event.primaryTeamId))) return context.sendError(reply, 403, "forbidden", "Match is outside coach scope");
        }
      }
      if (["league", "cup"].includes(request.body.matchType) && (!event.title.trim() || !event.locationId)) return context.sendError(reply, 400, "invalid_match", "Formal match title and venue required");
      const existing = await context.store.getMatchDetailByEvent(request.params.clubId, event.id);
      if (request.body.matchId && request.body.matchId !== existing?.match?.id) return context.sendError(reply, 409, "match_conflict", "Match identity does not belong to this event");
      try {
        const result = await context.store.recordMatchSummary({ ...request.body, matchId: existing?.match?.id, clubId: request.params.clubId });
        return reply.code(201).send(result);
      } catch (error) {
        if (error instanceof Error && ["Student not found for club.", "Team not found for club.", "Coach not found for club."].includes(error.message)) return context.sendError(reply, 400, "bad_request", error.message);
        return context.sendError(reply, 400, "invalid_match", "Match fields are invalid");
      }
    },
  );
}
