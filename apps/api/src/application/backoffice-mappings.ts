import {
  evaluateScoreMapping,
  validateScoreMapping,
  type ScoreMappingDefinition,
} from "@football-club/domain";
import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
import {
  AssessmentMappingRepository,
  type MappingVersion,
} from "../persistence/assessment-mapping-repository.js";
export interface MappingInput {
  testItemId: string;
  definition: ScoreMappingDefinition;
  expectedRevision: string | null;
  requestId: string;
  sourceId?: string;
  sourceRevision?: string;
}
export const mappingView = (row: MappingVersion) => ({
  ...row,
  revision: digest(row),
  issues: validateScoreMapping(row.definition),
});
export class BackofficeMappings {
  readonly repository: AssessmentMappingRepository;
  constructor(readonly store: PersistentApiStore) {
    this.repository = new AssessmentMappingRepository(
      store.repositories.backofficeManagement.database,
    );
  }
  require(actor: AuthContext, write = false) {
    const repo = this.store.repositories.backofficeManagement;
    if (
      !repo.grants(actor.clubId, actor.user.id).includes("assessment") ||
      (write &&
        !repo.activeAdmin(actor.clubId, actor.user.id, actor.membership.id))
    )
      throw new BackofficeFault(403, "permission_denied");
  }
  list(actor: AuthContext) {
    this.require(actor);
    return this.repository.list(actor.clubId).map(mappingView);
  }
  get(actor: AuthContext, id: string) {
    this.require(actor);
    const row = this.repository.get(actor.clubId, id);
    if (!row) throw new BackofficeFault(404, "not_found");
    return {
      record: mappingView(row),
      history: this.store.repositories.backofficeManagement.history(
        actor.clubId,
        "mappings",
        id,
      ),
    };
  }
  async save(actor: AuthContext, id: string | undefined, input: MappingInput) {
    this.require(actor, true);
    const repo = this.store.repositories.backofficeManagement;
    return repo.transaction(async () => {
      this.require(actor, true);
      const hash = digest({ action: "mapping_save", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay as ReturnType<typeof mappingView>;
      const previous = id ? this.repository.get(actor.clubId, id) : null;
      if (id && !previous) throw new BackofficeFault(404, "not_found");
      if (previous?.status !== "draft" && previous)
        throw new BackofficeFault(409, "immutable_version_copy_required");
      if ((previous ? digest(previous) : null) !== input.expectedRevision)
        throw new BackofficeFault(
          409,
          "revision_conflict",
          previous ? { latest: mappingView(previous) } : undefined,
        );
      const item = (
        await this.store.listAssessmentTestItems(actor.clubId)
      ).find((item) => item.id === input.testItemId);
      if (
        !item ||
        (!previous && item.status === "inactive") ||
        (previous && previous.testItemId !== item.id) ||
        (previous && previous.definition.stage !== input.definition.stage)
      )
        throw new BackofficeFault(400, "invalid_reference");
      if (Boolean(input.sourceId) !== Boolean(input.sourceRevision))
        throw new BackofficeFault(400, "invalid_source_reference");
      if (input.sourceId) {
        const source = this.repository.get(actor.clubId, input.sourceId);
        if (
          !source ||
          source.testItemId !== item.id ||
          source.definition.stage !== input.definition.stage
        )
          throw new BackofficeFault(400, "invalid_reference");
        if (digest(source) !== input.sourceRevision)
          throw new BackofficeFault(409, "source_changed");
      }
      this.unit(item, input.definition);
      const now = new Date().toISOString(),
        row: MappingVersion = {
          id: id ?? repo.newId("mapping"),
          clubId: actor.clubId,
          testItemId: item.id,
          status: "draft",
          definition: input.definition,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
      this.repository.save(row);
      repo.audit(
        actor.clubId,
        "mappings",
        row.id,
        actor.user.id,
        previous ? "update" : "create",
        previous ?? undefined,
        row,
        input.requestId,
        now,
      );
      const result = mappingView(row);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
  }
  private unit(
    item: { unit?: string; valueKind: string },
    definition: ScoreMappingDefinition,
  ) {
    const units: Record<string, string> = {
      score_0_100: "score",
      rating_1_5: "score",
      count: "count",
      percentage: "%",
      duration_minutes: "min",
      duration_seconds: "s",
      distance_meters: "m",
    };
    const unit =
      definition.stage === "score_grade"
        ? "score"
        : (item.unit ?? units[item.valueKind]);
    if (!unit || definition.unit !== unit)
      throw new BackofficeFault(400, "mapping_unit_mismatch");
  }
  trial(
    actor: AuthContext,
    id: string,
    input: { value: number; unit: string },
  ) {
    const { record } = this.get(actor, id);
    try {
      return {
        versionId: record.id,
        revision: record.revision,
        basis: record.definition.basis,
        input,
        ...evaluateScoreMapping(record.definition, input),
      };
    } catch {
      throw new BackofficeFault(400, "invalid_mapping_trial", {
        issues: record.issues,
      });
    }
  }
  async transition(
    actor: AuthContext,
    id: string,
    input: {
      action: "publish" | "deactivate";
      expectedRevision: string;
      requestId: string;
    },
  ) {
    this.require(actor, true);
    const repo = this.store.repositories.backofficeManagement;
    return repo.transaction(async () => {
      this.require(actor, true);
      const hash = digest({ action: "mapping_transition", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay as ReturnType<typeof mappingView>;
      const previous = this.repository.get(actor.clubId, id);
      if (!previous) throw new BackofficeFault(404, "not_found");
      if (digest(previous) !== input.expectedRevision)
        throw new BackofficeFault(409, "revision_conflict", {
          latest: mappingView(previous),
        });
      if (input.action === "publish") {
        if (previous.status !== "draft")
          throw new BackofficeFault(409, "immutable_version_copy_required");
        const issues = validateScoreMapping(previous.definition);
        if (issues.length)
          throw new BackofficeFault(400, "invalid_mapping_definition", {
            issues,
          });
        if (
          previous.definition.basis !== "official" ||
          !previous.definition.reference.trim()
        )
          throw new BackofficeFault(409, "formal_standard_required");
      } else if (previous.status !== "active")
        throw new BackofficeFault(409, "invalid_version_transition");
      const now = new Date().toISOString(),
        row: MappingVersion = {
          ...previous,
          status: input.action === "publish" ? "active" : "archived",
          updatedAt: now,
        };
      this.repository.save(row);
      repo.audit(
        actor.clubId,
        "mappings",
        id,
        actor.user.id,
        input.action,
        previous,
        row,
        input.requestId,
        now,
      );
      const result = mappingView(row);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
  }
}
