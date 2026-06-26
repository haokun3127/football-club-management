import type { FastifyInstance } from "fastify";
import type { ClubUserRole } from "@football-club/domain";
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

export async function registerAppClientRoutes(app: FastifyInstance, context: RouteContext) {
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
        training: event.trainingSession,
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

      const [templates, testItems, metricCatalog, config] = await Promise.all([
        context.store.listAssessmentTemplates(request.params.clubId),
        context.store.listAssessmentTestItems(request.params.clubId),
        context.store.listAbilityMetrics(request.params.clubId),
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

      if (role === "parent" && auth) {
        const canReadEvent = (event.participants ?? []).some((participant) =>
          context.store.isGuardianOfStudent(request.params.clubId, auth.user.id, participant.studentId),
        );
        if (!canReadEvent) {
          return context.sendError(reply, 403, "forbidden", "Event is not accessible for this parent membership");
        }
      }

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role,
        event,
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

      const date = request.query.date ?? new Date().toISOString().slice(0, 10);

      return {
        clubId: request.params.clubId,
        client: summarizeClient(client),
        role: "coach",
        workbench: await context.store.getCoachToday(request.params.clubId, {
          date,
          userId: auth?.user.id ?? "user-coach-1",
          roles: auth?.membership.roles ?? ["coach"],
        }),
        sync: {
          latestRuns: (await context.store.listExternalSyncRuns(request.params.clubId)).slice(0, 3),
        },
      };
    },
  );
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

function summarizeStudent(student: StudentDetail | StudentListItem) {
  return {
    id: student.id,
    name: student.name,
    birthDate: student.birthDate,
    gender: student.gender,
    currentLevel: student.currentLevel,
    teams: student.teams,
    primaryContact: student.primaryContact,
    lessonBalance: student.lessonBalance,
    insuranceStatus: student.insuranceStatus,
    attendanceSnapshot: student.attendanceSnapshot,
  };
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

function resolveAppRole(roles: ClubUserRole[] | undefined): AppRole {
  if (!roles) {
    return "coach";
  }

  if (roles.some((role) => adminRoles.has(role) || role === "coach")) {
    return "coach";
  }

  return "parent";
}
