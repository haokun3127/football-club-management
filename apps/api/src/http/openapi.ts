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

function operation(method: string, path: string, schema: RouteSchema) {
  return {
    operationId: `${method.toLowerCase()} ${path}`,
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
      "/clubs/{clubId}/config": { get: operation("GET", "/clubs/{clubId}/config", schemas.clubConfig) },
      "/clubs/{clubId}/teams": { post: operation("POST", "/clubs/{clubId}/teams", schemas.createTeam) },
      "/clubs/{clubId}/teams/{teamId}/members": {
        post: operation("POST", "/clubs/{clubId}/teams/{teamId}/members", schemas.joinTeam),
      },
      "/clubs/{clubId}/calendar/events": {
        get: operation("GET", "/clubs/{clubId}/calendar/events", schemas.calendarEvents),
      },
      "/clubs/{clubId}/students/{studentId}/timeline": {
        get: operation("GET", "/clubs/{clubId}/students/{studentId}/timeline", schemas.studentTimeline),
      },
      "/clubs/{clubId}/admin/data/config": {
        get: operation("GET", "/clubs/{clubId}/admin/data/config", schemas.dataCapabilityConfig),
      },
      "/clubs/{clubId}/admin/import-preview": {
        get: operation("GET", "/clubs/{clubId}/admin/import-preview", schemas.importPreview),
      },
      "/clubs/{clubId}/admin/sync-runs": {
        get: operation("GET", "/clubs/{clubId}/admin/sync-runs", schemas.syncRuns),
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
        post: operation("POST", "/clubs/{clubId}/training/sessions", schemas.createTrainingSession),
      },
      "/clubs/{clubId}/matches": { post: operation("POST", "/clubs/{clubId}/matches", schemas.recordMatch) },
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
