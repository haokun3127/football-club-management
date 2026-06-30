import type { FastifyInstance } from "fastify";
import type {
  CreateExternalSyncPolicyInput,
  ExcelImportPreviewInput,
  ImportPreviewFilters,
  PrivacyConsentUpsertInput,
  PrivacyExportPreviewInput,
  PrivacyRequestResolveInput,
  StudentListFilters,
  UpdateExternalSyncPolicyInput,
  WpsWebhookIngestionInput,
} from "../data-capability/types.js";
import { schemas } from "../http/schemas.js";
import { readExcelWorksheetRecords } from "../integration/excel-import.js";
import type { RouteContext } from "./context.js";

export async function registerDataCapabilityRoutes(app: FastifyInstance, context: RouteContext) {
  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/integrations/connections",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.integrationConnections,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      return context.store.listExternalConnections(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/integrations/sync-policies",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.syncPolicies,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      return context.store.listExternalSyncPolicies(request.params.clubId);
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: {
      now?: string;
    };
  }>(
    "/clubs/:clubId/admin/integrations/sync-policies/run-due",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.runDueSyncPolicies,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const result = await context.store.runDueExternalSyncPolicies(
          request.params.clubId,
          request.body.now ?? new Date().toISOString(),
        );
        return reply.code(201).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Due sync execution failed";
        return context.sendError(reply, 400, "due_sync_failed", message);
      }
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: CreateExternalSyncPolicyInput;
  }>(
    "/clubs/:clubId/admin/integrations/sync-policies",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.createSyncPolicy,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const policy = await context.store.createExternalSyncPolicy(request.params.clubId, request.body);
        return reply.code(201).send(policy);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync policy creation failed";
        return context.sendError(reply, 400, "invalid_sync_policy", message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
    Querystring: {
      now?: string;
    };
  }>(
    "/clubs/:clubId/admin/integrations/sync-policies/due",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.dueSyncPolicies,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        return await context.store.planDueExternalSyncPolicies(
          request.params.clubId,
          request.query.now ?? new Date().toISOString(),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Due sync policy planning failed";
        return context.sendError(reply, 400, "invalid_sync_schedule", message);
      }
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: WpsWebhookIngestionInput;
  }>(
    "/clubs/:clubId/admin/integrations/wps/webhook",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.wpsWebhook,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const result = await context.store.ingestWpsWebhook(request.params.clubId, {
          ...request.body,
          security: webhookSecurityFromHeaders(request.headers) ?? request.body.security,
        });
        return reply.code(202).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "WPS webhook ingestion failed";
        return context.sendError(reply, 400, "invalid_wps_webhook", message);
      }
    },
  );

  app.patch<{
    Params: {
      clubId: string;
      policyId: string;
    };
    Body: UpdateExternalSyncPolicyInput;
  }>(
    "/clubs/:clubId/admin/integrations/sync-policies/:policyId",
    {
      schema: {
        ...schemas.clubSyncPolicyParams,
        ...schemas.updateSyncPolicy,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const policy = await context.store.updateExternalSyncPolicy(request.params.clubId, request.params.policyId, request.body);
        if (!policy) {
          return context.sendError(reply, 404, "not_found", "Sync policy not found");
        }

        return policy;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync policy update failed";
        return context.sendError(reply, 400, "invalid_sync_policy", message);
      }
    },
  );

  app.post<{
    Params: {
      clubId: string;
      policyId: string;
    };
  }>(
    "/clubs/:clubId/admin/integrations/sync-policies/:policyId/run",
    {
      schema: {
        ...schemas.clubSyncPolicyParams,
        ...schemas.runSyncPolicy,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const result = await context.store.runExternalSyncPolicy(request.params.clubId, request.params.policyId);
        if (!result) {
          return context.sendError(reply, 404, "not_found", "Sync policy not found");
        }

        return reply.code(201).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync policy run failed";
        return context.sendError(reply, 400, "sync_policy_not_runnable", message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
    Querystring: StudentListFilters;
  }>(
    "/clubs/:clubId/admin/students",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.adminStudentListQuery,
        ...schemas.operationalStudentList,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      return context.store.listOperationalStudents(request.params.clubId, request.query);
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/admin/students/:studentId",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.operationalStudentDetail,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const detail = await context.store.getOperationalStudentDetail(request.params.clubId, request.params.studentId);

      if (!detail) {
        return context.sendError(reply, 404, "not_found", "Student not found");
      }

      await auditRequest(context, request, reply, request.params.clubId, {
        action: "read",
        targetType: "student",
        targetId: request.params.studentId,
        fieldKeys: ["student.detail"],
        dataClasses: ["personal", "sensitive", "minor_sensitive"],
        purpose: "admin student detail read",
      });
      return detail;
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/privacy",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.privacyOverview,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      return context.store.getPrivacyOverview(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/privacy/audit-logs",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.privacyAuditLogs,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      return context.store.listPrivacyAuditLogs(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/privacy/retention/dry-run",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.privacyRetentionDryRun,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      return context.store.dryRunPrivacyRetention(request.params.clubId);
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: PrivacyExportPreviewInput;
  }>(
    "/clubs/:clubId/admin/privacy/export-preview",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.privacyExportPreview,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const preview = await context.store.previewPrivacyExport(request.params.clubId, request.body, "admin");
      if (!preview) {
        return context.sendError(reply, 404, "not_found", "Export target not found");
      }
      await auditRequest(context, request, reply, request.params.clubId, {
        action: "export",
        targetType: request.body.targetType,
        targetId: request.body.targetId,
        fieldKeys: request.body.fieldKeys,
        dataClasses: ["personal", "sensitive", "minor_sensitive"],
        purpose: request.body.purpose,
      });
      return preview;
    },
  );

  app.put<{
    Params: {
      clubId: string;
    };
    Body: PrivacyConsentUpsertInput;
  }>(
    "/clubs/:clubId/admin/privacy/consents",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.privacyConsentUpsert,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      try {
        return await context.store.upsertStudentConsent(request.params.clubId, request.body, auth?.user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Consent update failed";
        return context.sendError(reply, 400, "invalid_privacy_consent", message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/privacy/requests",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.privacyRequests,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      return context.store.listPrivacyRequests(request.params.clubId);
    },
  );

  app.patch<{
    Params: {
      clubId: string;
      requestId: string;
    };
    Body: PrivacyRequestResolveInput;
  }>(
    "/clubs/:clubId/admin/privacy/requests/:requestId",
    {
      schema: {
        ...schemas.clubPrivacyRequestParams,
        ...schemas.privacyRequestResolve,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const auth = context.membershipResolver
        ? await context.resolveClubAuth(request, reply, request.params.clubId)
        : null;
      const resolved = await context.store.resolvePrivacyRequest(request.params.clubId, request.params.requestId, {
        ...request.body,
        resolvedByUserId: request.body.resolvedByUserId ?? auth?.user.id,
      });
      if (!resolved) {
        return context.sendError(reply, 404, "not_found", "Privacy request not found");
      }
      return resolved;
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/students/:studentId/status-summary",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.studentOperationalStatusSummary,
      },
    },
    async (request, reply) => {
      if (!await context.requireStudentAccess(request, reply, request.params.clubId, request.params.studentId)) {
        return reply;
      }

      const summary = await context.store.getStudentOperationalStatusSummary(request.params.clubId, request.params.studentId);

      if (!summary) {
        return context.sendError(reply, 404, "not_found", "Student not found");
      }

      return summary;
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/admin/students/:studentId/lesson-ledger",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.lessonLedger,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const ledger = await context.store.getLessonLedger(request.params.clubId, request.params.studentId);

      if (!ledger) {
        return context.sendError(reply, 404, "not_found", "Student not found");
      }

      return ledger;
    },
  );

  app.post<{
    Params: {
      clubId: string;
      studentId: string;
    };
    Body: Parameters<RouteContext["store"]["recordLessonAdjustment"]>[2];
  }>(
    "/clubs/:clubId/admin/students/:studentId/lesson-adjustments",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.lessonAdjustment,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const ledger = await context.store.recordLessonAdjustment(request.params.clubId, request.params.studentId, request.body);
        return reply.code(201).send(ledger);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lesson adjustment failed";
        const statusCode = message.includes("Student not found") ? 404 : 400;
        const code = statusCode === 404 ? "not_found" : "invalid_lesson_adjustment";
        return context.sendError(reply, statusCode, code, message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
      studentId: string;
    };
  }>(
    "/clubs/:clubId/admin/students/:studentId/insurance-policies",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.insurancePolicies,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const policies = await context.store.listInsurancePolicies(request.params.clubId, request.params.studentId);

      if (!policies) {
        return context.sendError(reply, 404, "not_found", "Student not found");
      }

      return policies;
    },
  );

  app.post<{
    Params: {
      clubId: string;
      studentId: string;
    };
    Body: Parameters<RouteContext["store"]["createInsurancePolicy"]>[2];
  }>(
    "/clubs/:clubId/admin/students/:studentId/insurance-policies",
    {
      schema: {
        ...schemas.clubStudentParams,
        ...schemas.createInsurancePolicy,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      try {
        const policies = await context.store.createInsurancePolicy(request.params.clubId, request.params.studentId, request.body);
        return reply.code(201).send(policies);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Insurance policy creation failed";
        const statusCode = message.includes("Student not found") ? 404 : 400;
        const code = statusCode === 404 ? "not_found" : "invalid_insurance_policy";
        return context.sendError(reply, statusCode, code, message);
      }
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/data/config",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.dataCapabilityConfig,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.getDataCapabilityConfig(request.params.clubId);
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: ExcelImportPreviewInput;
  }>(
    "/clubs/:clubId/admin/imports/excel/preview",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.excelImportPreview,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const records = await readExcelWorksheetRecords({
        buffer: Buffer.from(request.body.contentBase64, "base64"),
        worksheetName: request.body.worksheetName,
        headerRow: request.body.headerRow,
      });
      const result = await context.store.stageExternalImport(request.params.clubId, {
        connectionId: request.body.connectionId,
        tableMappingId: request.body.tableMappingId,
        sourceName: request.body.fileName ?? request.body.worksheetName,
        records,
      });

      return reply.code(201).send(result);
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
    Querystring: ImportPreviewFilters;
  }>(
    "/clubs/:clubId/admin/import-preview",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.importPreviewQuery,
        ...schemas.importPreview,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const preview = await context.store.getImportPreview(request.params.clubId, request.query);
      await auditRequest(context, request, reply, request.params.clubId, {
        action: "raw_preview",
        targetType: "external_raw_record",
        fieldKeys: ["external.rawRecord"],
        dataClasses: ["sensitive"],
        purpose: "admin import preview read",
      });
      return preview;
    },
  );

  app.get<{
    Params: {
      clubId: string;
    };
  }>(
    "/clubs/:clubId/admin/sync-runs",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.syncRuns,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.listExternalSyncRuns(request.params.clubId);
    },
  );

  app.get<{
    Params: {
      clubId: string;
      syncRunId: string;
    };
  }>(
    "/clubs/:clubId/admin/sync-runs/:syncRunId",
    {
      schema: {
        ...schemas.clubSyncRunParams,
        ...schemas.syncRunDetail,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      const detail = await context.store.getExternalSyncRunDetail(request.params.clubId, request.params.syncRunId);

      if (!detail) {
        return context.sendError(reply, 404, "not_found", "Sync run not found");
      }

      await auditRequest(context, request, reply, request.params.clubId, {
        action: "raw_preview",
        targetType: "external_sync_run",
        targetId: request.params.syncRunId,
        fieldKeys: ["external.rawRecord"],
        dataClasses: ["sensitive"],
        purpose: "admin sync run detail read",
      });
      return detail;
    },
  );

  app.post<{
    Params: {
      clubId: string;
      rawRecordId: string;
    };
    Body: Parameters<RouteContext["store"]["confirmExternalRecord"]>[2];
  }>(
    "/clubs/:clubId/admin/external-records/:rawRecordId/confirm",
    {
      schema: {
        ...schemas.clubRawRecordParams,
        ...schemas.confirmExternalRecord,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin"])) {
        return reply;
      }

      let link;

      try {
        link = await context.store.confirmExternalRecord(
          request.params.clubId,
          request.params.rawRecordId,
          request.body,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "External raw record confirmation failed";
        return context.sendError(reply, 400, "invalid_external_record", message);
      }

      if (!link) {
        return context.sendError(reply, 404, "not_found", "External raw record not found");
      }

      await auditRequest(context, request, reply, request.params.clubId, {
        action: "confirm_import",
        targetType: request.body.targetType,
        targetId: request.body.targetId,
        fieldKeys: ["external.rawRecord"],
        dataClasses: ["sensitive"],
        purpose: "admin external record confirmation",
      });
      return link;
    },
  );
}

function webhookSecurityFromHeaders(headers: Record<string, string | string[] | undefined>) {
  const signature = headerValue(headers["x-wps-signature"]);
  const timestamp = headerValue(headers["x-wps-timestamp"]);
  const nonce = headerValue(headers["x-wps-nonce"]);
  if (!signature && !timestamp && !nonce) {
    return undefined;
  }

  return { signature, timestamp, nonce };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function auditRequest(
  context: RouteContext,
  request: Parameters<RouteContext["resolveClubAuth"]>[0],
  reply: Parameters<RouteContext["resolveClubAuth"]>[1],
  clubId: string,
  input: {
    action: Parameters<RouteContext["store"]["recordPrivacyAudit"]>[0]["action"];
    targetType: string;
    targetId?: string;
    fieldKeys: string[];
    dataClasses: Parameters<RouteContext["store"]["recordPrivacyAudit"]>[0]["dataClasses"];
    purpose: string;
  },
) {
  const auth = context.membershipResolver ? await context.resolveClubAuth(request, reply, clubId) : null;
  await context.store.recordPrivacyAudit({
    clubId,
    actorUserId: auth?.user.id,
    actorRole: auth?.membership.roles[0] ?? "system",
    ...input,
    requestId: request.id,
  });
}
