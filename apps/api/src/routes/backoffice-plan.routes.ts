import type { FastifyInstance, FastifyRequest } from "fastify";
import type { BackofficeAuth } from "../auth/backoffice.js";
import type { PersistentApiStore } from "../store.js";
import {
  planView,
  saveBackofficePlan,
  type PlanInput,
} from "../application/backoffice-plans.js";
import { BackofficeFault } from "../persistence/backoffice-management-repository.js";
import { backofficePlanSchemas } from "../http/backoffice-plan-schemas.js";
export async function registerBackofficePlanRoutes(
  app: FastifyInstance,
  { auth, store }: { auth?: BackofficeAuth; store?: PersistentApiStore },
) {
  const context = async (request: FastifyRequest) => {
    const actor = await auth?.resolve(request);
    if (!actor || !store)
      throw new BackofficeFault(401, "authentication_required");
    return actor;
  };
  const isAdmin = (roles: string[]) =>
    roles.some((role) => role === "owner" || role === "admin");
  app.get(
    "/backoffice/api/plans",
    { schema: backofficePlanSchemas.list },
    async (request) => {
      const actor = await context(request);
      return store!.repositories.sessionPlans
        .listByClub(actor.clubId)
        .map((plan) =>
          planView(store!, actor.clubId, plan, isAdmin(actor.membership.roles)),
        );
    },
  );
  app.get<{ Params: { id: string } }>(
    "/backoffice/api/plans/:id",
    { schema: backofficePlanSchemas.detail },
    async (request) => {
      const actor = await context(request),
        plan = store!.repositories.sessionPlans.getById(
          actor.clubId,
          request.params.id,
        );
      if (!plan) throw new BackofficeFault(404, "not_found");
      return {
        record: planView(
          store!,
          actor.clubId,
          plan,
          isAdmin(actor.membership.roles),
        ),
        history: store!.repositories.backofficeManagement.history(
          actor.clubId,
          "plans",
          plan.id,
        ),
      };
    },
  );
  app.post<{ Body: PlanInput }>(
    "/backoffice/api/plans",
    { schema: backofficePlanSchemas.create },
    async (request) =>
      saveBackofficePlan(
        store!,
        await context(request),
        undefined,
        request.body,
      ),
  );
  app.put<{ Params: { id: string }; Body: PlanInput }>(
    "/backoffice/api/plans/:id",
    { schema: backofficePlanSchemas.update },
    async (request) =>
      saveBackofficePlan(
        store!,
        await context(request),
        request.params.id,
        request.body,
      ),
  );
}
