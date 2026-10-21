import {radarComparisonSchema} from "./radar-comparison-schemas.js";
import {workbenchSchema} from './backoffice-workbench-schemas.js';
import {clubPresentationSchema} from './club-presentation-schemas.js';
import {biSchemas} from "./backoffice-bi-schemas.js";
import {importSchemas,exportSchema} from "./backoffice-import-schemas.js";
import {backofficeTaskSchemas} from "./backoffice-task-schemas.js";
import {backofficeStandardSchemas} from "./backoffice-standard-schemas.js";
import {backofficeModelSchemas} from "./backoffice-model-schemas.js";
import {backofficeMappingSchemas} from "./backoffice-mapping-schemas.js";
import {backofficePlanSchemas} from "./backoffice-plan-schemas.js";
import { backofficeResources } from "../application/backoffice-resources.js";
import { managementSchemas, optionSchema, resourceIndexSchema, grantsSchema, saveGrantsSchema, scoutManagementSchemas, backofficeTrainingSchemas } from "./backoffice-management-schemas.js";
import { scoutSchemas } from "./scout-player-schemas.js";
import { backofficeSchemas, backofficeCatalogSchema } from "./backoffice-schemas.js";
import { temporaryRosterSchemas } from "./temporary-roster-schemas.js";
import { parentResultSchema } from "./parent-result-schemas.js";
import { evaluationSchemas } from "./student-evaluation-schemas.js";
import { errorResponse, schemas } from "./schemas.js";
import { workflowSchemas } from "./assessment-workflow-schemas.js";
import { trainingRecordSchemas } from "./training-record-schemas.js";

interface RouteSchema {
  params?: unknown;
  querystring?: unknown;
  headers?: unknown;
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
  const requiredHeaders = objectSchemaRequired(schema.headers);
  const headers = objectSchemaProperties(schema.headers).map(([name, property]) => ({
    name,
    in: "header",
    required: requiredHeaders.has(name),
    schema: property,
  }));
  const allParameters = [...params, ...query, ...headers];

  return allParameters.length ? allParameters : undefined;
}

function objectSchemaProperties(schema: unknown): Array<[string, unknown]> {
  if (!schema || typeof schema !== "object" || !("properties" in schema)) {
    return [];
  }

  const properties = (schema as { properties?: Record<string, unknown> }).properties;
  return properties ? Object.entries(properties) : [];
}

function objectSchemaRequired(schema: unknown) {
  if (!schema || typeof schema !== "object" || !("required" in schema)) {
    return new Set<string>();
  }

  const required = (schema as { required?: unknown }).required;
  return new Set(Array.isArray(required) ? required.filter((name): name is string => typeof name === "string") : []);
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
      "/backoffice/api/bi-catalog":{get:operation("GET","backoffice-bi-catalog",biSchemas.catalog)},
      "/backoffice/api/bi-snapshots":{post:operation("POST","backoffice-bi-create",biSchemas.create)},
      "/backoffice/api/bi-snapshots/{id}":{get:operation("GET","backoffice-bi-detail",biSchemas.detail)},
      "/backoffice/api/bi-snapshots/{id}/export":{post:operation("POST","backoffice-bi-export",biSchemas.export)},

      "/backoffice/api/workbench":{get:operation("GET","backoffice-workbench",workbenchSchema)},
      "/backoffice/api/import-templates":{get:operation("GET","backoffice-import-templates",importSchemas.templates)},
      "/backoffice/api/import-templates/{key}":{get:operation("GET","backoffice-import-template",importSchemas.template)},
      "/backoffice/api/imports":{get:operation("GET","backoffice-imports",importSchemas.list)},
      "/backoffice/api/imports/{id}":{get:operation("GET","backoffice-import-detail",importSchemas.detail)},
      "/backoffice/api/imports/preview":{post:operation("POST","backoffice-import-preview",importSchemas.preview)},
      "/backoffice/api/imports/{id}/failures-export":{post:operation("POST","backoffice-import-failures",importSchemas.failures)},
      "/backoffice/api/imports/{id}/confirm":{post:operation("POST","backoffice-import-confirm",importSchemas.confirm)},
      "/backoffice/api/exports/{key}":{post:operation("POST","backoffice-export",exportSchema)},

      "/backoffice/api/task-catalog":{get:operation("GET","backoffice-task-catalog",backofficeTaskSchemas.catalog)},
      "/backoffice/api/assessment-tasks":{get:operation("GET","backoffice-tasks",backofficeTaskSchemas.list),post:operation("POST","backoffice-task-create",backofficeTaskSchemas.create)},
      "/backoffice/api/assessment-tasks/{id}":{get:operation("GET","backoffice-task-detail",backofficeTaskSchemas.detail)},
      "/backoffice/api/assessment-tasks/{id}/students/{studentId}/entries":{put:operation("PUT","backoffice-task-save",backofficeTaskSchemas.save)},
      "/backoffice/api/assessment-tasks/{id}/students/{studentId}/handling":{put:operation("PUT","backoffice-task-handling",backofficeTaskSchemas.handling)},
      "/backoffice/api/assessment-tasks/{id}/publications":{post:operation("POST","backoffice-task-publication",backofficeTaskSchemas.publish)},
      "/backoffice/api/standards":{get:operation("GET","backoffice-standards",backofficeStandardSchemas.list),post:operation("POST","backoffice-standard-create",backofficeStandardSchemas.create)},
      "/backoffice/api/standards/{id}":{get:operation("GET","backoffice-standard-detail",backofficeStandardSchemas.detail),put:operation("PUT","backoffice-standard-update",backofficeStandardSchemas.update)},
      "/backoffice/api/standards/{id}/compare":{post:operation("POST","backoffice-standard-compare",backofficeStandardSchemas.compare)},
      "/backoffice/api/standards/{id}/transitions":{post:operation("POST","backoffice-standard-transition",backofficeStandardSchemas.transition)},
      "/backoffice/api/model-catalog":{get:operation("GET","backoffice-model-catalog",backofficeModelSchemas.catalog)},
      "/backoffice/api/models":{get:operation("GET","backoffice-models",backofficeModelSchemas.list),post:operation("POST","backoffice-model-create",backofficeModelSchemas.create)},
      "/backoffice/api/models/{id}":{get:operation("GET","backoffice-model-detail",backofficeModelSchemas.detail),put:operation("PUT","backoffice-model-update",backofficeModelSchemas.update)},
      "/backoffice/api/models/{id}/trial":{post:operation("POST","backoffice-model-trial",backofficeModelSchemas.trial)},
      "/backoffice/api/models/{id}/display":{put:operation("PUT","backoffice-model-display",backofficeModelSchemas.display)},
      "/backoffice/api/models/{id}/transitions":{post:operation("POST","backoffice-model-transition",backofficeModelSchemas.transition)},
      "/backoffice/api/mapping-items":{get:operation("GET","backoffice-mapping-items",backofficeMappingSchemas.items)},
      "/backoffice/api/mappings":{get:operation("GET","backoffice-mappings",backofficeMappingSchemas.list),post:operation("POST","backoffice-mapping-create",backofficeMappingSchemas.create)},
      "/backoffice/api/mappings/{id}":{get:operation("GET","backoffice-mapping-detail",backofficeMappingSchemas.detail),put:operation("PUT","backoffice-mapping-update",backofficeMappingSchemas.update)},
      "/backoffice/api/mappings/{id}/trial":{post:operation("POST","backoffice-mapping-trial",backofficeMappingSchemas.trial)},
      "/backoffice/api/mappings/{id}/transitions":{post:operation("POST","backoffice-mapping-transition",backofficeMappingSchemas.transition)},
      "/backoffice/api/plans":{get:operation("GET","backoffice-plans",backofficePlanSchemas.list),post:operation("POST","backoffice-plan-create",backofficePlanSchemas.create)},
      "/backoffice/api/plans/{id}":{get:operation("GET","backoffice-plan-detail",backofficePlanSchemas.detail),put:operation("PUT","backoffice-plan-save",backofficePlanSchemas.update)},
      "/backoffice/api/training-records": {get:operation("GET","backoffice-training-records",backofficeTrainingSchemas.list),put:operation("PUT","backoffice-training-correction",backofficeTrainingSchemas.save)},
      "/backoffice/api/scouts": {get:operation("GET","backoffice-scouts",scoutManagementSchemas.list),post:operation("POST","backoffice-scout-create",scoutManagementSchemas.create)},
      "/backoffice/api/scouts/{id}/enroll": {post:operation("POST","backoffice-scout-enroll",scoutManagementSchemas.enroll)},
      ...Object.fromEntries(backofficeResources.flatMap(resource => { const schemas=managementSchemas(resource); const path=`/backoffice/api/resources/${resource.key}`; return [[path,{get:operation("GET",path,schemas.list),post:operation("POST",path,schemas.create)}],[`${path}/{id}`,{get:operation("GET",`${path}-detail`,schemas.detail),put:operation("PUT",`${path}-save`,schemas.update)}]]; })),
      "/backoffice/api/resources": {get:operation("GET","backoffice-resources",resourceIndexSchema)},
      "/backoffice/api/options/{key}": {get:operation("GET","backoffice-options",optionSchema)},
      "/backoffice/api/grants": {get:operation("GET","backoffice-grants",grantsSchema),put:operation("PUT","backoffice-grants-save",saveGrantsSchema)},
      "/backoffice/api/catalog/{table}": { get: operation("GET", "backoffice-catalog", backofficeCatalogSchema) },
      "/backoffice/api/login": { post: operation("POST", "backoffice-login", backofficeSchemas.login) },
      "/backoffice/api/session": { get: operation("GET", "backoffice-session", backofficeSchemas.session) },
      "/backoffice/api/logout": { post: operation("POST", "backoffice-logout", backofficeSchemas.logout) },
      "/clubs/{clubId}/app-clients/{clientId}/coach/scout-players": {
        get: operation("GET", "scout-players", { params: scoutSchemas.params, querystring: scoutSchemas.query, response: { 200: scoutSchemas.list } }),
        post: operation("POST", "scout-player-create", { params: scoutSchemas.params, body: scoutSchemas.create, response: { 200: scoutSchemas.created, 201: scoutSchemas.created } }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/temporary-roster": {
        get: operation("GET", "temporary-roster", { params: temporaryRosterSchemas.params, response: { 200: temporaryRosterSchemas.response } }),
        post: operation("POST", "temporary-roster-change", { params: temporaryRosterSchemas.params, body: temporaryRosterSchemas.body, response: { 200: temporaryRosterSchemas.response } }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/scout-players/{studentId}": {
        get: operation("GET", "scout-player-detail", { params: scoutSchemas.detailParams, response: { 200: scoutSchemas.detail } }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/confirmed-results": { get: operation("GET", "parent-confirmed-results", { ...schemas.appClientStudentParams, ...parentResultSchema }) },
      "/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/evaluations": { get: operation("GET", "student-evaluations", { params: evaluationSchemas.params, response: { 200: evaluationSchemas.list } }) },
      "/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/evaluations/{teamId}": { put: operation("PUT", "student-evaluation-save", { params: evaluationSchemas.saveParams, body: evaluationSchemas.body, response: { 200: evaluationSchemas.saved } }) },
      "/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/training-records": {
        get: operation("GET", "training-records", { params: trainingRecordSchemas.params, response: { 200: trainingRecordSchemas.listResponse } }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/training-records/{eventId}": {
        patch: operation("PATCH", "training-record-correction", { params: trainingRecordSchemas.correctionParams, body: trainingRecordSchemas.correction, response: { 200: trainingRecordSchemas.correctionResponse } }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/training-records/{eventId}/leave": {
        post: operation("POST", "training-record-leave", { params: trainingRecordSchemas.correctionParams, body: trainingRecordSchemas.leave, response: { 200: trainingRecordSchemas.leaveResponse } }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}/publications": { post: operation("POST", "assessment-publications", workflowSchemas.publish) },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}/workflow": { get: operation("GET", "assessment-workflow", workflowSchemas.summary) },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}/students/{studentId}/entries": { put: operation("PUT", "assessment-entries", workflowSchemas.save) },
      "/clubs/{clubId}/app-clients/{clientId}/coach/assessment-tasks/{taskId}/students/{studentId}/history": { get: operation("GET", "assessment-history", workflowSchemas.history) },
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
      "/clubs/{clubId}/app-clients/{clientId}/session/role": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/session/role", {
          ...schemas.appClientParams,
          ...schemas.appClientSessionRole,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/session/logout": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/session/logout", {
          ...schemas.appClientParams,
          ...schemas.appClientSessionLogout,
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
          ...schemas.appClientCoachTeamQuery,
          ...schemas.appClientCoachTeam,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/team/ability-overview": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/team/ability-overview", {
          ...schemas.appClientParams,
          ...schemas.appClientCoachTeamQuery,
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
      "/clubs/{clubId}/app-clients/{clientId}/content/presentation": {get:operation("GET","club-presentation",{...schemas.appClientParams,...clubPresentationSchema})},
      "/clubs/{clubId}/app-clients/{clientId}/content/articles": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/content/articles", {
          ...schemas.appClientParams,
          ...schemas.appClientContentArticles,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/content/faqs": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/content/faqs", {
          ...schemas.appClientParams,
          ...schemas.appClientContentFaqs,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/venues": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/venues", {
          ...schemas.appClientParams,
          ...schemas.appClientVenues,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach-team": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach-team", {
          ...schemas.appClientParams,
          ...schemas.appClientClubCoachTeam,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/activity-summaries": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/activity-summaries", {
          ...schemas.appClientStudentParams,
          ...schemas.appClientActivitySummaryQuery,
          ...schemas.appClientActivitySummaries,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/radar-comparison":{get:operation("GET","/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/radar-comparison",{...schemas.appClientStudentParams,...radarComparisonSchema})},
      "/clubs/{clubId}/app-clients/{clientId}/coach/students/{studentId}/radar-comparison":{get:operation("GET","/clubs/{clubId}/app-clients/{clientId}/coach/students/{studentId}/radar-comparison",{...schemas.appClientStudentParams,...radarComparisonSchema})},
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
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/match": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/match", {
          ...schemas.appClientEventParams,
          ...schemas.appClientCoachMatchDetail,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/match/events": {
        post: operation("POST", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/match/events", {
          ...schemas.appClientEventParams,
          ...schemas.appClientCoachMatchEventCreate,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/training-project-tree": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/training-project-tree", {
          ...schemas.appClientParams,
          ...schemas.appClientTrainingProjectTreeQuery,
          ...schemas.appClientTrainingProjectTree,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-projects": {
        put: operation("PUT", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-projects", {
          ...schemas.appClientEventParams,
          ...schemas.appClientTrainingProjectsUpdate,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-content-assessments": {
        get: operation("GET", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-content-assessments", {
          ...schemas.appClientEventParams,
          ...schemas.appClientTrainingContentAssessments,
        }),
        put: operation("PUT", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-content-assessments", {
          ...schemas.appClientEventParams,
          ...schemas.appClientTrainingContentAssessmentsUpdate,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/attendance": {
        put: operation("PUT", "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/attendance", {
          ...schemas.appClientEventParams,
          ...schemas.appClientAttendance,
        }),
      },
      "/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/lesson-confirmation": {
        get: { ...operation("GET", "retired-lesson-read", { ...schemas.appClientEventParams, response: { 410: errorResponse } }), deprecated: true },
        post: { ...operation("POST", "retired-lesson-confirm", { ...schemas.appClientEventParams, response: { 410: errorResponse } }), deprecated: true },
        patch: { ...operation("PATCH", "retired-lesson-correct", { ...schemas.appClientEventParams, response: { 410: errorResponse } }), deprecated: true },
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
