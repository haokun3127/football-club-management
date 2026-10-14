import {backofficeWorkbench} from '../application/backoffice-workbench.js';
import {workbenchSchema} from '../http/backoffice-workbench-schemas.js';
import {registerBackofficeBiRoutes} from "./backoffice-bi.routes.js";
import {registerBackofficeImportRoutes} from "./backoffice-import.routes.js";
import {registerBackofficeTaskRoutes} from "./backoffice-task.routes.js";
import {registerBackofficeStandardRoutes} from "./backoffice-standard.routes.js";
import {registerBackofficeModelRoutes} from "./backoffice-model.routes.js";
import {registerBackofficeMappingRoutes} from "./backoffice-mapping.routes.js";
import { registerBackofficePlanRoutes } from "./backoffice-plan.routes.js";
import {
  backofficeTrainingRecords,
  saveBackofficeTrainingRecord,
} from "../application/backoffice-training-records.js";
import { ScoutError } from "../application/scout-identity.js";
import type { FastifyInstance } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import { PersistentApiStore, type ApiStore } from "../store.js";
import {
  BackofficeManagement,
  type SaveBackofficeInput,
} from "../application/backoffice-management.js";
import { backofficeResources } from "../application/backoffice-resources.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
import {
  capabilities,
  managementSchemas,
  optionSchema,
  resourceIndexSchema,
  grantsSchema,
  saveGrantsSchema,
  scoutManagementSchemas,
  backofficeTrainingSchemas,
} from "../http/backoffice-management-schemas.js";
import { registerBackofficeErrors } from "../http/backoffice-errors.js";
export async function registerBackofficeManagementRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store: ApiStore },
) {
  registerBackofficeErrors(app);
  const service =
    store instanceof PersistentApiStore
      ? new BackofficeManagement(store)
      : undefined;
  app.addHook("preHandler", async (request) => {
    if (!auth || !service)
      throw new BackofficeFault(503, "backoffice_not_configured");
    if (!(await auth.resolve(request)))
      throw new BackofficeFault(401, "authentication_required");
  });
  await registerBackofficePlanRoutes(app, { auth, store: service?.store });
  await registerBackofficeMappingRoutes(app, {auth,store:service?.store});
  await registerBackofficeModelRoutes(app,{auth,store:service?.store});
  await registerBackofficeStandardRoutes(app,{auth,store:service?.store});
  await registerBackofficeTaskRoutes(app,{auth,store:service?.store});
  await registerBackofficeImportRoutes(app,{auth,store:service?.store});
  await registerBackofficeBiRoutes(app,{auth,store:service?.store});
  const context = async (request: Parameters<BackofficeAuth["resolve"]>[0]) => {
    const value = await auth!.resolve(request);
    if (!value) throw new BackofficeFault(401, "authentication_required");
    return value;
  };
  app.get("/backoffice/api/workbench",{schema:workbenchSchema},async request=>backofficeWorkbench(service!.store,await context(request)));
  app.get(
    "/backoffice/api/resources",
    { schema: resourceIndexSchema },
    async (request) => service!.resources(await context(request)),
  );
  app.get<{ Params: { key: string } }>(
    "/backoffice/api/options/:key",
    { schema: optionSchema },
    async (request) =>
      service!.options(await context(request), request.params.key),
  );
  for (const resource of backofficeResources) {
    const base = `/backoffice/api/resources/${resource.key}`,
      schemas = managementSchemas(resource);
    app.get<{ Querystring: { search?: string; offset?: number } }>(
      base,
      { schema: schemas.list },
      async (request) =>
        service!.list(await context(request), resource, request.query),
    );
    app.get<{ Params: { id: string } }>(
      `${base}/:id`,
      { schema: schemas.detail },
      async (request) =>
        service!.detail(await context(request), resource, request.params.id),
    );
    app.post<{ Body: SaveBackofficeInput }>(
      base,
      { schema: schemas.create },
      async (request) =>
        service!.save(
          await context(request),
          resource,
          undefined,
          request.body,
        ),
    );
    app.put<{ Params: { id: string }; Body: SaveBackofficeInput }>(
      `${base}/:id`,
      { schema: schemas.update },
      async (request) =>
        service!.save(
          await context(request),
          resource,
          request.params.id,
          request.body,
        ),
    );
  }
  app.get<{ Querystring: { search?: string; offset?: number } }>(
    "/backoffice/api/scouts",
    { schema: scoutManagementSchemas.list },
    async (request) => {
      const actor = await context(request);
      if (!service!.has(actor, "sensitive"))
        throw new BackofficeFault(403, "permission_denied");
      const search = request.query.search?.trim() ?? "",
        all = service!.store.scoutPlayers
          .list(actor.clubId)
          .filter(
            (player) =>
              !search ||
              player.name.includes(search) ||
              (/^[0-9Xx]{4}$/.test(search) &&
                player.maskedDocument.endsWith(search.toUpperCase())),
          );
      return {
        players: all.slice(
          request.query.offset ?? 0,
          (request.query.offset ?? 0) + 20,
        ),
        total: all.length,
        canCreate:
          service!.admin(actor) && service!.store.scoutPlayers.configured,
      };
    },
  );
  app.post<{
    Body: { name: string; identityNumber: string; requestId: string };
  }>(
    "/backoffice/api/scouts",
    {
      schema: scoutManagementSchemas.create,
      config: { disableHttpIdempotency: true },
    },
    async (request) => {
      const actor = await context(request);
      if (!service!.admin(actor) || !service!.has(actor, "sensitive"))
        throw new BackofficeFault(403, "permission_denied");
      try {
        const saved = await service!.store.repositories.scoutPlayers.create(
          {
            name: request.body.name,
            identityNumber: request.body.identityNumber,
            clubId: actor.clubId,
            actorUserId: actor.user.id,
          },
          {
            authorize: async () => {
              const fresh = await context(request);
              if (!service!.admin(fresh) || !service!.has(fresh, "sensitive"))
                throw new BackofficeFault(403, "permission_denied");
            },
            audit: (player) =>
              service!.repository.audit(
                actor.clubId,
                "scouts",
                player.id,
                actor.user.id,
                "create",
                undefined,
                player,
                request.body.requestId,
              ),
          },
        );
        service!.store.refreshBackofficeFacts(actor.clubId);
        return saved.player;
      } catch (error) {
        if (error instanceof ScoutError)
          throw new BackofficeFault(error.status, error.code);
        throw error;
      }
    },
  );
  app.post<{ Params: { id: string }; Body: { requestId: string } }>(
    "/backoffice/api/scouts/:id/enroll",
    { schema: scoutManagementSchemas.enroll },
    async (request) => {
      const actor = await context(request);
      return service!.repository.transaction(async () => {
        const fresh = await context(request);
        if (!service!.admin(fresh) || !service!.has(fresh, "sensitive"))
          throw new BackofficeFault(403, "permission_denied");
        const previous = service!.store.scoutPlayers
          .list(actor.clubId)
          .find((p) => p.id === request.params.id);
        if (!previous) throw new BackofficeFault(404, "not_found");
        const changed = service!.repository.enrollScout(
          actor.clubId,
          request.params.id,
        );
        const saved = { ...previous, status: "enrolled" };
        if (changed)
          service!.repository.audit(
            actor.clubId,
            "scouts",
            previous.id,
            actor.user.id,
            "enroll",
            previous,
            saved,
            request.body.requestId,
          );
        return saved;
      });
    },
  );
  app.get(
    "/backoffice/api/training-records",
    { schema: backofficeTrainingSchemas.list },
    async (request) =>
      backofficeTrainingRecords(
        service!.store,
        (await context(request)).clubId,
      ),
  );
  app.put<{
    Body: {
      studentId: string;
      eventId: string;
      expectedRevision: number;
      counted: boolean;
      reason: string;
      requestId: string;
    };
  }>(
    "/backoffice/api/training-records",
    { schema: backofficeTrainingSchemas.save },
    async (request) =>
      saveBackofficeTrainingRecord(
        service!.store,
        await context(request),
        request.body,
      ),
  );
  const grantsView = (clubId: string) => {
    const accounts = service!.repository
      .accounts(clubId)
      .filter((row) => row.status === "active")
      .map((row) => ({ value: row.id, label: row.name }));
    const rows = accounts.map((row) => ({
      userId: row.value,
      capabilities: service!.repository.grants(clubId, row.value),
    }));
    return { accounts, rows, capabilities, revision: digest(rows) };
  };
  app.get(
    "/backoffice/api/grants",
    { schema: grantsSchema },
    async (request) => {
      const authContext = await context(request);
      if (!service!.admin(authContext))
        throw new BackofficeFault(403, "permission_denied");
      return grantsView(authContext.clubId);
    },
  );
  app.put<{
    Body: {
      userId: string;
      capabilities: string[];
      expectedRevision: string;
      requestId: string;
    };
  }>(
    "/backoffice/api/grants",
    { schema: saveGrantsSchema },
    async (request) => {
      const actor = await context(request);
      if (!service!.admin(actor))
        throw new BackofficeFault(403, "permission_denied");
      return service!.repository.transaction(async () => {
        const fresh = await context(request);
        if (!service!.admin(fresh))
          throw new BackofficeFault(403, "permission_denied");
        const current = grantsView(actor.clubId),
          input = request.body,
          hash = digest({ action: "grants", input });
        const replay = service!.repository.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
        if (replay !== undefined) return grantsView(actor.clubId);
        if (current.revision !== input.expectedRevision)
          throw new BackofficeFault(409, "revision_conflict");
        const before = service!.repository.grants(actor.clubId, input.userId);
        service!.repository.replaceGrants(
          actor.clubId,
          input.userId,
          input.capabilities,
        );
        service!.repository.audit(
          actor.clubId,
          "grants",
          input.userId,
          actor.user.id,
          "update",
          { capabilities: before },
          { capabilities: input.capabilities },
          input.requestId,
        );
        const response = grantsView(actor.clubId);
        service!.repository.remember(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
          response,
        );
        return response;
      });
    },
  );
}
