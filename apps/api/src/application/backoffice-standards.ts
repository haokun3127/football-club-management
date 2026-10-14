import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import { BackofficeMappings } from "./backoffice-mappings.js";
import {
  BackofficeStandardRepository,
  type StandardDefinition,
  type StandardVersion,
} from "../persistence/backoffice-standard-repository.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
export interface StandardInput {
  definition: StandardDefinition;
  expectedRevision: string | null;
  requestId: string;
  sourceId?: string;
  sourceRevision?: string;
}
export class BackofficeStandards {
  readonly repository: BackofficeStandardRepository;
  readonly authorization: BackofficeMappings;
  constructor(readonly store: PersistentApiStore) {
    this.repository = new BackofficeStandardRepository(
      store.repositories.backofficeManagement.database,
    );
    this.authorization = new BackofficeMappings(store);
  }
  issues(clubId: string, d: StandardDefinition) {
    const issues: string[] = [];
    const target =
      d.targetType === "project"
        ? this.store
            .listAssessmentTestItems(clubId)
            .find((item) => item.id === d.targetId)
        : this.store
            .listAbilityMetrics(clubId)
            .find((item) => item.id === d.targetId);
    const units: Record<string, string> = {
      score_0_100: "score",
      rating_1_5: "score",
      count: "count",
      percentage: "%",
      duration_minutes: "min",
      duration_seconds: "s",
      distance_meters: "m",
    };
    if (
      !target ||
      target.status === "inactive" ||
      ["text", "tag"].includes(target.valueKind)
    )
      issues.push("invalid_standard_target");
    else if (d.unit !== (target.unit ?? units[target.valueKind]))
      issues.push("standard_unit_mismatch");
    if (d.minimum > d.maximum) issues.push("invalid_standard_range");
    if (d.ageMinimum !== undefined || d.ageMaximum !== undefined) {
      if (!d.ageReferenceDate) issues.push("age_reference_required");
      if ((d.ageMinimum ?? 0) > (d.ageMaximum ?? 120))
        issues.push("invalid_age_range");
    }
    if (d.effectiveTo && d.effectiveFrom > d.effectiveTo)
      issues.push("invalid_effective_dates");
    if (d.modelVersionId) {
      const version = this.store.repositories.dataCapability
        .listAssessmentTemplateVersions(clubId)
        .find((v) => v.id === d.modelVersionId);
      const bound = this.store.repositories.dataCapability
        .listAssessmentMetricBindings(clubId)
        .some(
          (b) =>
            b.templateVersionId === version?.id &&
            b.role === "output" &&
            b.metricId === d.targetId,
        );
      if (
        !version ||
        version.status !== "active" ||
        d.targetType !== "metric" ||
        !bound
      )
        issues.push("invalid_model_output");
    }
    return issues;
  }
  view(row: StandardVersion) {
    return {
      ...row,
      revision: digest(row),
      issues: this.issues(row.clubId, row.definition),
      manualSelectionRequired: true,
    };
  }
  list(actor: AuthContext) {
    this.authorization.require(actor);
    return this.repository.list(actor.clubId).map((row) => this.view(row));
  }
  get(actor: AuthContext, id: string) {
    this.authorization.require(actor);
    const row = this.repository.get(actor.clubId, id);
    if (!row) throw new BackofficeFault(404, "not_found");
    return {
      record: this.view(row),
      history: this.store.repositories.backofficeManagement.history(
        actor.clubId,
        "standards",
        id,
      ),
    };
  }
  async save(actor: AuthContext, id: string | undefined, input: StandardInput) {
    this.authorization.require(actor, true);
    const repo = this.store.repositories.backofficeManagement;
    return repo.transaction(async () => {
      this.authorization.require(actor, true);
      const hash = digest({ action: "standard_save", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay;
      const previous = id ? this.get(actor, id).record : undefined;
      if (previous && previous.status !== "draft")
        throw new BackofficeFault(409, "immutable_version_copy_required");
      if ((previous?.revision ?? null) !== input.expectedRevision)
        throw new BackofficeFault(
          409,
          "revision_conflict",
          previous ? { latest: previous } : undefined,
        );
      if (Boolean(input.sourceId) !== Boolean(input.sourceRevision))
        throw new BackofficeFault(400, "invalid_source_reference");
      const source = input.sourceId
        ? this.get(actor, input.sourceId).record
        : undefined;
      if (source && source.revision !== input.sourceRevision)
        throw new BackofficeFault(409, "source_changed");
      const now = new Date().toISOString(),
        row: StandardVersion = {
          id: id ?? repo.newId("standard"),
          clubId: actor.clubId,
          familyId:
            previous?.familyId ??
            source?.familyId ??
            repo.newId("standard-family"),
          status: "draft",
          definition: input.definition,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
      if (
        this.issues(actor.clubId, input.definition).includes(
          "invalid_standard_target",
        )
      )
        throw new BackofficeFault(400, "invalid_reference");
      this.repository.save(row);
      repo.audit(
        actor.clubId,
        "standards",
        row.id,
        actor.user.id,
        previous ? "update" : "create",
        previous?.definition,
        row.definition,
        input.requestId,
        now,
      );
      const result = this.view(row);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
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
    this.authorization.require(actor, true);
    const repo = this.store.repositories.backofficeManagement;
    return repo.transaction(async () => {
      this.authorization.require(actor, true);
      const hash = digest({ action: "standard_transition", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay;
      const { record } = this.get(actor, id);
      if (record.revision !== input.expectedRevision)
        throw new BackofficeFault(409, "revision_conflict", { latest: record });
      if (input.action === "publish") {
        if (record.status !== "draft")
          throw new BackofficeFault(409, "immutable_version_copy_required");
        if (record.issues.length)
          throw new BackofficeFault(400, "invalid_standard_definition", {
            issues: record.issues,
          });
        if (
          record.definition.basis !== "official" ||
          !record.definition.reference.trim()
        )
          throw new BackofficeFault(409, "formal_standard_required");
      } else if (record.status !== "active")
        throw new BackofficeFault(409, "invalid_version_transition");
      const now = new Date().toISOString();
      if (input.action === "publish")
        for (const old of this.repository
          .list(actor.clubId)
          .filter(
            (old) =>
              old.familyId === record.familyId && old.status === "active",
          ))
          this.repository.save({ ...old, status: "archived", updatedAt: now });
      const row: StandardVersion = {
        ...this.repository.get(actor.clubId, id)!,
        status: input.action === "publish" ? "active" : "archived",
        updatedAt: now,
      };
      this.repository.save(row);
      repo.audit(
        actor.clubId,
        "standards",
        id,
        actor.user.id,
        input.action,
        { status: record.status },
        { status: row.status },
        input.requestId,
        now,
      );
      const result = this.view(row);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
  }
  compare(
    actor: AuthContext,
    id: string,
    input: { value: number; unit: string },
  ) {
    const { record } = this.get(actor, id),
      d = record.definition;
    if (input.unit !== d.unit || !Number.isFinite(input.value))
      throw new BackofficeFault(400, "standard_unit_mismatch");
    return {
      versionId: id,
      revision: record.revision,
      basis: d.basis,
      manualSelectionRequired: true,
      input,
      meetsReference:
        d.direction === "higher"
          ? input.value >= d.minimum
          : d.direction === "lower"
            ? input.value <= d.maximum
            : input.value >= d.minimum && input.value <= d.maximum,
    };
  }
}
