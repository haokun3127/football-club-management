import { exportBackofficeResource } from "../application/backoffice-exports.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeImports,
  type ImportPreviewInput,
} from "../application/backoffice-imports.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import {
  exportSchema,
  importSchemas as schemas,
} from "../http/backoffice-import-schemas.js";
export async function registerBackofficeImportRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const service = store ? new BackofficeImports(store) : undefined;
  const actor = async (request: FastifyRequest) => {
    const current = await auth?.resolve(request);
    if (!current || !service)
      throw new BackofficeFault(401, "authentication_required");
    return current;
  };
  app.post<{
    Params: { key: string };
    Body: {
      fields: string[];
      search?: string;
      snapshot: string;
      requestId: string;
    };
  }>("/backoffice/api/exports/:key", { schema: exportSchema }, async (r) =>
    exportBackofficeResource(store!, await actor(r), r.params.key, r.body),
  );
  app.get(
    "/backoffice/api/import-templates",
    { schema: schemas.templates },
    async (r) => service!.templates(await actor(r)),
  );
  app.get<{ Params: { key: string } }>(
    "/backoffice/api/import-templates/:key",
    { schema: schemas.template },
    async (r) => service!.template(await actor(r), r.params.key),
  );
  app.get("/backoffice/api/imports", { schema: schemas.list }, async (r) =>
    service!.list(await actor(r)),
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/imports/:id",
    { schema: schemas.detail },
    async (r) => service!.get(await actor(r), r.params.id),
  );
  app.post<{ Body: ImportPreviewInput }>(
    "/backoffice/api/imports/preview",
    { schema: schemas.preview },
    async (r) => service!.preview(await actor(r), r.body),
  );
  app.post<{ Params: { id: string }; Body: { requestId: string } }>(
    "/backoffice/api/imports/:id/failures-export",
    { schema: schemas.failures },
    async (r) =>
      service!.exportFailures(await actor(r), r.params.id, r.body.requestId),
  );
  app.post<{
    Params: { id: string };
    Body: { expectedRevision: string; rowNumbers: number[]; requestId: string };
  }>(
    "/backoffice/api/imports/:id/confirm",
    { schema: schemas.confirm },
    async (r) => service!.confirm(await actor(r), r.params.id, r.body),
  );
}
