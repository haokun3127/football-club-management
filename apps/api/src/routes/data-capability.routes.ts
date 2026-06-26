import type { FastifyInstance } from "fastify";
import type {
  CreateExternalSyncPolicyInput,
  ExcelImportPreviewInput,
  ImportPreviewFilters,
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
        const result = await context.store.ingestWpsWebhook(request.params.clubId, request.body);
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

      return detail;
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
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      return context.store.getImportPreview(request.params.clubId, request.query);
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
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
        return reply;
      }

      const detail = await context.store.getExternalSyncRunDetail(request.params.clubId, request.params.syncRunId);

      if (!detail) {
        return context.sendError(reply, 404, "not_found", "Sync run not found");
      }

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
      if (!await context.requireClubMembership(request, reply, request.params.clubId)) {
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

      return link;
    },
  );
}
