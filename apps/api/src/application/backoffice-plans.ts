import type { SessionPlan } from "@football-club/domain";
import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
export interface PlanInput {
  name: string;
  status?: "active" | "inactive";
  blocks: Array<{ drillId: string; plannedMinutes: number; notes?: string }>;
  expectedRevision: string | null;
  requestId: string;
  sourceId?: string;
  sourceRevision?: string;
}
export function planView(
  store: PersistentApiStore,
  clubId: string,
  plan: SessionPlan,
  canWrite: boolean,
) {
  const referenced = plan.blocks.map((block) =>
    store
      .listTrainingDrills(clubId)
      .find((drill) => drill.id === block.drillId),
  );
  const used = store.repositories.trainingSessions
    .listByClub(clubId)
    .some((session) => session.sessionPlanId === plan.id);
  return {
    ...plan,
    scope: plan.catalogScope.scope,
    status: plan.status ?? "active",
    canSetStatus: canWrite && plan.catalogScope.scope === "club",
    revision: digest({ plan: {...plan, status: plan.status ?? "active"}, referenced }),
    canEdit: canWrite && plan.catalogScope.scope === "club" && !used,
    used,
  };
}
export async function saveBackofficePlan(
  store: PersistentApiStore,
  actor: AuthContext,
  id: string | undefined,
  input: PlanInput,
) {
  if (
    !actor.membership.roles.some((role) => role === "owner" || role === "admin")
  )
    throw new BackofficeFault(403, "permission_denied");
  if (Boolean(input.sourceId) !== Boolean(input.sourceRevision))
    throw new BackofficeFault(400, "invalid_source_reference");
  const repository = store.repositories.backofficeManagement;
  const result = await repository.transaction(async () => {
    if (
      !repository.activeAdmin(actor.clubId, actor.user.id, actor.membership.id)
    )
      throw new BackofficeFault(401, "authentication_required");
    const hash = digest({ action: "plan", id, input }),
      replay = repository.replay(
        actor.clubId,
        actor.user.id,
        input.requestId,
        hash,
      );
    if (replay !== undefined) return replay as SessionPlan;
    const previous = id
      ? store.repositories.sessionPlans.getById(actor.clubId, id)
      : null;
    if (id && !previous) throw new BackofficeFault(404, "not_found");
    if (previous) {
      const view = planView(store, actor.clubId, previous, true);
      const sameContent =
        previous.name === input.name.trim() &&
        JSON.stringify(
          previous.blocks.map(({ drillId, plannedMinutes, notes }) => ({
            drillId,
            plannedMinutes,
            ...(notes ? { notes } : {}),
          })),
        ) ===
          JSON.stringify(
            input.blocks.map(({ drillId, plannedMinutes, notes }) => ({
              drillId,
              plannedMinutes,
              ...(notes ? { notes } : {}),
            })),
          );
      if (
        !view.canEdit &&
        !(view.scope === "club" && sameContent && input.status)
      )
        throw new BackofficeFault(
          view.scope === "system" ? 403 : 409,
          view.scope === "system"
            ? "shared_catalog_read_only"
            : "plan_in_use_copy_required",
        );
      if (view.revision !== input.expectedRevision)
        throw new BackofficeFault(409, "revision_conflict", { latest: view });
    } else if (input.expectedRevision !== null)
      throw new BackofficeFault(409, "revision_conflict");
    let baseItemId: string | undefined;
    if (input.sourceId) {
      const source = store.repositories.sessionPlans.getById(
        actor.clubId,
        input.sourceId,
      );
      if (!source) throw new BackofficeFault(400, "invalid_reference");
      if (
        planView(store, actor.clubId, source, false).revision !==
        input.sourceRevision
      )
        throw new BackofficeFault(409, "source_changed");
      baseItemId = source.id;
    }
    const drills = store.listTrainingDrills(actor.clubId),
      selected = input.blocks.map((block) =>
        drills.find((drill) => drill.id === block.drillId),
      );
    if (
      selected.some(
        (drill, index) =>
          !drill ||
          (drill.status === "inactive" &&
            !previous?.blocks.some(
              (block) => block.drillId === input.blocks[index]?.drillId,
            )),
      )
    )
      throw new BackofficeFault(400, "invalid_reference");
    const estimatedMinutes = input.blocks.reduce(
      (sum, block) => sum + block.plannedMinutes,
      0,
    );
    if (estimatedMinutes > 1440)
      throw new BackofficeFault(400, "invalid_plan_duration");
    const now = new Date().toISOString(),
      plan: SessionPlan = {
        id: id ?? repository.newId("plan"),
        name: input.name.trim(),
        status: input.status ?? previous?.status ?? "active",
        catalogScope: {
          scope: "club",
          clubId: actor.clubId,
          ...(baseItemId
            ? { baseItemId }
            : previous?.catalogScope.scope === "club" &&
                previous.catalogScope.baseItemId
              ? { baseItemId: previous.catalogScope.baseItemId }
              : {}),
        },
        objectiveIds: [
          ...new Set(selected.flatMap((drill) => drill!.objectiveIds)),
        ],
        metricIds: [...new Set(selected.flatMap((drill) => drill!.metricIds))],
        blocks: input.blocks.map((block, index) => ({
          id: previous?.blocks[index]?.id ?? repository.newId("block"),
          order: index + 1,
          ...block,
        })),
        estimatedMinutes,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
    store.repositories.sessionPlans.save(plan);
    repository.audit(
      actor.clubId,
      "plans",
      plan.id,
      actor.user.id,
      previous ? "update" : "create",
      previous ?? undefined,
      plan,
      input.requestId,
      now,
    );
    repository.remember(
      actor.clubId,
      actor.user.id,
      input.requestId,
      hash,
      plan,
    );
    return plan;
  });
  store.refreshBackofficeFacts(actor.clubId);
  return planView(store, actor.clubId, result, true);
}
