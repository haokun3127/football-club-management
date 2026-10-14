import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import { BackofficeModels } from "../application/backoffice-models.js";
import type { ModelInput } from "../application/backoffice-model-types.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import { backofficeModelSchemas as schemas } from "../http/backoffice-model-schemas.js";
import type { MetricValue } from "@football-club/domain";
export async function registerBackofficeModelRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const service = store ? new BackofficeModels(store) : undefined;
  const actor = async (request: FastifyRequest) => {
    const value = await auth?.resolve(request);
    if (!value || !service)
      throw new BackofficeFault(401, "authentication_required");
    return value;
  };
  app.get(
    "/backoffice/api/model-catalog",
    { schema: schemas.catalog },
    async (request) => {
      const current = await actor(request);
      service!.require(current);
      return {
        items: await store!.listAssessmentTestItems(current.clubId),
        metrics: store!.listAbilityMetrics(current.clubId),
      };
    },
  );
  app.get("/backoffice/api/models", { schema: schemas.list }, async (request) =>
    service!.list(await actor(request)),
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/models/:id",
    { schema: schemas.detail },
    async (request) => service!.get(await actor(request), request.params.id),
  );
  app.post<{ Body: ModelInput }>(
    "/backoffice/api/models",
    { schema: schemas.create },
    async (request) =>
      service!.save(await actor(request), undefined, request.body),
  );
  app.put<{ Params: { id: string }; Body: ModelInput }>(
    "/backoffice/api/models/:id",
    { schema: schemas.update },
    async (request) =>
      service!.save(await actor(request), request.params.id, request.body),
  );
  app.post<{
    Params: { id: string };
    Body: { values: Array<{ testItemId: string; value: MetricValue }> };
  }>(
    "/backoffice/api/models/:id/trial",
    { schema: schemas.trial },
    async (request) =>
      service!.trial(await actor(request), request.params.id, request.body),
  );
  app.put<{Params:{id:string};Body:{groups:Array<{name:string;metricIds:string[]}>;expectedRevision:string;requestId:string}}>("/backoffice/api/models/:id/display",{schema:schemas.display},async request=>service!.saveDisplay(await actor(request),request.params.id,request.body));
  app.post<{
    Params: { id: string };
    Body: {
      action: "publish" | "deactivate";
      expectedRevision: string;
      requestId: string;
    };
  }>(
    "/backoffice/api/models/:id/transitions",
    { schema: schemas.transition },
    async (request) =>
      service!.transition(
        await actor(request),
        request.params.id,
        request.body,
      ),
  );
}
