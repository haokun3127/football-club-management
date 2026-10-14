import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeMappings,
  type MappingInput,
} from "../application/backoffice-mappings.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import { backofficeMappingSchemas as schemas } from "../http/backoffice-mapping-schemas.js";
export async function registerBackofficeMappingRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const service = store ? new BackofficeMappings(store) : undefined;
  const actor = async (request: FastifyRequest) => {
    const value = await auth?.resolve(request);
    if (!value || !service)
      throw new BackofficeFault(401, "authentication_required");
    return value;
  };
  app.get(
    "/backoffice/api/mapping-items",
    { schema: schemas.items },
    async (request) => {
      const current = await actor(request);
      service!.require(current);
      return store!.listAssessmentTestItems(current.clubId);
    },
  );
  app.get(
    "/backoffice/api/mappings",
    { schema: schemas.list },
    async (request) => service!.list(await actor(request)),
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/mappings/:id",
    { schema: schemas.detail },
    async (request) => service!.get(await actor(request), request.params.id),
  );
  app.post<{ Body: MappingInput }>(
    "/backoffice/api/mappings",
    { schema: schemas.create },
    async (request) =>
      service!.save(await actor(request), undefined, request.body),
  );
  app.put<{ Params: { id: string }; Body: MappingInput }>(
    "/backoffice/api/mappings/:id",
    { schema: schemas.update },
    async (request) =>
      service!.save(await actor(request), request.params.id, request.body),
  );
  app.post<{ Params: { id: string }; Body: { value: number; unit: string } }>(
    "/backoffice/api/mappings/:id/trial",
    { schema: schemas.trial },
    async (request) =>
      service!.trial(await actor(request), request.params.id, request.body),
  );
  app.post<{
    Params: { id: string };
    Body: {
      action: "publish" | "deactivate";
      expectedRevision: string;
      requestId: string;
    };
  }>(
    "/backoffice/api/mappings/:id/transitions",
    { schema: schemas.transition },
    async (request) =>
      service!.transition(
        await actor(request),
        request.params.id,
        request.body,
      ),
  );
}
