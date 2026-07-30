import { errorResponse, schemas } from "./schemas.js";

interface RouteSchema {
  params?: unknown;
  querystring?: unknown;
  body?: unknown;
  response?: Record<string, unknown>;
}

const jsonContent = (schema: unknown) => ({
  content: {
    "application/json": {
      schema,
    },
  },
});

function responses(schema: RouteSchema) {
  const source = schema.response ?? { 500: errorResponse };

  return Object.fromEntries(
    Object.entries(source).map(([statusCode, responseSchema]) => [
      statusCode,
      {
        description: statusCode.startsWith("2") ? "Success" : "Error",
        ...jsonContent(responseSchema),
      },
    ]),
  );
}

function requestBody(schema: RouteSchema) {
  return schema.body
    ? {
        required: true,
        ...jsonContent(schema.body),
      }
    : undefined;
}

function parameters(schema: RouteSchema) {
  const params = objectSchemaProperties(schema.params).map(([name, property]) => ({
    name,
    in: "path",
    required: true,
    schema: property,
  }));
  const query = objectSchemaProperties(schema.querystring).map(([name, property]) => ({
    name,
    in: "query",
    required: false,
    schema: property,
  }));
  const allParameters = [...params, ...query];

  return allParameters.length ? allParameters : undefined;
}

function objectSchemaProperties(schema: unknown): Array<[string, unknown]> {
  if (!schema || typeof schema !== "object" || !("properties" in schema)) {
    return [];
  }

  const properties = (schema as { properties?: Record<string, unknown> }).properties;
  return properties ? Object.entries(properties) : [];
}

function operation(method: string, path: string, schema: RouteSchema) {
  return {
    operationId: `${method.toLowerCase()} ${path}`,
    parameters: parameters(schema),
    requestBody: requestBody(schema),
    responses: responses(schema),
  };
}

export function buildOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Football Club Management API",
      version: "0.1.0",
    },
    components: {
      schemas: {
        ErrorResponse: errorResponse,
      },
    },
    paths: {
      "/health": { get: operation("GET", "/health", schemas.health) },
      "/clubs": { get: operation("GET", "/clubs", schemas.clubsResponse) },
      "/app-clients/resolve": {
        get: operation("GET", "/app-clients/resolve", schemas.resolveAppClient),
      },
      "/clubs/{clubId}/capabilities": {
        get: operation("GET", "/clubs/{clubId}/capabilities", {
          ...schemas.clubParams,
          ...schemas.clubCapabilitiesQuery,
          ...schemas.clubCapabilities,
        }),
      },
      "/clubs/{clubId}/admin/app-clients": {
        get: operation("GET", "/clubs/{clubId}/admin/app-clients", {
          ...schemas.clubParams,
          ...schemas.clubAppClients,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/children": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/children", {
          ...schemas.appClientParams,
          ...schemas.appClientParentChildren,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/wechat-login": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/wechat-login", {
          ...schemas.appClientParams,
          ...schemas.appClientWechatLogin,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/home": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/home", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientParentHome,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/schedule": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/schedule", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientScheduleQuery,
          ...schemas.appClientParentSchedule,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/calendar": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/calendar", {
          ...schemas.appClientParams,
          ...schemas.appClientScheduleQuery,
          ...schemas.appClientParentCalendar,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/reminders": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/reminders", {
          ...schemas.appClientParams,
          ...schemas.appClientParentReminders,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/private-lessons": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/private-lessons", {
          ...schemas.appClientParams,
          ...schemas.appClientParentPrivateLessonsQuery,
        }),
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/parent/private-lessons", {
          ...schemas.appClientParams,
          ...schemas.appClientParentPrivateLessons,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/team": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/team", {
          ...schemas.appClientParams,
          ...schemas.appClientCoachTeam,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/team/ability-overview": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/team/ability-overview", {
          ...schemas.appClientParams,
          ...schemas.appClientCoachTeamAbilityOverview,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/students/{studentId}/radar": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/students/{studentId}/radar", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientCoachStudentRadar,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/change-requests": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/change-requests", {
          ...schemas.appClientEventParams,
          ...schemas.appClientCoachEventChangeRequest,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/training-coverage": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/training-coverage", {
          ...schemas.appClientParams,
          ...schemas.appClientCoachTrainingCoverage,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks", {
          ...schemas.appClientParams,
          ...schemas.appClientCoachAssessmentTasks,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/activity-summaries": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/activity-summaries", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientActivitySummaryQuery,
          ...schemas.appClientActivitySummaries,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/growth-summary": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/growth-summary", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientGrowthSummary,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/status-summary": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/status-summary", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientStatusSummary,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/ability-metrics/{metricId}": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/ability-metrics/{metricId}", {
          ...schemas.appClientMetricParams,
          ...schemas.appClientMetricDetail,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/privacy": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/privacy", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientPrivacyState,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/privacy/requests": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/privacy/requests", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientPrivacyRequestCreate,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/events/{eventId}": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/events/{eventId}", {
          ...schemas.appClientEventParams,
          ...schemas.appClientEventDetail,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/home": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/home", {
          ...schemas.appClientParams,
          ...schemas.appClientCoachHomeQuery,
          ...schemas.appClientCoachHome,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/workbench": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/workbench", {
          ...schemas.appClientEventParams,
          ...schemas.appClientCoachEventWorkbench,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/training-project-tree": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/training-project-tree", {
          ...schemas.appClientParams,
          ...schemas.appClientTrainingProjectTree,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-projects": {
        put: operation("PUT", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-projects", {
          ...schemas.appClientEventParams,
          ...schemas.appClientTrainingProjectsUpdate,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/attendance": {
        put: operation("PUT", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/attendance", {
          ...schemas.appClientEventParams,
          ...schemas.appClientAttendance,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/lesson-confirmation": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/lesson-confirmation", {
          ...schemas.appClientEventParams,
          ...schemas.appClientLessonConfirmation,
        }),
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/lesson-confirmation", {
          ...schemas.appClientEventParams,
          ...schemas.appClientLessonConfirmationCreate,
        }),
        patch: operation("PATCH", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/lesson-confirmation", {
          ...schemas.appClientEventParams,
          ...schemas.appClientLessonConfirmationPatch,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/matches": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/coach/matches", {
          ...schemas.appClientParams,
          ...schemas.appClientRecordMatch,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/tactical-board/formations": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/tactical-board/formations", {
          ...schemas.appClientParams,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/tactical-board": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/tactical-board", {
          ...schemas.appClientEventParams,
        }),
        put: operation("PUT", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/tactical-board", {
          ...schemas.appClientEventParams,
          body: { type: "object", required: ["formationName", "players"], properties: { formationName: { type: "string" }, players: { type: "array", items: { type: "object" } } } },
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessments": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/coach/assessments", {
          ...schemas.appClientParams,
          ...schemas.appClientRecordAssessment,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessments/templates/{templateId}/form": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/assessments/templates/{templateId}/form", {
          ...schemas.appClientAssessmentTemplateParams,
          ...schemas.appClientAssessmentFormQuery,
          ...schemas.appClientAssessmentForm,
        }),
      },
      "/clubs/{clubId}/config": { get: operation("GET", "/clubs/{clubId}/config", schemas.clubConfig) },
      "/clubs/{clubId}/teams": { post: operation("POST", "/clubs/{clubId}/teams", schemas.createTeam) },
      "/clubs/{clubId}/teams/{teamId}/members": {
        post: operation("POST", "/clubs/{clubId}/teams/{teamId}/members", schemas.joinTeam),
      },
      "/clubs/{clubId}/calendar/events": {
        get: operation("GET", "/clubs/{clubId}/calendar/events", schemas.calendarEvents),
      },
      "/clubs/{clubId}/coach/today": {
        get: operation("GET", "/clubs/{clubId}/coach/today", schemas.coachToday),
      },
      "/clubs/{clubId}/students/{studentId}/timeline": {
        get: operation("GET", "/clubs/{clubId}/students/{studentId}/timeline", schemas.studentTimeline),
      },
      "/clubs/{clubId}/admin/data/config": {
        get: operation("GET", "/clubs/{clubId}/admin/data/config", schemas.dataCapabilityConfig),
      },
      "/clubs/{clubId}/admin/integrations/connections": {
        get: operation("GET", "/clubs/{clubId}/admin/integrations/connections", {
          ...schemas.clubParams,
          ...schemas.integrationConnections,
        }),
      },
      "/clubs/{clubId}/admin/integrations/sync-policies": {
        get: operation("GET", "/clubs/{clubId}/admin/integrations/sync-policies", {
          ...schemas.clubParams,
          ...schemas.syncPolicies,
        }),
        post: operation("POST", "/clubs/{clubId}/admin/integrations/sync-policies", {
          ...schemas.clubParams,
          ...schemas.createSyncPolicy,
        }),
      },
      "/clubs/{clubId}/admin/integrations/sync-policies/due": {
        get: operation("GET", "/clubs/{clubId}/admin/integrations/sync-policies/due", {
          ...schemas.clubParams,
          ...schemas.dueSyncPolicies,
        }),
      },
      "/clubs/{clubId}/admin/integrations/sync-policies/run-due": {
        post: operation("POST", "/clubs/{clubId}/admin/integrations/sync-policies/run-due", {
          ...schemas.clubParams,
          ...schemas.runDueSyncPolicies,
        }),
      },
      "/clubs/{clubId}/admin/integrations/sync-policies/{policyId}": {
        patch: operation("PATCH", "/clubs/{clubId}/admin/integrations/sync-policies/{policyId}", {
          ...schemas.clubSyncPolicyParams,
          ...schemas.updateSyncPolicy,
        }),
      },
      "/clubs/{clubId}/admin/integrations/sync-policies/{policyId}/run": {
        post: operation("POST", "/clubs/{clubId}/admin/integrations/sync-policies/{policyId}/run", {
          ...schemas.clubSyncPolicyParams,
          ...schemas.runSyncPolicy,
        }),
      },
      "/clubs/{clubId}/admin/integrations/wps/webhook": {
        post: operation("POST", "/clubs/{clubId}/admin/integrations/wps/webhook", {
          ...schemas.clubParams,
          ...schemas.wpsWebhook,
        }),
      },
      "/clubs/{clubId}/admin/students": {
        get: operation("GET", "/clubs/{clubId}/admin/students", {
          ...schemas.clubParams,
          ...schemas.adminStudentListQuery,
          ...schemas.operationalStudentList,
        }),
      },
      "/clubs/{clubId}/admin/students/{studentId}": {
        get: operation("GET", "/clubs/{clubId}/admin/students/{studentId}", schemas.operationalStudentDetail),
      },
      "/clubs/{clubId}/admin/privacy": {
        get: operation("GET", "/clubs/{clubId}/admin/privacy", {
          ...schemas.clubParams,
          ...schemas.privacyOverview,
        }),
      },
      "/clubs/{clubId}/admin/privacy/audit-logs": {
        get: operation("GET", "/clubs/{clubId}/admin/privacy/audit-logs", {
          ...schemas.clubParams,
          ...schemas.privacyAuditLogs,
        }),
      },
      "/clubs/{clubId}/admin/privacy/retention/dry-run": {
        get: operation("GET", "/clubs/{clubId}/admin/privacy/retention/dry-run", {
          ...schemas.clubParams,
          ...schemas.privacyRetentionDryRun,
        }),
      },
      "/clubs/{clubId}/admin/privacy/export-preview": {
        post: operation("POST", "/clubs/{clubId}/admin/privacy/export-preview", {
          ...schemas.clubParams,
          ...schemas.privacyExportPreview,
        }),
      },
      "/clubs/{clubId}/admin/privacy/consents": {
        put: operation("PUT", "/clubs/{clubId}/admin/privacy/consents", {
          ...schemas.clubParams,
          ...schemas.privacyConsentUpsert,
        }),
      },
      "/clubs/{clubId}/admin/privacy/requests": {
        get: operation("GET", "/clubs/{clubId}/admin/privacy/requests", {
          ...schemas.clubParams,
          ...schemas.privacyRequests,
        }),
      },
      "/clubs/{clubId}/admin/privacy/requests/{requestId}": {
        patch: operation("PATCH", "/clubs/{clubId}/admin/privacy/requests/{requestId}", {
          ...schemas.clubPrivacyRequestParams,
          ...schemas.privacyRequestResolve,
        }),
      },
      "/clubs/{clubId}/students/{studentId}/status-summary": {
        get: operation("GET", "/clubs/{clubId}/students/{studentId}/status-summary", {
          ...schemas.clubStudentParams,
          ...schemas.studentOperationalStatusSummary,
        }),
      },
      "/clubs/{clubId}/admin/students/{studentId}/lesson-ledger": {
        get: operation("GET", "/clubs/{clubId}/admin/students/{studentId}/lesson-ledger", {
          ...schemas.clubStudentParams,
          ...schemas.lessonLedger,
        }),
      },
      "/clubs/{clubId}/admin/students/{studentId}/lesson-adjustments": {
        post: operation("POST", "/clubs/{clubId}/admin/students/{studentId}/lesson-adjustments", {
          ...schemas.clubStudentParams,
          ...schemas.lessonAdjustment,
        }),
      },
      "/clubs/{clubId}/admin/students/{studentId}/insurance-policies": {
        get: operation("GET", "/clubs/{clubId}/admin/students/{studentId}/insurance-policies", {
          ...schemas.clubStudentParams,
          ...schemas.insurancePolicies,
        }),
        post: operation("POST", "/clubs/{clubId}/admin/students/{studentId}/insurance-policies", {
          ...schemas.clubStudentParams,
          ...schemas.createInsurancePolicy,
        }),
      },
      "/clubs/{clubId}/admin/import-preview": {
        get: operation("GET", "/clubs/{clubId}/admin/import-preview", schemas.importPreview),
      },
      "/clubs/{clubId}/admin/imports/excel/preview": {
        post: operation("POST", "/clubs/{clubId}/admin/imports/excel/preview", schemas.excelImportPreview),
      },
      "/clubs/{clubId}/admin/sync-runs": {
        get: operation("GET", "/clubs/{clubId}/admin/sync-runs", schemas.syncRuns),
      },
      "/clubs/{clubId}/admin/sync-runs/{syncRunId}": {
        get: operation("GET", "/clubs/{clubId}/admin/sync-runs/{syncRunId}", schemas.syncRunDetail),
      },
      "/clubs/{clubId}/admin/external-records/{rawRecordId}/confirm": {
        post: operation(
          "POST",
          "/clubs/{clubId}/admin/external-records/{rawRecordId}/confirm",
          schemas.confirmExternalRecord,
        ),
      },
      "/clubs/{clubId}/admin/calendar/events": {
        post: operation("POST", "/clubs/{clubId}/admin/calendar/events", schemas.createCalendarEvent),
      },
      "/clubs/{clubId}/admin/calendar/events/{eventId}/participants": {
        put: operation("PUT", "/clubs/{clubId}/admin/calendar/events/{eventId}/participants", schemas.eventParticipants),
      },
      "/clubs/{clubId}/admin/calendar/conflicts": {
        post: operation("POST", "/clubs/{clubId}/admin/calendar/conflicts", schemas.scheduleConflicts),
      },
      "/clubs/{clubId}/training/sessions": {
        get: operation("GET", "/clubs/{clubId}/training/sessions", {
          ...schemas.clubParams,
          ...schemas.trainingSessionQuery,
          ...schemas.trainingSessionList,
        }),
        post: operation("POST", "/clubs/{clubId}/training/sessions", schemas.createTrainingSession),
      },
      "/clubs/{clubId}/training/sessions/ensure": {
        post: operation("POST", "/clubs/{clubId}/training/sessions/ensure", {
          ...schemas.clubParams,
          ...schemas.ensureTrainingSession,
        }),
      },
      "/clubs/{clubId}/training/sessions/{trainingSessionId}/observations": {
        post: operation(
          "POST",
          "/clubs/{clubId}/training/sessions/{trainingSessionId}/observations",
          schemas.recordTrainingObservation,
        ),
      },
      "/clubs/{clubId}/matches": {
        get: operation("GET", "/clubs/{clubId}/matches", {
          ...schemas.clubParams,
          ...schemas.matchDetailQuery,
          ...schemas.matchDetail,
        }),
        post: operation("POST", "/clubs/{clubId}/matches", schemas.recordMatch),
      },
      "/clubs/{clubId}/assessments": { post: operation("POST", "/clubs/{clubId}/assessments", schemas.recordAssessment) },
      "/clubs/{clubId}/catalog/ability-metrics": {
        get: operation("GET", "/clubs/{clubId}/catalog/ability-metrics", schemas.abilityMetrics),
      },
      "/clubs/{clubId}/students/{studentId}/metrics": {
        get: operation("GET", "/clubs/{clubId}/students/{studentId}/metrics", schemas.studentMetrics),
      },
      "/clubs/{clubId}/students/{studentId}/derived-metrics/attacking-contribution": {
        post: operation(
          "POST",
          "/clubs/{clubId}/students/{studentId}/derived-metrics/attacking-contribution",
          schemas.derivedMetric,
        ),
      },
    },
  };
}
