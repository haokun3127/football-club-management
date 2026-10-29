import type { CalendarEvent } from "@football-club/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { resolveAvailableAppRoles } from "../auth/app-roles.js";
import {
  createTrainingGame,
  parentTrainingGames,
  sourceAdjusted,
  TrainingGameError,
  trainingGameContext,
  trainingGamesEnabled,
  updateTrainingGame,
  type TrainingGameUpdate,
} from "../application/training-games.js";
import { coachTeamRole } from "../application/coach-scope.js";
import { trainingGameSchemas } from "../http/training-game-schemas.js";
import type { RouteContext } from "./context.js";

type Params = {
  clubId: string;
  clientId: string;
  eventId: string;
  gameId: string;
};
const presentEvent = (event: CalendarEvent) => ({
  id: event.id,
  title: event.title,
  startsAt: event.timeRange.startsAt,
  status: event.status,
  teamId: event.primaryTeamId ?? null,
});
export async function registerTrainingGameRoutes(
  app: FastifyInstance,
  context: RouteContext,
) {
  const { store } = context;
  const base =
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-games";
  async function identity(
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
    role: "coach" | "parent",
  ) {
    if (!context.membershipResolver) {
      context.sendError(
        reply,
        401,
        "authentication_required",
        "需要登录后访问",
      );
      return null;
    }
    const auth = await context.resolveClubAuth(
      request,
      reply,
      request.params.clubId,
    );
    if (!auth) return null;
    const client = (await store.listClubAppClients(request.params.clubId)).find(
      (item) => item.id === request.params.clientId && item.status === "active",
    );
    if (
      !client ||
      !resolveAvailableAppRoles(auth.membership.roles, client).includes(role) ||
      (auth.appClientSession && auth.appClientSession.activeRole !== role)
    ) {
      context.sendError(
        reply,
        403,
        "forbidden",
        `请使用获准的${role === "coach" ? "教练" : "家长"}身份`,
      );
      return null;
    }
    return auth;
  }
  async function coachScope(
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply,
  ) {
    const auth = await identity(request, reply, "coach");
    if (!auth) return null;
    const event = await store.getCalendarEvent(request.params.eventId);
    if (!event || event.clubId !== request.params.clubId) {
      context.sendError(reply, 404, "not_found", "课程不存在");
      return null;
    }
    const workbench = (await store.getCoachToday(event.clubId, {
      date: event.timeRange.startsAt.slice(0, 10),
      userId: auth.user.id,
      roles: auth.membership.roles,
    })) as { events: Array<{ id: string }> };
    if (!workbench.events.some((item) => item.id === event.id)) {
      context.sendError(reply, 403, "forbidden", "无权访问该训练课");
      return null;
    }
    if (event.type !== "training") {
      context.sendError(
        reply,
        400,
        "training_game_event_required",
        "该活动不是训练课",
      );
      return null;
    }
    return { auth, event };
  }
  function writable(reply: FastifyReply, clubId: string) {
    if (trainingGamesEnabled(clubId)) return true;
    context.sendError(
      reply,
      409,
      "training_games_disabled",
      "训练内友谊赛记录尚未启用",
    );
    return false;
  }
  function fail(reply: FastifyReply, error: unknown) {
    if (error instanceof TrainingGameError)
      return context.sendError(reply, error.status, error.code, error.message);
    throw error;
  }
  app.get<{ Params: Params }>(
    base,
    { schema: trainingGameSchemas.list },
    async (request, reply) => {
      const scope = await coachScope(request, reply);
      if (!scope) return reply;
      const details = trainingGameContext(store, scope.event);
      const enabled = trainingGamesEnabled(scope.event.clubId);
      return {
        enabled,
        canEdit: enabled && scope.event.status !== "cancelled",
        event: presentEvent(scope.event),
        ...details,
        games: store.trainingGames
          .list(scope.event.clubId, scope.event.id)
          .map((game) => ({
            ...game,
            sourceAdjusted: sourceAdjusted(game, details),
          })),
      };
    },
  );
  app.get<{ Params: Params }>(
    `${base}/:gameId`,
    { schema: trainingGameSchemas.detail },
    async (request, reply) => {
      const scope = await coachScope(request, reply);
      if (!scope) return reply;
      const game = store.trainingGames.get(
        scope.event.clubId,
        request.params.gameId,
      );
      if (!game || game.eventId !== scope.event.id)
        return context.sendError(reply, 404, "not_found", "记录不存在");
      const history = store.trainingGames
        .history(scope.event.clubId, game.id)
        .map((row) => ({
          revision: row.revision,
          changedAt: row.changedAt,
          reason: row.reason,
          state: row.snapshot.state,
          scoreA: row.snapshot.scoreA,
          scoreB: row.snapshot.scoreB,
          participantCount: row.snapshot.participants.length,
          eventCount: row.snapshot.events.length,
        }));
      return {
        game: {
          ...game,
          sourceAdjusted: sourceAdjusted(
            game,
            trainingGameContext(store, scope.event),
          ),
        },
        history,
      };
    },
  );
  app.post<{ Params: Params; Body: Parameters<typeof createTrainingGame>[2] }>(
    base,
    { schema: trainingGameSchemas.create },
    async (request, reply) => {
      const scope = await coachScope(request, reply);
      if (!scope || !writable(reply, request.params.clubId)) return reply;
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      try {
        return {
          game: createTrainingGame(
            store,
            scope.event,
            request.body,
            scope.auth.user.id,
          ),
        };
      } catch (error) {
        return fail(reply, error);
      }
    },
  );
  app.patch<{ Params: Params; Body: TrainingGameUpdate }>(
    `${base}/:gameId`,
    { schema: trainingGameSchemas.update },
    async (request, reply) => {
      const scope = await coachScope(request, reply);
      if (!scope || !writable(reply, request.params.clubId)) return reply;
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      try {
        return {
          game: updateTrainingGame(
            store,
            scope.event,
            request.params.gameId,
            request.body,
            scope.auth.user.id,
          ),
        };
      } catch (error) {
        return fail(reply, error);
      }
    },
  );
  app.get<{ Params: Params; Querystring: { studentId: string } }>(
    "/clubs/:clubId/app-clients/:clientId/parent/events/:eventId/training-games",
    { schema: trainingGameSchemas.parent },
    async (request, reply) => {
      const auth = await identity(request, reply, "parent");
      if (!auth) return reply;
      const { clubId, eventId } = request.params;
      const { studentId } = request.query;
      const event = await store.getCalendarEvent(eventId);
      if (
        !store.isGuardianOfStudent(clubId, auth.user.id, studentId) ||
        !event ||
        event.clubId !== clubId ||
        event.type !== "training" ||
        !store
          .listEventParticipants(clubId)
          .some(
            (item) => item.eventId === eventId && item.studentId === studentId,
          )
      )
        return context.sendError(
          reply,
          403,
          "forbidden",
          "无权查看该孩子的课程记录",
        );
      return {
        enabled: trainingGamesEnabled(clubId),
        games: parentTrainingGames(store, event, studentId),
      };
    },
  );
  app.get<{ Params: Params; Querystring: { teamId: string } }>(
    "/clubs/:clubId/app-clients/:clientId/coach/training-games",
    { schema: trainingGameSchemas.directory },
    async (request, reply) => {
      const auth = await identity(request, reply, "coach");
      if (!auth) return reply;
      const clubId = request.params.clubId,
        teamId = request.query.teamId;
      const team = store.listTeams(clubId).find((item) => item.id === teamId);
      const coach = store
        .listCoaches(clubId)
        .find(
          (item) => item.userId === auth.user.id && item.status === "active",
        );
      const admin = auth.membership.roles.some((role) =>
        ["owner", "admin", "operator"].includes(role),
      );
      if (
        !team ||
        (!admin && (!coach || !coachTeamRole(store, clubId, coach.id, teamId)))
      )
        return context.sendError(reply, 403, "forbidden", "无权查看该球队记录");
      const events = (
        (await store.listCalendarEvents(clubId)) as CalendarEvent[]
      ).filter(
        (item) => item.primaryTeamId === teamId && item.type === "training",
      );
      return {
        enabled: trainingGamesEnabled(clubId),
        games: store.trainingGames
          .list(clubId)
          .flatMap((game) => {
            const event = events.find((item) => item.id === game.eventId);
            return event
              ? [
                  {
                    game: {
                      ...game,
                      sourceAdjusted: sourceAdjusted(
                        game,
                        trainingGameContext(store, event),
                      ),
                    },
                    event: presentEvent(event),
                  },
                ]
              : [];
          })
          .sort(
            (a, b) =>
              b.event.startsAt.localeCompare(a.event.startsAt) ||
              a.game.id.localeCompare(b.game.id),
          ),
      };
    },
  );
}
