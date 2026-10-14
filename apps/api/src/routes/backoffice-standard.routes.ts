import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeStandards,
  type StandardInput,
} from "../application/backoffice-standards.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import { backofficeStandardSchemas as schemas } from "../http/backoffice-standard-schemas.js";
export async function registerBackofficeStandardRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const service = store ? new BackofficeStandards(store) : undefined;
  const actor = async (request: FastifyRequest) => {
    const value = await auth?.resolve(request);
    if (!value || !service)
      throw new BackofficeFault(401, "authentication_required");
    return value;
  };
  app.get("/backoffice/api/standards", { schema: schemas.list }, async (r) =>
    service!.list(await actor(r)),
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/standards/:id",
    { schema: schemas.detail },
    async (r) => service!.get(await actor(r), r.params.id),
  );
  app.post<{ Body: StandardInput }>(
    "/backoffice/api/standards",
    { schema: schemas.create },
    async (r) => service!.save(await actor(r), undefined, r.body),
  );
  app.put<{ Params: { id: string }; Body: StandardInput }>(
    "/backoffice/api/standards/:id",
    { schema: schemas.update },
    async (r) => service!.save(await actor(r), r.params.id, r.body),
  );
  app.post<{
    Params: { id: string };
    Body: {
      action: "publish" | "deactivate";
      expectedRevision: string;
      requestId: string;
    };
  }>(
    "/backoffice/api/standards/:id/transitions",
    { schema: schemas.transition },
    async (r) => service!.transition(await actor(r), r.params.id, r.body),
  );
  app.post<{ Params: { id: string }; Body: { value: number; unit: string } }>(
    "/backoffice/api/standards/:id/compare",
    { schema: schemas.compare },
    async (r) => service!.compare(await actor(r), r.params.id, r.body),
  );
}
