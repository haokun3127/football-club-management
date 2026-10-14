import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import { BackofficeBi } from "../application/backoffice-bi.js";
import type {
  BiFilters,
  BiTopic,
} from "../persistence/backoffice-bi-repository.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import { biSchemas as schemas } from "../http/backoffice-bi-schemas.js";
export async function registerBackofficeBiRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const service = store ? new BackofficeBi(store) : undefined;
  const actor = async (request: FastifyRequest) => {
    const current = await auth?.resolve(request);
    if (!current || !service)
      throw new BackofficeFault(401, "authentication_required");
    return current;
  };
  app.get(
    "/backoffice/api/bi-catalog",
    { schema: schemas.catalog },
    async (r) => service!.catalog(await actor(r)),
  );
  app.post<{ Body: { topic: BiTopic; filters: BiFilters; requestId: string } }>(
    "/backoffice/api/bi-snapshots",
    { schema: schemas.create },
    async (r) => service!.create(await actor(r), r.body),
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/bi-snapshots/:id",
    { schema: schemas.detail },
    async (r) => service!.get(await actor(r), r.params.id),
  );
  app.post<{
    Params: { id: string };
    Body: { factVersion: string; requestId: string };
  }>(
    "/backoffice/api/bi-snapshots/:id/export",
    { schema: schemas.export },
    async (r) => service!.export(await actor(r), r.params.id, r.body),
  );
}
