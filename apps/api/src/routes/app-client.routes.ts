import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { formationTemplates, validateTacticalBoardPlayers, type ClubUserRole, type TacticalBoardPlayer } from "@football-club/domain";
import type { RecordAssessmentInput, RecordMatchInput } from "@football-club/domain";
import type { PrivacyRequestCreateInput } from "../data-capability/types.js";
import type { ClubAppClient, StudentDetail, StudentListItem } from "../data-capability/types.js";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

type AppRole = "parent" | "coach";

interface AppEventDetail {
  id: string;
  clubId: string;
  type: string;
  title: string;
  timeRange: {
    startsAt: string;
    endsAt: string;
  };
  status: string;
  participants?: Array<{
    studentId: string;
    status?: string;
  }>;
  [key: string]: unknown;
}

const adminRoles = new Set<ClubUserRole>(["owner", "admin", "operator"]);

interface ParentReminder {
  id: string;
  type: "event_upcoming" | "insurance_expiring" | "lesson_credit_low";
  severity: "info" | "warning" | "urgent";
  studentId: string;
  studentName: string;
  dueAt: string;
  event?: {
    id: string;
    type: string;
    title: string;
    startsAt: string;
    endsAt: string;
  };
  insurance?: {
    status: "expiring" | "expired";
    expiresAt?: string;
  };
  lessonCredit?: {
    balance: number;
  };
}

export async function registerAppClientRoutes(app: FastifyInstance, context: RouteContext) {
  app.get<{ Params: { clubId: string; clientId: string } }>(
    "/clubs/:clubId/app-clients/:clientId/coach/tactical-board/formations",
    { schema: { ...schemas.appClientParams } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) return reply;
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) return reply;
      return { clubId: request.params.clubId, formations: formationTemplates };
    },
  );

  app.get<{ Params: { clubId: string; clientId: string; eventId: string } }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board",
    { schema: { ...schemas.appClientEventParams } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) return reply;
      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) return reply;
      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[]).find((item) => item.id === request.params.eventId);
      if (!event) return context.sendError(reply, 404, "not_found", "Event not found");
      if (event.type !== "match") return context.sendError(reply, 400, "invalid_tactical_board_event", "Tactical board is only available for match events");
      const roster = await tacticalBoardRoster(context, request.params.clubId, event);
      const saved = await context.store.getTacticalBoard(request.params.clubId, event.id);
      return {
        event: { id: event.id, title: event.title, status: event.status },
        board: saved ?? createInitialTacticalBoard(request.params.clubId, event.id, roster),
        roster,
        saved: Boolean(saved),
        readOnly: ["completed", "cancelled", "canceled"].includes(event.status),
      };
    },
  );

  app.put<{
    Params: { clubId: string; clientId: string; eventId: string };
    Body: { formationName: string; players: TacticalBoardPlayer[] };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/tactical-board",
    { schema: {
      ...schemas.appClientEventParams,
      body: {
        type: "object", additionalProperties: false, required: ["formationName", "players"],
        properties: {
          formationName: { type: "string", minLength: 1 },
          players: { type: "array", maxItems: 200, items: { type: "object", additionalProperties: false, required: ["studentId", "displayName", "role", "x", "y"], properties: {
            studentId: { type: "string", minLength: 1 }, displayName: { type: "string", minLength: 1 }, avatarUrl: { type: "string" },
            role: { type: "string", enum: ["starter", "substitute", "reserve"] }, positionLabel: { type: "string" },
            x: { type: "number", minimum: 0, maximum: 1 }, y: { type: "number", minimum: 0, maximum: 1 },
          } } },
        },
      },
    } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) return reply;
      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) return reply;
      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[]).find((item) => item.id === request.params.eventId);
      if (!event) return context.sendError(reply, 404, "not_found", "Event not found");
      if (event.type !== "match") return context.sendError(reply, 400, "invalid_tactical_board_event", "Tactical board is only available for match events");
      if (["completed", "cancelled", "canceled"].includes(event.status)) return context.sendError(reply, 409, "tactical_board_read_only", "Completed or cancelled matches are read only");
      if (!formationTemplates.some((item) => item.name === request.body.formationName)) return context.sendError(reply, 400, "invalid_tactical_board_snapshot", "Unknown formation template");
      const roster = await tacticalBoardRoster(context, request.params.clubId, event);
      const errors = validateTacticalBoardPlayers(request.body.players, roster.map((item) => item.studentId));
      if (errors.length) return context.sendError(reply, 400, "invalid_tactical_board_snapshot", "Invalid tactical board snapshot", errors);
      const auth = context.membershipResolver ? await context.resolveClubAuth(request, reply, request.params.clubId) : null;
      const coach = context.store.listCoaches(request.params.clubId).find((item) => item.userId === auth?.user.id);
      const existing = await context.store.getTacticalBoard(request.params.clubId, event.id);
      const now = new Date().toISOString();
      const board = await context.store.saveTacticalBoard({
        id: existing?.id ?? `tactical-board-${event.id}`,
        clubId: request.params.clubId,
        eventId: event.id,
        formationName: request.body.formationName,
        pitchType: "full",
        players: request.body.players,
        updatedByCoachId: coach?.id ?? "coach-1",
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      return { event: { id: event.id, title: event.title, status: event.status }, board, roster, saved: true, readOnly: false };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/children",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientParentChildren,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }
      if (auth && !auth.membership.roles.includes("parent")) {
        return context.sendError(reply, 403, "forbidden", "Parent role is required for this operation");
      }

      const students = await context.store.listOperationalStudents(request.params.clubId);
      const children = auth
        ? students.filter((student) => context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, student.id))
        : students;

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "parent",
        children: children.map(summarizeStudent),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/reminders",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientParentReminders,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }
      if (auth && !auth.membership.roles.includes("parent")) {
        return context.sendError(reply, 403, "forbidden", "Parent role is required for this operation");
      }

      const students = await context.store.listOperationalStudents(request.params.clubId);
      const children = auth
        ? students.filter((student) => context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, student.id))
        : students;

      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const upcomingWindowMs = 2 * dayMs;
      const insuranceWindowMs = 30 * dayMs;
      const insuranceUrgentWindowMs = 7 * dayMs;
      const lowCreditThreshold = 4;

      const reminders: ParentReminder[] = [];

      for (const child of children) {
        const events = sortEvents(await context.store.getStudentTimeline(request.params.clubId, child.id));
        for (const event of events) {
          const startsAt = Date.parse(event.timeRange?.startsAt ?? "");
          if (!Number.isFinite(startsAt) || startsAt < now || startsAt > now + upcomingWindowMs) {
            continue;
          }
          if (event.status === "cancelled" || event.status === "completed") {
            continue;
          }
          reminders.push({
            id: `event_upcoming:${event.id}:${child.id}`,
            type: "event_upcoming",
            severity: startsAt - now <= dayMs ? "warning" : "info",
            studentId: child.id,
            studentName: child.name,
            dueAt: event.timeRange.startsAt,
            event: {
              id: event.id,
              type: event.type,
              title: event.title,
              startsAt: event.timeRange.startsAt,
              endsAt: event.timeRange.endsAt,
            },
          });
        }

        const status = await context.store.getStudentOperationalStatusSummary(request.params.clubId, child.id);
        if (!status) {
          continue;
        }

        const insuranceExpiresAtIso = status.insurance?.expiresAt;
        const insuranceExpiresAt = insuranceExpiresAtIso ? Date.parse(insuranceExpiresAtIso) : Number.NaN;
        if (insuranceExpiresAtIso && Number.isFinite(insuranceExpiresAt) && insuranceExpiresAt <= now + insuranceWindowMs) {
          const expired = insuranceExpiresAt < now;
          reminders.push({
            id: `insurance_expiring:${child.id}`,
            type: "insurance_expiring",
            severity: expired || insuranceExpiresAt - now <= insuranceUrgentWindowMs ? "urgent" : "warning",
            studentId: child.id,
            studentName: child.name,
            dueAt: insuranceExpiresAtIso,
            insurance: {
              status: expired ? "expired" : "expiring",
              expiresAt: insuranceExpiresAtIso,
            },
          });
        }

        const lessonBalance = status.lessonBalance ?? status.lesson?.balance;
        if (typeof lessonBalance === "number" && lessonBalance <= lowCreditThreshold) {
          reminders.push({
            id: `lesson_credit_low:${child.id}`,
            type: "lesson_credit_low",
            severity: lessonBalance <= 0 ? "urgent" : "warning",
            studentId: child.id,
            studentName: child.name,
            dueAt: status.lesson?.updatedAt ?? new Date(now).toISOString(),
            lessonCredit: { balance: lessonBalance },
          });
        }
      }

      const severityRank: Record<ParentReminder["severity"], number> = { urgent: 0, warning: 1, info: 2 };
      reminders.sort((left, right) =>
        severityRank[left.severity] - severityRank[right.severity] || Date.parse(left.dueAt) - Date.parse(right.dueAt)
      );

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "parent",
        generatedAt: new Date(now).toISOString(),
        reminders,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Querystring: {
      student?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/private-lessons",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientParentPrivateLessonsQuery,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }
      if (auth && !auth.membership.roles.includes("parent")) {
        return context.sendError(reply, 403, "forbidden", "Parent role is required for this operation");
      }

      const students = await context.store.listOperationalStudents(request.params.clubId);
      const childIds = new Set(
        (auth
          ? students.filter((student) => context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, student.id))
          : students
        ).map((student) => student.id),
      );
      if (request.query.student && auth && !childIds.has(request.query.student)) {
        return context.sendError(reply, 403, "forbidden", "Student is not a child of the authenticated guardian");
      }

      const requests = await context.store.listPrivateLessonRequests(request.params.clubId, request.query.student);
      return {
        clubId: request.params.clubId,
        requests: requests.filter((item) => childIds.has(item.studentId)),
      };
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Body: {
      studentId: string;
      coachName: string;
      date: string;
      timeSlot: string;
      goals: string[];
      note?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/private-lessons",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientParentPrivateLessons,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }
      if (auth && !auth.membership.roles.includes("parent")) {
        return context.sendError(reply, 403, "forbidden", "Parent role is required for this operation");
      }
      if (auth && !context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, request.body.studentId)) {
        return context.sendError(reply, 403, "forbidden", "Student is not a child of the authenticated guardian");
      }

      const created = await context.store.createPrivateLessonRequest(request.params.clubId, request.body.studentId, {
        coachName: request.body.coachName,
        date: request.body.date,
        timeSlot: request.body.timeSlot,
        goals: request.body.goals,
        note: request.body.note,
        requestedByUserId: auth?.user.id,
      });
      reply.code(201);
      return {
        clubId: request.params.clubId,
        request: created,
      };
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Body: {
      wxLoginCode: string;
      phoneCode?: string;
      encryptedPhoneData?: string;
      roleHint?: AppRole;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/wechat-login",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientWechatLogin,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClientAny(context, reply, request.params.clubId, request.params.clientId);
      if (!client) {
        return reply;
      }

      let auth = context.membershipResolver
        ? await context.membershipResolver.resolve(request, request.params.clubId)
        : null;
      if (!auth && context.wechatIdentityConnector && context.membershipResolver?.resolveByPhone) {
        try {
          const identity = await context.wechatIdentityConnector.resolve(request.body.wxLoginCode, request.body.phoneCode);
          auth = identity.phone
            ? await context.membershipResolver.resolveByPhone(request.params.clubId, identity.phone)
            : null;
        } catch (error) {
          const message = error instanceof Error ? error.message : "WeChat login failed";
          return context.sendError(reply, 400, "wechat_login_failed", message);
        }
      }
      if (!auth) {
        return {
          clubId: request.params.clubId,
          client: summarizeClient(client),
          status: "binding_required",
          phoneBinding: request.body.phoneCode || request.body.encryptedPhoneData ? "received" : "required",
          session: null,
          role: null,
          profile: null,
          children: [],
          capabilities: await context.store.getClubCapabilities(request.params.clubId, { clientId: request.params.clientId }),
        };
      }

      const role = resolveAppRole(auth?.membership.roles);
      const entrypoints = client.roleEntrypoints?.[role];
      if (!Array.isArray(entrypoints) || entrypoints.length === 0) {
        return context.sendError(reply, 403, "forbidden", `App client does not expose ${role} entrypoints`);
      }
      const students = role === "parent"
        ? (await context.store.listOperationalStudents(request.params.clubId))
          .filter((student) => auth ? context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, student.id) : true)
        : [];
      const session = context.sessionRegistry.create(auth);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        status: "authenticated",
        phoneBinding: request.body.phoneCode || request.body.encryptedPhoneData ? "accepted" : "not_provided",
        session,
        profile: auth
          ? {
            userId: auth.user.id,
            displayName: auth.user.displayName,
            phone: auth.user.phone,
            roles: auth.membership.roles,
          }
          : null,
        role,
        children: students.map(summarizeStudent),
        capabilities: await context.store.getClubCapabilities(request.params.clubId, { clientId: request.params.clientId }),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/home",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientParentHome,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const student = await context.store.getOperationalStudentDetail(request.params.clubId, request.params.studentId);
      if (!student) {
        return context.sendError(reply, 404, "not_found", "Student not found");
      }

      const status = await context.store.getStudentOperationalStatusSummary(request.params.clubId, request.params.studentId);
      const events = sortEvents(await context.store.getStudentTimeline(request.params.clubId, request.params.studentId));
      const metrics = await context.store.getStudentMetrics(request.params.clubId, request.params.studentId);
      const schedule = splitHomeSchedule(events);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "parent",
        student: summarizeStudent(student),
        status,
        schedule: {
          upcoming: schedule.upcoming.slice(0, 5),
          recent: schedule.recent.slice(0, 5),
        },
        metrics: {
          latest: metrics.slice(0, 8),
          trends: buildMetricTrends(metrics),
        },
        sync: {
          latestRuns: (await context.store.listExternalSyncRuns(request.params.clubId)).slice(0, 3),
        },
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/privacy",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientPrivacyState,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      return context.store.getStudentPrivacyState(request.params.clubId, request.params.studentId);
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
    Body: Omit<PrivacyRequestCreateInput, "studentId">;
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/privacy/requests",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientPrivacyRequestCreate,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      try {
        const privacyRequest = await context.store.createPrivacyRequest(request.params.clubId, {
          ...request.body,
          studentId: request.params.studentId,
        }, auth?.user.id);
        return reply.code(201).send(privacyRequest);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Privacy request creation failed";
        return context.sendError(reply, 400, "invalid_privacy_request", message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
    Querystring: {
      from?: string;
      to?: string;
      type?: "training" | "match" | "other";
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/activity-summaries",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientActivitySummaryQuery,
        ...schemas.appClientActivitySummaries,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const events = filterEventsByRange(
        sortEvents(await context.store.getStudentTimeline(request.params.clubId, request.params.studentId)),
        request.query,
      ).filter((event) => request.query.type ? event.type === request.query.type : true);
      const metrics = await context.store.getStudentMetrics(request.params.clubId, request.params.studentId, [
        "training_observation",
        "match_event",
      ]);
      const metricCatalog = await context.store.listAbilityMetrics(request.params.clubId);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        studentId: request.params.studentId,
        summaries: events.map((event) => ({
          event,
          metricRecords: metrics.filter((record) => record.eventId === event.id),
          metrics: metrics
            .filter((record) => record.eventId === event.id)
            .map((record) => ({
              record,
              metric: metricCatalog.find((metric) => metric.id === record.metricId) ?? null,
            })),
        })),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/status-summary",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientStatusSummary,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const status = await context.store.getStudentOperationalStatusSummary(request.params.clubId, request.params.studentId);
      if (!status) {
        return context.sendError(reply, 404, "not_found", "Student not found");
      }

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        studentId: request.params.studentId,
        status,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
      metricId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/ability-metrics/:metricId",
    {
      schema: {
        ...schemas.appClientMetricParams,
        ...schemas.appClientMetricDetail,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const metricCatalog = await context.store.listAbilityMetrics(request.params.clubId);
      const metric = metricCatalog.find((item) => item.id === request.params.metricId);
      if (!metric) {
        return context.sendError(reply, 404, "not_found", "Metric not found");
      }

      const records = (await context.store.getStudentMetrics(request.params.clubId, request.params.studentId))
        .filter((record) => record.metricId === request.params.metricId);
      const events = await context.store.getStudentTimeline(request.params.clubId, request.params.studentId) as AppEventDetail[];

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        studentId: request.params.studentId,
        metric,
        latest: records[0] ?? null,
        records: records.slice(0, 20),
        trend: buildMetricTrends(records),
        sourceEvents: records
          .filter((record) => record.eventId)
          .map((record) => ({
            recordId: record.id,
            event: events.find((event) => event.id === record.eventId) ?? null,
          })),
        privacy: {
          minorProfile: "redacted_contact_fields",
        },
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/growth-summary",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientGrowthSummary,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const [capabilities, metricCatalog, metricRecords] = await Promise.all([
        context.store.getClubCapabilities(request.params.clubId, { clientId: request.params.clientId }),
        context.store.listAbilityMetrics(request.params.clubId),
        context.store.getStudentMetrics(request.params.clubId, request.params.studentId),
      ]);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        studentId: request.params.studentId,
        assessment: capabilities?.assessment ?? {
          graphVersions: [],
          views: [],
          viewNodes: [],
          templateVersions: [],
          metricBindings: [],
        },
        metrics: metricCatalog,
        latest: buildLatestMetricRecords(metricRecords, metricCatalog),
        trends: buildMetricTrends(metricRecords),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
    Querystring: {
      from?: string;
      to?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/students/:studentId/schedule",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientScheduleQuery,
        ...schemas.appClientParentSchedule,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const events = filterEventsByRange(
        sortEvents(await context.store.getStudentTimeline(request.params.clubId, request.params.studentId)),
        request.query,
      );

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        studentId: request.params.studentId,
        events,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/workbench",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientCoachEventWorkbench,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      if (!event) {
        return context.sendError(reply, 404, "not_found", "Event not found");
      }

      const workbench = await context.store.getCoachToday(request.params.clubId, {
        date: event.timeRange.startsAt.slice(0, 10),
        userId: auth?.user.id ?? "user-coach-1",
        roles: auth?.membership.roles ?? ["coach"],
      }) as { events?: Array<AppEventDetail & { workflow?: Record<string, unknown>; students?: unknown[]; teams?: unknown[] }> };
      const workbenchEvent = workbench.events?.find((item) => item.id === event.id);
      if (context.membershipResolver && !workbenchEvent) {
        return context.sendError(reply, 403, "forbidden", "Event is not accessible for this coach membership");
      }

      const metricCatalog = await context.store.listAbilityMetrics(request.params.clubId);
      const config = await context.store.getDataCapabilityConfig(request.params.clubId);
      const trainingSession = event.trainingSession as { sessionPlanId?: string } | undefined;
      const sessionPlan = trainingSession?.sessionPlanId
        ? context.store.getSessionPlan(trainingSession.sessionPlanId)
        : null;
      const drills = context.store.listTrainingDrills(request.params.clubId);
      const selectedProjectIds = sessionPlan?.blocks.map((block) => block.drillId) ?? [];

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "coach",
        event,
        rosterContext: {
          participants: event.participants ?? [],
          students: workbenchEvent?.students ?? [],
          teams: workbenchEvent?.teams ?? [],
        },
        workflow: workbenchEvent?.workflow ?? {},
        training: {
          session: event.trainingSession,
          sessionPlan,
          selectedProjectIds,
          projects: selectedProjectIds
            .map((projectId) => drills.find((drill) => drill.id === projectId))
            .filter((drill): drill is NonNullable<typeof drill> => Boolean(drill))
            .map((drill) => summarizeTrainingDrill(drill, metricCatalog)),
        },
        match: event.match,
        assessment: {
          templateVersions: config.assessmentTemplateVersions,
          metricBindings: config.assessmentMetricBindings,
        },
        metrics: metricCatalog,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/match",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientCoachMatchDetail,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      if (!event) {
        return context.sendError(reply, 404, "not_found", "Event not found");
      }
      if (event.type !== "match") {
        return context.sendError(reply, 400, "invalid_match_event", "Event is not a match");
      }

      const students = await context.store.listOperationalStudents(request.params.clubId);
      const nameByStudentId = new Map(students.map((student) => [student.id, student.name]));
      const detail = await context.store.getMatchDetailByEvent(request.params.clubId, request.params.eventId);

      return {
        event: {
          id: event.id,
          type: event.type,
          title: event.title,
          timeRange: event.timeRange,
          status: event.status,
          teamName: typeof event.teamName === "string" ? event.teamName : undefined,
        },
        roster: (event.participants ?? []).map((participant) => ({
          studentId: participant.studentId,
          name: nameByStudentId.get(participant.studentId),
          status: participant.status,
        })),
        match: detail?.match ?? null,
        events: detail?.events ?? [],
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      templateId: string;
    };
    Querystring: {
      templateVersionId?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/assessments/templates/:templateId/form",
    {
      schema: {
        ...schemas.appClientAssessmentTemplateParams,
        ...schemas.appClientAssessmentFormQuery,
        ...schemas.appClientAssessmentForm,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const [templates, testItems, metricCatalog, dimensions, config] = await Promise.all([
        context.store.listAssessmentTemplates(request.params.clubId),
        context.store.listAssessmentTestItems(request.params.clubId),
        context.store.listAbilityMetrics(request.params.clubId),
        context.store.listDevelopmentDimensions(request.params.clubId),
        context.store.getDataCapabilityConfig(request.params.clubId),
      ]);
      const template = templates.find((item) => item.id === request.params.templateId && item.status === "active");
      if (!template) {
        return context.sendError(reply, 404, "not_found", "Assessment template not found");
      }

      const versions = config.assessmentTemplateVersions
        .filter((item) => item.templateId === template.id && item.status === "active")
        .sort((left, right) => right.version.localeCompare(left.version));
      const templateVersion = request.query.templateVersionId
        ? versions.find((item) => item.id === request.query.templateVersionId)
        : versions[0];
      if (!templateVersion) {
        return context.sendError(reply, 404, "not_found", "Assessment template version not found");
      }

      const bindings = config.assessmentMetricBindings
        .filter((binding) => binding.templateVersionId === templateVersion.id)
        .sort((left, right) => left.sortOrder - right.sortOrder);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "coach",
        template,
        templateVersion,
        fields: bindings.map((binding) => ({
          binding,
          metric: metricCatalog.find((metric) => metric.id === binding.metricId) ?? null,
          dimension: dimensions.find((dimension) => dimension.id === metricCatalog.find((metric) => metric.id === binding.metricId)?.dimensionId) ?? null,
          testItem: binding.testItemId
            ? testItems.find((item) => item.id === binding.testItemId) ?? null
            : null,
        })),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/events/:eventId",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientEventDetail,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const role = resolveAppRole(auth?.membership.roles);
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, role);
      if (!client) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      if (!event) {
        return context.sendError(reply, 404, "not_found", "Event not found");
      }

      let visibleEvent = event;
      if (role === "parent" && auth) {
        const visibleParticipants = (event.participants ?? []).filter((participant) =>
          context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, participant.studentId),
        );
        if (!visibleParticipants.length) {
          return context.sendError(reply, 403, "forbidden", "Event is not accessible for this parent membership");
        }
        visibleEvent = { ...event, participants: visibleParticipants };
      }

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role,
        event: visibleEvent,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Querystring: {
      from?: string;
      to?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/parent/calendar",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientScheduleQuery,
        ...schemas.appClientParentCalendar,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }
      if (auth && !auth.membership.roles.includes("parent")) {
        return context.sendError(reply, 403, "forbidden", "Parent role is required for this operation");
      }

      const students = await context.store.listOperationalStudents(request.params.clubId);
      const children = auth
        ? students.filter((student) => context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, student.id))
        : students;
      const childIds = new Set(children.map((student) => student.id));
      const eventsById = new Map<string, AppEventDetail & { childIds: string[]; children: unknown[] }>();

      for (const child of children) {
        const events = filterEventsByRange(
          sortEvents(await context.store.getStudentTimeline(request.params.clubId, child.id)),
          request.query,
        );
        for (const event of events) {
          const existing = eventsById.get(event.id);
          const visibleParticipants = (event.participants ?? []).filter((participant) => childIds.has(participant.studentId));
          if (existing) {
            if (!existing.childIds.includes(child.id)) {
              existing.childIds.push(child.id);
              existing.children.push(summarizeStudent(child));
            }
            existing.participants = uniqueParticipants([...(existing.participants ?? []), ...visibleParticipants]);
            continue;
          }

          eventsById.set(event.id, {
            ...event,
            participants: visibleParticipants,
            childIds: [child.id],
            children: [summarizeStudent(child)],
          });
        }
      }

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "parent",
        children: children.map(summarizeStudent),
        events: sortEvents([...eventsById.values()]),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/training-project-tree",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientTrainingProjectTree,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const [dimensions, objectives, drills, metrics] = await Promise.all([
        context.store.listDevelopmentDimensions(request.params.clubId),
        context.store.listTrainingObjectives(request.params.clubId),
        context.store.listTrainingDrills(request.params.clubId),
        context.store.listAbilityMetrics(request.params.clubId),
      ]);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "coach",
        dimensions: dimensions.map((dimension) => ({
          ...dimension,
          objectives: objectives
            .filter((objective) => objective.dimensionId === dimension.id)
            .map((objective) => ({
              ...objective,
              metrics: metrics.filter((metric) => metric.dimensionId === dimension.id),
              projects: drills
                .filter((drill) => drill.objectiveIds.includes(objective.id))
                .map((drill) => summarizeTrainingDrill(drill, metrics)),
            })),
        })),
        projects: drills.map((drill) => summarizeTrainingDrill(drill, metrics)),
      };
    },
  );

  app.put<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
    Body: {
      projectIds: string[];
      intensity?: "low" | "medium" | "high";
      note?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/training-projects",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientTrainingProjectsUpdate,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      if (!event) {
        return context.sendError(reply, 404, "not_found", "Event not found");
      }
      if (event.type !== "training") {
        return context.sendError(reply, 400, "invalid_training_event", "Training projects can only be saved on training events");
      }

      const drills = context.store.listTrainingDrills(request.params.clubId);
      const selectedDrills = request.body.projectIds.map((projectId) => drills.find((drill) => drill.id === projectId));
      const missingProjectId = request.body.projectIds.find((projectId, index) => !selectedDrills[index]);
      if (missingProjectId) {
        return context.sendError(reply, 400, "invalid_training_project", `Training project not found: ${missingProjectId}`);
      }

      const now = new Date().toISOString();
      const sessionPlanId = `session-plan-app-client-${request.params.eventId}`;
      const existingPlan = context.store.getSessionPlan(sessionPlanId);
      const selected = selectedDrills.filter((drill): drill is NonNullable<typeof drill> => Boolean(drill));
      const sessionPlan = context.store.saveSessionPlan({
        id: sessionPlanId,
        catalogScope: { scope: "club", clubId: request.params.clubId },
        name: `${event.title}训练内容`,
        objectiveIds: Array.from(new Set(selected.flatMap((drill) => drill.objectiveIds))),
        metricIds: Array.from(new Set(selected.flatMap((drill) => drill.metricIds))),
        blocks: selected.map((drill, index) => ({
          id: `session-plan-block-app-client-${request.params.eventId}-${String(index + 1).padStart(2, "0")}`,
          drillId: drill.id,
          order: index + 1,
          plannedMinutes: drill.durationMinutes,
          notes: request.body.note,
        })),
        estimatedMinutes: selected.reduce((sum, drill) => sum + drill.durationMinutes, 0),
        createdAt: existingPlan?.createdAt ?? now,
        updatedAt: now,
      });
      const trainingSession = await context.store.ensureTrainingSessionForEvent(request.params.clubId, request.params.eventId, {
        kind: "team",
        sessionPlanId: sessionPlan.id,
        intensity: request.body.intensity,
      });
      const metrics = context.store.listAbilityMetrics(request.params.clubId);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        eventId: request.params.eventId,
        trainingSession,
        sessionPlan,
        projects: selected.map((drill) => summarizeTrainingDrill(drill, metrics)),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Querystring: {
      date?: string;
      from?: string;
      to?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/home",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientCoachHomeQuery,
        ...schemas.appClientCoachHome,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const fallbackDate = request.query.date ?? new Date().toISOString().slice(0, 10);
      const from = request.query.from ?? fallbackDate;
      const to = request.query.to ?? from;
      const dates = enumerateDateRange(from, to);
      if (!dates) {
        return context.sendError(reply, 400, "invalid_date_range", "Date range must be valid and no longer than 31 days");
      }

      const dailyWorkbenches = await Promise.all(dates.map((date) => context.store.getCoachToday(request.params.clubId, {
        date,
        userId: auth?.user.id ?? "user-coach-1",
        roles: auth?.membership.roles ?? ["coach"],
      }))) as Array<{ coachId?: string; events?: Array<AppEventDetail & { workflow?: Record<string, unknown>; teams?: unknown[] }> }>;
      const events = dailyWorkbenches.flatMap((item) => item.events ?? []);
      const tasks = events.map(buildCoachTask);
      const teamNames = Array.from(new Set(events.flatMap((event) => {
        const teams = Array.isArray(event.teams) ? event.teams : [];
        return teams.map((team) => typeof team === "string" ? team : String((team as Record<string, unknown>).name ?? "")).filter(Boolean);
      })));

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "coach",
        workbench: {
          date: from,
          dateRange: { from, to },
          coachId: dailyWorkbenches.find((item) => item.coachId)?.coachId,
          teams: teamNames,
          events,
          tasks,
          summary: {
            total: events.length,
            training: events.filter((event) => event.type === "training").length,
            matches: events.filter((event) => event.type === "match").length,
            pending: tasks.filter((task) => task.action !== "view").length,
          },
        },
        sync: {
          latestRuns: (await context.store.listExternalSyncRuns(request.params.clubId)).slice(0, 3),
        },
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/team",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientCoachTeam,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const scope = await collectCoachScope(context, request.params.clubId, auth);
      const team = scope.teams[0] ?? null;
      const decided = scope.events.flatMap((event) => event.participants ?? [])
        .filter((participant) => participant.status === "present" || participant.status === "absent" || participant.status === "excused");
      const present = decided.filter((participant) => participant.status === "present").length;

      return {
        clubId: request.params.clubId,
        role: "coach",
        team,
        stats: {
          memberCount: scope.students.length,
          trainingCount: scope.events.filter((event) => event.type === "training").length,
          attendanceRate: decided.length ? Math.round((present / decided.length) * 100) : null,
        },
        members: scope.students,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/students/:studentId/radar",
    {
      schema: {
        ...schemas.appClientStudentParams,
        ...schemas.appClientCoachStudentRadar,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const scope = await collectCoachScope(context, request.params.clubId, auth);
      if (context.membershipResolver && !scope.students.some((student) => student.id === request.params.studentId)) {
        return context.sendError(reply, 403, "forbidden", "Student is not accessible for this coach membership");
      }

      const [metricCatalog, metricRecords] = await Promise.all([
        context.store.listAbilityMetrics(request.params.clubId),
        context.store.getStudentMetrics(request.params.clubId, request.params.studentId),
      ]);

      return {
        clubId: request.params.clubId,
        role: "coach",
        studentId: request.params.studentId,
        metrics: metricCatalog,
        latest: buildLatestMetricRecords(metricRecords, metricCatalog),
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/team/ability-overview",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientCoachTeamAbilityOverview,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const scope = await collectCoachScope(context, request.params.clubId, auth);
      const metricCatalog = await context.store.listAbilityMetrics(request.params.clubId);
      const perStudent = await Promise.all(scope.students.map(async (student) => ({
        studentId: student.id,
        records: await context.store.getStudentMetrics(request.params.clubId, student.id),
      })));

      const dimensions = metricCatalog.map((metric) => {
        const latestValues: number[] = [];
        for (const student of perStudent) {
          const record = student.records.find((item) => item.metricId === metric.id);
          const value = record ? metricNumericValue(record.value) : null;
          if (value !== null) {
            latestValues.push(value);
          }
        }
        return {
          metricId: metric.id,
          label: metric.name,
          average: latestValues.length ? round1(latestValues.reduce((sum, value) => sum + value, 0) / latestValues.length) : null,
          top: latestValues.length ? round1(Math.max(...latestValues)) : null,
          bottom: latestValues.length ? round1(Math.min(...latestValues)) : null,
        };
      }).filter((dimension) => dimension.average !== null);

      const deltas: number[] = [];
      for (const student of perStudent) {
        const byMetric = new Map<string, typeof student.records>();
        for (const record of student.records) {
          const list = byMetric.get(record.metricId) ?? [];
          list.push(record);
          byMetric.set(record.metricId, list);
        }
        for (const records of byMetric.values()) {
          const current = records[0] ? metricNumericValue(records[0].value) : null;
          const previous = records[1] ? metricNumericValue(records[1].value) : null;
          if (current !== null && previous !== null) {
            deltas.push(current - previous);
          }
        }
      }

      const averages = dimensions.map((dimension) => dimension.average).filter((value): value is number => value !== null);
      return {
        clubId: request.params.clubId,
        role: "coach",
        studentCount: scope.students.length,
        overall: averages.length ? round1(averages.reduce((sum, value) => sum + value, 0) / averages.length) : null,
        trendDelta: deltas.length ? round1(deltas.reduce((sum, value) => sum + value, 0) / deltas.length) : null,
        dimensions,
      };
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
    Body: {
      reason: "venue" | "time" | "weather" | "other";
      newStartsAt?: string;
      newVenue?: string;
      note?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/change-requests",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientCoachEventChangeRequest,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      if (!event) {
        return context.sendError(reply, 404, "not_found", "Event not found");
      }

      if (context.membershipResolver) {
        const scope = await collectCoachScope(context, request.params.clubId, auth);
        if (!scope.events.some((item) => item.id === request.params.eventId)) {
          return context.sendError(reply, 403, "forbidden", "Event is not accessible for this coach membership");
        }
      }

      const created = await context.store.createEventChangeRequest(request.params.clubId, request.params.eventId, {
        reason: request.body.reason,
        newStartsAt: request.body.newStartsAt,
        newVenue: request.body.newVenue,
        note: request.body.note,
        requestedByUserId: auth?.user.id,
      });
      reply.code(201);
      return {
        clubId: request.params.clubId,
        request: created,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/training-coverage",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientCoachTrainingCoverage,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const scope = await collectCoachScope(context, request.params.clubId, auth);
      const [dimensions, metricCatalog] = await Promise.all([
        context.store.listDevelopmentDimensions(request.params.clubId),
        context.store.listAbilityMetrics(request.params.clubId),
      ]);
      const students = await Promise.all(scope.students.map(async (student) => {
        const records = await context.store.getStudentMetrics(request.params.clubId, student.id);
        const dimensionViews = dimensions.map((dimension) => {
          const metricIds = metricCatalog.filter((metric) => metric.dimensionId === dimension.id).map((metric) => metric.id);
          const dimensionRecords = records.filter((record) => metricIds.includes(record.metricId));
          const latest = dimensionRecords[0] ? metricNumericValue(dimensionRecords[0].value) : null;
          return {
            dimensionId: dimension.id,
            label: dimension.name,
            covered: dimensionRecords.length > 0,
            scorePercent: latest === null ? null : Math.max(0, Math.min(100, round1(latest))),
          };
        });
        const coveredCount = dimensionViews.filter((dimension) => dimension.covered).length;
        return {
          studentId: student.id,
          name: student.name,
          coveredCount,
          totalCount: dimensionViews.length,
          dimensions: dimensionViews,
        };
      }));

      return {
        clubId: request.params.clubId,
        role: "coach",
        students,
      };
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/assessment-tasks",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientCoachAssessmentTasks,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) {
        return reply;
      }

      const scope = await collectCoachScope(context, request.params.clubId, auth);
      const tasks = await context.store.listAssessmentTasks(request.params.clubId);
      const today = new Date().toISOString().slice(0, 10);
      const recordsByStudent = new Map<string, Awaited<ReturnType<RouteContext["store"]["getStudentMetrics"]>>>();
      await Promise.all(scope.students.map(async (student) => {
        recordsByStudent.set(student.id, await context.store.getStudentMetrics(request.params.clubId, student.id));
      }));

      const views = tasks.map((task) => {
        const totalStudents = scope.students.length;
        const completedStudents = scope.students.filter((student) =>
          (recordsByStudent.get(student.id) ?? []).some((record) => record.occurredAt.slice(0, 10) >= task.startsOn && record.occurredAt.slice(0, 10) <= task.dueOn)
        ).length;
        const status = task.startsOn > today
          ? "not_started"
          : totalStudents > 0 && completedStudents >= totalStudents
            ? "completed"
            : "in_progress";
        return {
          id: task.id,
          title: task.title,
          templateId: task.templateId,
          startsOn: task.startsOn,
          dueOn: task.dueOn,
          status,
          completedStudents,
          totalStudents,
        };
      });

      return {
        clubId: request.params.clubId,
        role: "coach",
        tasks: views,
      };
    },
  );

  // ---- Parent content slices (contract: Parent Content Slices) ----

  app.get<{
    Params: { clubId: string; clientId: string };
  }>(
    "/clubs/:clubId/app-clients/:clientId/content/articles",
    { schema: { ...schemas.appClientParams, ...schemas.appClientContentArticles } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }
      return {
        clubId: request.params.clubId,
        articles: await context.store.listContentArticles(request.params.clubId),
      };
    },
  );

  app.get<{
    Params: { clubId: string; clientId: string };
  }>(
    "/clubs/:clubId/app-clients/:clientId/content/faqs",
    { schema: { ...schemas.appClientParams, ...schemas.appClientContentFaqs } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }
      return {
        clubId: request.params.clubId,
        questions: await context.store.listContentFaqs(request.params.clubId),
      };
    },
  );

  app.get<{
    Params: { clubId: string; clientId: string };
  }>(
    "/clubs/:clubId/app-clients/:clientId/venues",
    { schema: { ...schemas.appClientParams, ...schemas.appClientVenues } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }
      const venues = await context.store.listVenues(request.params.clubId);
      const dayMs = 24 * 60 * 60 * 1000;
      const from = new Date(Date.now() - 29 * dayMs).toISOString();
      const students = await context.store.listOperationalStudents(request.params.clubId);
      const studentIds = new Set(students.map((student) => student.id));
      // 语义保持：统计 30 天窗口内、有运营学员参与、且带场地名称的去重事件数。
      // 事件详情一次取全（内嵌参与者），避免按学员逐条拉时间线（201 学员 × 全量查询 的 N+1 开销）。
      const venueUseCount = new Map<string, number>();
      const calendarEvents = await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[];
      for (const event of calendarEvents) {
        const rawVenue = event.venue;
        const venueName = typeof rawVenue === "string" ? rawVenue : String((rawVenue as { name?: string } | undefined)?.name ?? "");
        if (!venueName || event.timeRange.startsAt < from) {
          continue;
        }
        if (!event.participants?.some((participant) => studentIds.has(participant.studentId))) {
          continue;
        }
        venueUseCount.set(venueName, (venueUseCount.get(venueName) ?? 0) + 1);
      }
      return {
        clubId: request.params.clubId,
        venues: venues.map((venue) => ({
          ...venue,
          monthlyCount: venueUseCount.get(venue.name) ?? 0,
        })),
      };
    },
  );

  app.get<{
    Params: { clubId: string; clientId: string };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach-team",
    { schema: { ...schemas.appClientParams, ...schemas.appClientClubCoachTeam } },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "parent");
      if (!client) {
        return reply;
      }
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach", "parent"])) {
        return reply;
      }
      const teams = context.store.listTeams(request.params.clubId);
      const coaches = context.store.listCoaches(request.params.clubId).filter((coach) => coach.status === "active");
      const primaryTeam = teams[0];
      const memberCount = primaryTeam
        ? context.store.listTeamMembers(request.params.clubId).filter((member) => member.teamId === primaryTeam.id).length
        : 0;
      return {
        clubId: request.params.clubId,
        teamName: primaryTeam?.name ?? "重庆天才足球俱乐部",
        teamChips: [`${memberCount}名球员`, `${teams.length}支队伍`],
        teamGoal: "本赛季目标：打造更强的团队凝聚力与战术执行力。",
        coaches: coaches.map((coach, index) => ({
          id: coach.id,
          name: coach.name,
          role: index === 0 ? "主教练" : "教练",
          bio: coach.specialties.filter((item) => item !== "重庆天才导入数据").join(" · ") || "青训教练",
        })),
      };
    },
  );

  app.put<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
    Body: {
      participants: Parameters<RouteContext["store"]["recordEventParticipants"]>[2];
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/attendance",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientAttendance,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) {
        return reply;
      }

      try {
        const participants = await context.store.recordEventParticipants(
          request.params.clubId,
          request.params.eventId,
          request.body.participants,
        );
        return {
          clubId: request.params.clubId,
          client: summarizeClient(client),
          eventId: request.params.eventId,
          participants,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Attendance update failed";
        return context.sendError(reply, 400, "invalid_attendance", message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientLessonConfirmation,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      const participants = event?.participants ?? [];
      const ledgers = await Promise.all(participants.map(async (participant) => ({
        studentId: participant.studentId,
        ledger: await context.store.getLessonLedger(request.params.clubId, participant.studentId),
      })));

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        eventId: request.params.eventId,
        mode: "attendance_debit_confirmation",
        participants,
        ledgers,
      };
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
    Body: {
      studentIds?: string[];
      actorUserId?: string;
      note?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientLessonConfirmationCreate,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      const targetIds = new Set(request.body.studentIds ?? (event?.participants ?? []).map((participant) => participant.studentId));

      try {
        const ledgers = await Promise.all([...targetIds].map((studentId) =>
          context.store.recordLessonAdjustment(request.params.clubId, studentId, {
            entryType: "debit",
            lessonDelta: -1,
            source: "attendance",
            sourceId: `app-client-lesson-${request.params.eventId}-${studentId}`,
            eventId: request.params.eventId,
            actorUserId: request.body.actorUserId,
            note: request.body.note ?? "App client lesson confirmation",
          }),
        ));
        return reply.code(201).send({
          clubId: request.params.clubId,
          client: summarizeClient(client),
          eventId: request.params.eventId,
          ledgers,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lesson confirmation failed";
        return context.sendError(reply, 400, "invalid_lesson_confirmation", message);
      }
    },
  );

  app.patch<{
    Params: {
      clubId: string;
      clientId: string;
      eventId: string;
    };
    Body: {
      studentId: string;
      lessonDelta: number;
      reason?: string;
    };
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/lesson-confirmation",
    {
      schema: {
        ...schemas.appClientEventParams,
        ...schemas.appClientLessonConfirmationPatch,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!context.membershipResolver) {
        return context.sendError(reply, 401, "authentication_required", "Authenticated coach membership is required for lesson corrections");
      }

      const auth = await context.resolveClubAuth(request, reply, request.params.clubId);
      if (!auth) {
        return reply;
      }

      if (!await requireCoachEventAccess(context, request, reply, request.params.clubId, request.params.eventId)) {
        return reply;
      }

      const event = (await context.store.listCalendarEvents(request.params.clubId) as AppEventDetail[])
        .find((item) => item.id === request.params.eventId);
      if (!event) {
        return context.sendError(reply, 404, "not_found", "Event not found");
      }

      if (!event.participants?.some((participant) => participant.studentId === request.body.studentId)) {
        return context.sendError(reply, 400, "invalid_lesson_correction_student", "Student is not a participant in this event");
      }

      const idempotencyKey = firstHeaderValue(request.headers["idempotency-key"]);
      if (!idempotencyKey) {
        return context.sendError(reply, 400, "idempotency_key_required", "Idempotency-Key is required for lesson corrections");
      }

      const sourceId = `app-client-lesson-correction-${crypto
        .createHash("sha256")
        .update(JSON.stringify({
          clubId: request.params.clubId,
          eventId: request.params.eventId,
          studentId: request.body.studentId,
          actorUserId: auth.user.id,
          idempotencyKey,
        }))
        .digest("base64url")}`;

      try {
        const ledger = await context.store.recordLessonAdjustment(request.params.clubId, request.body.studentId, {
          entryType: "adjustment",
          lessonDelta: request.body.lessonDelta,
          source: "manual_adjustment",
          sourceId,
          eventId: request.params.eventId,
          actorUserId: auth.user.id,
          note: request.body.reason ?? "App client lesson correction",
        });
        return {
          clubId: request.params.clubId,
          client: summarizeClient(client),
          eventId: request.params.eventId,
          ledger,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lesson correction failed";
        return context.sendError(reply, 400, "invalid_lesson_correction", message);
      }
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Body: Omit<RecordMatchInput, "clubId">;
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/matches",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientRecordMatch,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (request.body.eventId && !await requireCoachEventAccess(context, request, reply, request.params.clubId, request.body.eventId)) {
        return reply;
      }

      try {
        const result = await context.store.recordMatchSummary({
          ...request.body,
          clubId: request.params.clubId,
        });
        return reply.code(201).send({
          clubId: request.params.clubId,
          client: summarizeClient(client),
          ...result,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Match recording failed";
        return context.sendError(reply, 400, "invalid_match", message);
      }
    },
  );

  app.post<{
    Params: {
      clubId: string;
      clientId: string;
    };
    Body: Omit<RecordAssessmentInput, "clubId">;
  }>(
    "/clubs/:clubId/app-clients/:clientId/coach/assessments",
    {
      schema: {
        ...schemas.appClientParams,
        ...schemas.appClientRecordAssessment,
      },
    },
    async (request, reply) => {
      const client = await requireActiveAppClient(context, reply, request.params.clubId, request.params.clientId, "coach");
      if (!client) {
        return reply;
      }

      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      if (context.membershipResolver && !auth) return reply;
      const authenticatedCoach = auth
        ? context.store.listCoaches(request.params.clubId).find((coach) => coach.userId === auth.user.id)
        : null;

      try {
        const result = await context.store.recordAssessment({
          ...request.body,
          clubId: request.params.clubId,
          assessedByCoachId: authenticatedCoach?.id ?? request.body.assessedByCoachId,
        });
        return reply.code(201).send({
          clubId: request.params.clubId,
          client: summarizeClient(client),
          ...result,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Assessment recording failed";
        return context.sendError(reply, 400, "invalid_assessment", message);
      }
    },
  );
}

async function tacticalBoardRoster(context: RouteContext, clubId: string, event: AppEventDetail) {
  const students = await context.store.listOperationalStudents(clubId);
  const names = new Map(students.map((student) => [student.id, student.name]));
  return (event.participants ?? []).map((participant) => ({
    studentId: participant.studentId,
    displayName: names.get(participant.studentId) ?? "学员",
  }));
}

function createInitialTacticalBoard(clubId: string, eventId: string, roster: Array<{ studentId: string; displayName: string }>) {
  const formation = formationTemplates[0]!;
  const now = new Date().toISOString();
  return {
    id: `tactical-board-${eventId}`,
    clubId,
    eventId,
    formationName: formation.name,
    pitchType: "full" as const,
    players: roster.map((student, index) => ({
      ...student,
      role: index < 11 ? "starter" as const : "substitute" as const,
      positionLabel: index < 11 ? formation.positions[index]?.positionLabel : undefined,
      x: index < 11 ? formation.positions[index]?.x ?? 0.5 : 0.05,
      y: index < 11 ? formation.positions[index]?.y ?? 0.5 : 0.95,
    })),
    updatedByCoachId: "coach-1",
    createdAt: now,
    updatedAt: now,
  };
}

async function requireActiveAppClient(
  context: RouteContext,
  reply: Parameters<RouteContext["sendError"]>[0],
  clubId: string,
  clientId: string,
  role: AppRole,
): Promise<ClubAppClient | null> {
  const client = (await context.store.listClubAppClients(clubId)).find((item) => item.id === clientId);

  if (!client || client.status !== "active") {
    context.sendError(reply, 404, "not_found", "App client not found");
    return null;
  }

  const entrypoints = client.roleEntrypoints?.[role];
  if (!Array.isArray(entrypoints) || entrypoints.length === 0) {
    context.sendError(reply, 403, "forbidden", `App client does not expose ${role} entrypoints`);
    return null;
  }

  return client;
}

async function requireActiveAppClientAny(
  context: RouteContext,
  reply: Parameters<RouteContext["sendError"]>[0],
  clubId: string,
  clientId: string,
): Promise<ClubAppClient | null> {
  const client = (await context.store.listClubAppClients(clubId)).find((item) => item.id === clientId);

  if (!client || client.status !== "active") {
    context.sendError(reply, 404, "not_found", "App client not found");
    return null;
  }

  return client;
}

async function requireCoachEventAccess(
  context: RouteContext,
  request: FastifyRequest,
  reply: FastifyReply,
  clubId: string,
  eventId: string,
): Promise<boolean> {
  if (!await context.requireClubRole(request, reply, clubId, ["admin", "coach"])) {
    return false;
  }

  const auth = context.membershipResolver
    ? await context.resolveClubAuth(request, reply, clubId)
    : null;
  if (context.membershipResolver && !auth) {
    return false;
  }

  const roles = auth?.membership.roles ?? ["coach"];
  if (roles.some((role) => adminRoles.has(role))) {
    return true;
  }

  const event = (await context.store.listCalendarEvents(clubId) as AppEventDetail[])
    .find((item) => item.id === eventId);
  if (!event) {
    context.sendError(reply, 404, "not_found", "Event not found");
    return false;
  }

  const workbench = await context.store.getCoachToday(clubId, {
    date: event.timeRange.startsAt.slice(0, 10),
    userId: auth?.user.id ?? "user-coach-1",
    roles,
  }) as { events?: Array<{ id: string }> };

  if (!workbench.events?.some((item) => item.id === eventId)) {
    context.sendError(reply, 403, "forbidden", "Event is not accessible for this coach membership");
    return false;
  }

  return true;
}

function summarizeClient(client: ClubAppClient) {
  return {
    id: client.id,
    channel: client.channel,
    name: client.name,
    clientKey: client.clientKey,
    appId: client.appId,
    visibility: client.visibility,
  };
}

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function enumerateDateRange(from: string, to: string): string[] | null {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    return null;
  }
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days > 31) {
    return null;
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function buildCoachTask(event: AppEventDetail & { workflow?: Record<string, unknown> }) {
  const workflow = event.workflow ?? {};
  let action = "view";
  let label = "查看活动";
  if (workflow.pendingAttendance) {
    action = "attendance";
    label = "完成点名";
  } else if (workflow.pendingLessonConfirmation && Date.parse(event.timeRange.endsAt) <= Date.now()) {
    action = "lesson";
    label = "确认销课";
  } else if (event.type === "match" && workflow.pendingRecord) {
    action = "match";
    label = "录入比赛";
  } else if (workflow.pendingAssessment) {
    action = "assessment";
    label = "录入评测";
  } else if (event.type === "training" && workflow.pendingRecord) {
    action = "training";
    label = "补充训练内容";
  }
  return {
    eventId: event.id,
    eventType: event.type,
    action,
    label,
    dueAt: event.timeRange.endsAt,
  };
}

function summarizeStudent(student: StudentDetail | StudentListItem) {
  return {
    id: student.id,
    name: student.name,
    birthDate: student.birthDate,
    gender: student.gender,
    currentLevel: student.currentLevel,
    teams: student.teams,
    primaryContact: summarizeContact(student.primaryContact),
    lessonBalance: student.lessonBalance,
    insuranceStatus: student.insuranceStatus,
    attendanceSnapshot: student.attendanceSnapshot,
  };
}

function summarizeContact(contact: Record<string, unknown> | undefined) {
  if (!contact) {
    return undefined;
  }

  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
  };
}

function summarizeTrainingDrill(
  drill: ReturnType<RouteContext["store"]["listTrainingDrills"]>[number],
  metrics: ReturnType<RouteContext["store"]["listAbilityMetrics"]>,
) {
  return {
    id: drill.id,
    name: drill.name,
    objectiveIds: drill.objectiveIds,
    metricIds: drill.metricIds,
    metrics: drill.metricIds
      .map((metricId: string) => metrics.find((metric) => metric.id === metricId))
      .filter(Boolean),
    durationMinutes: drill.durationMinutes,
    difficulty: drill.difficulty,
    recommendedAgeGroups: drill.recommendedAgeGroups,
    recommendedLevels: drill.recommendedLevels,
    equipment: drill.equipment,
    setup: drill.setup,
    coachingPoints: drill.coachingPoints,
  };
}

function uniqueParticipants(participants: NonNullable<AppEventDetail["participants"]>) {
  const byStudentId = new Map<string, typeof participants[number]>();

  for (const participant of participants) {
    byStudentId.set(participant.studentId, participant);
  }

  return [...byStudentId.values()];
}

function sortEvents(events: unknown[]): AppEventDetail[] {
  return (events as AppEventDetail[])
    .filter((event) => event.timeRange?.startsAt && event.timeRange?.endsAt)
    .sort((left, right) => Date.parse(left.timeRange.startsAt) - Date.parse(right.timeRange.startsAt));
}

function filterEventsByRange(events: AppEventDetail[], range: { from?: string; to?: string }) {
  return events.filter((event) => {
    const startsAt = Date.parse(event.timeRange.startsAt);
    const from = range.from ? Date.parse(range.from) : null;
    const to = range.to ? Date.parse(range.to) : null;

    return (from === null || startsAt >= from) && (to === null || startsAt <= to);
  });
}

function splitHomeSchedule(events: AppEventDetail[]) {
  const now = Date.now();

  return {
    upcoming: events.filter((event) => event.status === "scheduled" || Date.parse(event.timeRange.endsAt) >= now),
    recent: [...events]
      .reverse()
      .filter((event) => event.status === "completed" || event.status === "cancelled" || Date.parse(event.timeRange.endsAt) < now),
  };
}

function buildLatestMetricRecords(
  metrics: Awaited<ReturnType<RouteContext["store"]["getStudentMetrics"]>>,
  metricCatalog: Awaited<ReturnType<RouteContext["store"]["listAbilityMetrics"]>>,
) {
  const byMetric = new Map<string, typeof metrics[number]>();

  for (const metric of metrics) {
    if (!byMetric.has(metric.metricId)) {
      byMetric.set(metric.metricId, metric);
    }
  }

  return [...byMetric.entries()].map(([metricId, record]) => ({
    metricId,
    metric: metricCatalog.find((metric) => metric.id === metricId) ?? null,
    record,
  }));
}

function buildMetricTrends(metrics: Awaited<ReturnType<RouteContext["store"]["getStudentMetrics"]>>) {
  const byMetric = new Map<string, unknown[]>();

  for (const metric of metrics) {
    const records = byMetric.get(metric.metricId) ?? [];
    records.push(metric);
    byMetric.set(metric.metricId, records.slice(0, 6));
  }

  return [...byMetric.entries()].map(([metricId, records]) => ({ metricId, records }));
}

type CoachScopeAuth = Awaited<ReturnType<RouteContext["resolveClubAuth"]>> | null;

interface CoachScopeEvent extends AppEventDetail {
  students?: Array<{ id: string; name: string }>;
  teams?: Array<{ id: string; name: string }>;
  participants?: Array<{ studentId: string; status: string }>;
}

async function collectCoachScope(context: RouteContext, clubId: string, auth: CoachScopeAuth) {
  const dayMs = 24 * 60 * 60 * 1000;
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 29 * dayMs).toISOString().slice(0, 10);
  const dates = enumerateDateRange(from, to) ?? [to];
  const daily = await Promise.all(dates.map((date) => context.store.getCoachToday(clubId, {
    date,
    userId: auth?.user.id ?? "user-coach-1",
    roles: auth?.membership.roles ?? ["coach"],
  }))) as Array<{ events?: CoachScopeEvent[] }>;
  const events = daily.flatMap((item) => item.events ?? []);
  const studentsById = new Map<string, { id: string; name: string }>();
  const teamsById = new Map<string, { id: string; name: string; season: string }>();
  for (const event of events) {
    for (const student of event.students ?? []) {
      studentsById.set(student.id, { id: student.id, name: student.name });
    }
    for (const team of event.teams ?? []) {
      teamsById.set(team.id, { id: team.id, name: team.name, season: currentSeason() });
    }
  }
  return { events, students: [...studentsById.values()], teams: [...teamsById.values()] };
}

function currentSeason(): string {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}赛季`;
}

function metricNumericValue(value: unknown): number | null {
  const record = value as { kind?: string; score?: number; percentage?: number } | null;
  if (!record || typeof record !== "object") {
    return null;
  }
  if (record.kind === "score_0_100" && typeof record.score === "number") {
    return record.score;
  }
  if (record.kind === "rating_1_5" && typeof record.score === "number") {
    return record.score * 20;
  }
  if (record.kind === "percentage" && typeof record.percentage === "number") {
    return record.percentage;
  }
  return null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveAppRole(roles: ClubUserRole[] | undefined): AppRole {
  if (!roles) {
    return "coach";
  }

  if (roles.some((role) => adminRoles.has(role) || role === "coach")) {
    return "coach";
  }

  return "parent";
}
