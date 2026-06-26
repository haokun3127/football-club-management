import type { FastifyInstance } from "fastify";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerCalendarRoutes(app: FastifyInstance, context: RouteContext) {
  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/calendar/events",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.calendarEvents,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }

      return context.store.listCalendarEvents(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/students/:studentId/timeline",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.studentTimeline,
      },
    },
    async (request, reply) => {
      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      return context.store.getStudentTimeline(request.params.clubId, request.params.studentId);
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: Parameters<RouteContext["store"]["createCalendarEvent"]>[1];
  }>(
    "/clubs/:clubId/admin/calendar/events",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.createCalendarEvent,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      return context.store.createCalendarEvent(request.params.clubId, request.body);
    },
  );

  app.put<{
    Params: {
      clubId: string;
      eventId: string;
    };
    Body: {
      participants: Parameters<RouteContext["store"]["recordEventParticipants"]>[2];
    };
  }>(
    "/clubs/:clubId/admin/calendar/events/:eventId/participants",
    {
      schema: {
        ...schemas.clubEventParams,
        ...schemas.eventParticipants,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      return context.store.recordEventParticipants(
        request.params.clubId,
        request.params.eventId,
        request.body.participants,
      );
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: Parameters<RouteContext["store"]["checkScheduleConflicts"]>[1];
  }>(
    "/clubs/:clubId/admin/calendar/conflicts",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.scheduleConflicts,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      return context.store.checkScheduleConflicts(request.params.clubId, request.body);
    },
  );
}
