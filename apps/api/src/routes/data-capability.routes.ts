import type { FastifyInstance } from "fastify";
import type { ExcelImportPreviewInput, ImportPreviewFilters } from "../data-capability/types.js";
import { schemas } from "../http/schemas.js";
import { readExcelWorksheetRecords } from "../integration/excel-import.js";
import type { RouteContext } from "./context.js";

export async function registerDataCapabilityRoutes(app: FastifyInstance, context: RouteContext) {
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

      const link = await context.store.confirmExternalRecord(
        request.params.clubId,
        request.params.rawRecordId,
        request.body,
      );

      if (!link) {
        return reply.code(404).send({ error: "External raw record not found" });
      }

      return link;
    },
  );
}
