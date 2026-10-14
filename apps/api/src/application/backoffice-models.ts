import { composeModel } from "./backoffice-model-composition.js";
import {
  computeMetricGraph,
  evaluateScoreMapping,
  mapAssessmentValue,
  validateScoreMapping,
  getNumericMetricValue,
  validateMetricGraphVersion,
  withScoreMaxima,
  type AssessmentMetricBinding,
  type AssessmentTemplateVersion,
  type DerivedMetricDefinition,
  type MetricDependency,
  type MetricGraphVersion,
  type MetricValue,
  type PlayerMetricRecord,
} from "@football-club/domain";
import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import { BackofficeMappings } from "./backoffice-mappings.js";
import type { ModelDefinition, ModelInput } from "./backoffice-model-types.js";
import { BackofficeModelRepository } from "../persistence/backoffice-model-repository.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
export class BackofficeModels {
  readonly repository: BackofficeModelRepository;
  readonly mappings: BackofficeMappings;
  constructor(readonly store: PersistentApiStore) {
    this.repository = new BackofficeModelRepository(
      store.repositories.backofficeManagement.database,
    );
    this.mappings = new BackofficeMappings(store);
  }
  require(actor: AuthContext, write = false) {
    this.mappings.require(actor, write);
  }
  async list(actor: AuthContext) {
    this.require(actor);
    const config = this.store.repositories.dataCapability,
      templates = config.listAssessmentTemplates(actor.clubId),
      versions = config.listAssessmentTemplateVersions(actor.clubId);
    return versions.flatMap((version) => {
      const template = templates.find(
        (template) => template.id === version.templateId,
      );
      if (!template) return [];
      const stored = this.repository.definition(actor.clubId, version.id),
        definition = stored ?? this.legacyDefinition(actor.clubId, version);
      const issues = stored
        ? this.issues(actor.clubId, version.id, definition)
        : [];
      return [
        {
          id: version.id,
          templateId: template.id,
          scope: template.catalogScope.scope,
          status: version.status,
          definition,
          legacy: !stored,
          canEdit: Boolean(
            stored &&
            version.status === "draft" &&
            template.catalogScope.scope === "club",
          ),
          revision: digest({ version, definition }),
          issues,
          display: this.display(actor.clubId, version.id),
        },
      ];
    });
  }
  private legacyDefinition(
    clubId: string,
    version: AssessmentTemplateVersion,
  ): ModelDefinition {
    const config = this.store.repositories.dataCapability,
      template = config
        .listAssessmentTemplates(clubId)
        .find((template) => template.id === version.templateId)!,
      bindings = config
        .listAssessmentMetricBindings(clubId)
        .filter((binding) => binding.templateVersionId === version.id),
      edges = config
        .listMetricDependencies(clubId)
        .filter((edge) => edge.graphVersionId === version.graphVersionId),
      formulas = config.listDerivedMetricDefinitions(clubId);
    const outputs = [
      ...new Set(edges.map((edge) => edge.outputMetricId)),
    ].flatMap((metricId) => {
      const incoming = edges.filter((edge) => edge.outputMetricId === metricId),
        formula =
          formulas.find((formula) => formula.id === incoming[0]?.formulaId) ??
          formulas.find((formula) => formula.outputMetricId === metricId);
      if (
        !formula ||
        !["weighted_average", "normalized_weighted_sum", "sum"].includes(
          formula.method,
        )
      )
        return [];
      return [
        {
          metricId,
          method:
            formula.method as ModelDefinition["outputs"][number]["method"],
          inputs: incoming.map((edge) => ({
            metricId: edge.inputMetricId,
            weight: edge.weight ?? formula.weights?.[edge.inputMetricId] ?? 1,
          })),
          rounding: formula.rounding ?? "two_decimals",
          ...(formula.inputScale === undefined
            ? {}
            : { inputScale: formula.inputScale }),
          ...(formula.maxScore === undefined
            ? {}
            : { maxScore: formula.maxScore }),
        },
      ];
    });
    return {
      name: template.name,
      version: version.version,
      applicability:
        [template.ageGroup, template.teamLevel].filter(Boolean).join(" / ") ||
        "按原任务适用范围",
      basis: "trial",
      reference: "",
      ...(template.ageGroup ? { ageGroup: template.ageGroup } : {}),
      ...(template.teamLevel ? { teamLevel: template.teamLevel } : {}),
      inputs: bindings
        .filter((binding) => binding.role === "input" && binding.testItemId)
        .map((binding) => ({
          testItemId: binding.testItemId!,
          ...(binding.scoreMappingVersionId
            ? { scoreMappingVersionId: binding.scoreMappingVersionId }
            : {}),
          ...(binding.gradeMappingVersionId
            ? { gradeMappingVersionId: binding.gradeMappingVersionId }
            : {}),
        })),
      outputs,
    };
  }
  async get(actor: AuthContext, id: string) {
    const row = (await this.list(actor)).find((row) => row.id === id);
    if (!row) throw new BackofficeFault(404, "not_found");
    return {
      record: row,
      displayHistory: this.store.repositories.backofficeManagement.history(
        actor.clubId,
        "model-display",
        id,
      ),
      history: this.store.repositories.backofficeManagement.history(
        actor.clubId,
        "models",
        id,
      ),
    };
  }
  private compiled(clubId: string, id: string, definition: ModelDefinition) {
    const catalogScope = { scope: "club" as const, clubId },
      now = new Date().toISOString(),
      graph: MetricGraphVersion = {
        id: `graph-${id}`,
        catalogScope,
        name: definition.name,
        version: definition.version,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
    const formulas: DerivedMetricDefinition[] = [],
      dependencies: MetricDependency[] = [];
    for (const output of definition.outputs) {
      const formulaId = `formula-${id}-${digest(output.metricId).slice(0, 8)}`,
        formula: DerivedMetricDefinition = {
          id: formulaId,
          catalogScope,
          code: formulaId,
          name: definition.name,
          outputMetricId: output.metricId,
          method: output.method,
          inputMetricIds: output.inputs.map((input) => input.metricId),
          weights: Object.fromEntries(
            output.inputs.map((input) => [input.metricId, input.weight]),
          ),
          version: definition.version,
          rounding: output.rounding,
          outputUnit: "score",
          inputScale: output.inputScale,
          maxScore: output.maxScore,
          createdAt: now,
          updatedAt: now,
        };
      formulas.push(formula);
      output.inputs.forEach((input, index) =>
        dependencies.push({
          id: `edge-${id}-${digest([output.metricId, input.metricId]).slice(0, 12)}`,
          catalogScope,
          graphVersionId: graph.id,
          outputMetricId: output.metricId,
          inputMetricId: input.metricId,
          formulaId,
          weight: input.weight,
          sortOrder: index + 1,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    const composition = composeModel(this.store, clubId, id, definition);
    return {
      graph,
      formulas: [...composition.formulas, ...formulas],
      dependencies: [...composition.dependencies, ...dependencies],
      composition,
    };
  }
  issues(clubId: string, id: string, definition: ModelDefinition) {
    const issues: Array<{ code: string; objectId?: string }> = [],
      config = this.store.repositories.dataCapability,
      items = config.listAssessmentTestItems(clubId),
      metrics = this.store.listAbilityMetrics(clubId),
      seen = new Set<string>(),
      inputIds = new Set<string>();
    let composition: ReturnType<typeof composeModel>;
    try {
      composition = composeModel(this.store, clubId, id, definition);
    } catch (error) {
      return [
        {
          code:
            error instanceof BackofficeFault
              ? error.code
              : "invalid_model_reference",
        },
      ];
    }
    definition = { ...definition, inputs: composition.inputs };
    const currentVersion = config
      .listAssessmentTemplateVersions(clubId)
      .find((version) => version.id === id);
    if (!currentVersion || currentVersion.status === "draft")
      composition.inactiveVersions.forEach((versionId) =>
        issues.push({ code: "referenced_model_inactive", objectId: versionId }),
      );
    if (!definition.inputs.length)
      issues.push({ code: "model_inputs_required" });
    if (!definition.applicability.trim())
      issues.push({ code: "model_applicability_required" });
    for (const input of definition.inputs) {
      const item = items.find((item) => item.id === input.testItemId),
        metric = item
          ? metrics.find((metric) => metric.id === item.metricId)
          : undefined;
      if (
        !item ||
        !metric ||
        item.status === "inactive" ||
        metric.status === "inactive"
      ) {
        issues.push({ code: "invalid_project", objectId: input.testItemId });
        continue;
      }
      if (seen.has(item.metricId))
        issues.push({
          code: "duplicate_input_metric",
          objectId: item.metricId,
        });
      seen.add(item.metricId);
      inputIds.add(item.metricId);
      if (input.scoreMappingVersionId || input.gradeMappingVersionId) {
        const raw = input.scoreMappingVersionId
            ? this.mappings.repository.get(clubId, input.scoreMappingVersionId)
            : null,
          grade = input.gradeMappingVersionId
            ? this.mappings.repository.get(clubId, input.gradeMappingVersionId)
            : null;
        if (
          !raw ||
          !grade ||
          raw.testItemId !== item.id ||
          grade.testItemId !== item.id ||
          raw.definition.stage !== "raw_score" ||
          grade.definition.stage !== "score_grade"
        )
          issues.push({ code: "invalid_mapping_binding", objectId: item.id });
        else if (
          raw.status !== "active" ||
          grade.status !== "active" ||
          raw.definition.basis !== "official" ||
          grade.definition.basis !== "official" ||
          !raw.definition.reference.trim() ||
          !grade.definition.reference.trim()
        )
          issues.push({ code: "formal_mapping_required", objectId: item.id });
        else if (
          validateScoreMapping(raw.definition).length ||
          validateScoreMapping(grade.definition).length ||
          grade.definition.unit !== "score" ||
          raw.definition.unit !==
            (item.unit ??
              (
                {
                  score_0_100: "score",
                  rating_1_5: "score",
                  count: "count",
                  duration_seconds: "s",
                  duration_minutes: "min",
                  percentage: "%",
                  distance_meters: "m",
                } as Record<string, string>
              )[item.valueKind]) ||
          raw.definition.rules.some((rule) => {
            try {
              evaluateScoreMapping(grade.definition, {
                value: rule.score!,
                unit: "score",
              });
              return false;
            } catch {
              return true;
            }
          })
        )
          issues.push({
            code: "invalid_mapping_definition",
            objectId: item.id,
          });
        else if (
          raw.definition.rules.some(
            (rule) =>
              rule.score === undefined ||
              rule.score >
                (metric.maxScore ??
                  (metric.valueKind === "score_0_100"
                    ? 100
                    : metric.valueKind === "rating_1_5"
                      ? 5
                      : 0)),
          )
        )
          issues.push({ code: "score_scale_mismatch", objectId: item.id });
      } else
        issues.push({ code: "project_mappings_required", objectId: item.id });
      if (!(
        metric.valueKind === "score_0_100" ||
        metric.valueKind === "rating_1_5" ||
        (metric.valueKind === "measurement" &&
          metric.unit === "score" &&
          metric.maxScore)
      ))
        issues.push({ code: "input_unit_mismatch", objectId: item.id });
    }
    const compiled = this.compiled(clubId, id, definition),
      outputs = new Set([
        ...definition.outputs.map((output) => output.metricId),
        ...composition.outputIds,
      ]);
    if (
      new Set(definition.outputs.map((output) => output.metricId)).size !==
      definition.outputs.length
    )
      issues.push({ code: "duplicate_model_output" });
    for (const output of definition.outputs) {
      const metric = metrics.find((metric) => metric.id === output.metricId);
      if (
        !metric ||
        metric.status === "inactive" ||
        !["computed", "composite"].includes(metric.metricKind) ||
        (metric.unit && metric.unit !== "score")
      )
        issues.push({
          code: "invalid_output_metric",
          objectId: output.metricId,
        });
      if (
        !output.inputs.length ||
        new Set(output.inputs.map((input) => input.metricId)).size !==
          output.inputs.length
      )
        issues.push({
          code: "invalid_output_inputs",
          objectId: output.metricId,
        });
      for (const input of output.inputs)
        if (!inputIds.has(input.metricId) && !outputs.has(input.metricId))
          issues.push({
            code: "missing_model_input",
            objectId: input.metricId,
          });
      if (
        output.method === "sum" &&
        output.inputs.some((input) => input.weight !== 1)
      )
        issues.push({
          code: "sum_weights_must_be_one",
          objectId: output.metricId,
        });
      if (
        output.method === "normalized_weighted_sum" &&
        (!output.inputScale || !output.maxScore)
      )
        issues.push({
          code: "normalization_parameters_required",
          objectId: output.metricId,
        });
    }
    try {
      validateMetricGraphVersion({
        graphVersion: compiled.graph,
        metrics,
        dependencies: compiled.dependencies,
      });
    } catch {
      issues.push({ code: "model_graph_invalid" });
    }
    const scaled = withScoreMaxima(
      metrics.map((metric) => ({
        ...metric,
        maxScore:
          metric.metricKind === "atomic"
            ? (metric.maxScore ??
              (metric.valueKind === "score_0_100"
                ? 100
                : metric.valueKind === "rating_1_5"
                  ? 5
                  : undefined))
            : undefined,
      })),
      compiled.formulas,
      compiled.dependencies,
    );
    for (const output of definition.outputs) {
      const previous = metrics.find(
          (metric) => metric.id === output.metricId,
        )?.maxScore,
        next = scaled.find((metric) => metric.id === output.metricId)?.maxScore;
      if (!next || !previous || Math.abs(next - previous) > 1e-8)
        issues.push({
          code: "output_scale_mismatch",
          objectId: output.metricId,
        });
    }
    return issues;
  }
  async save(actor: AuthContext, id: string | undefined, input: ModelInput) {
    this.require(actor, true);
    const repo = this.store.repositories.backofficeManagement,
      config = this.store.repositories.dataCapability;
    const result = await repo.transaction(async () => {
      this.require(actor, true);
      const hash = digest({ action: "model_save", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay as { id: string };
      const previous = id ? (await this.get(actor, id)).record : undefined;
      if (previous && !previous.canEdit)
        throw new BackofficeFault(409, "immutable_version_copy_required");
      if ((previous?.revision ?? null) !== input.expectedRevision)
        throw new BackofficeFault(
          409,
          "revision_conflict",
          previous ? { latest: previous } : undefined,
        );
      if (Boolean(input.sourceId) !== Boolean(input.sourceRevision))
        throw new BackofficeFault(400, "invalid_source_reference");
      if (input.sourceId) {
        const source = (await this.get(actor, input.sourceId)).record;
        if (source.revision !== input.sourceRevision)
          throw new BackofficeFault(409, "source_changed");
      }
      const templateId =
          previous?.templateId ?? input.templateId ?? repo.newId("template"),
        template = config
          .listAssessmentTemplates(actor.clubId)
          .find((template) => template.id === templateId);
      if (
        (previous || input.templateId) &&
        (!template || template.catalogScope.scope !== "club")
      )
        throw new BackofficeFault(403, "shared_catalog_read_only");
      if (
        config
          .listAssessmentTemplateVersions(actor.clubId)
          .some(
            (version) =>
              version.templateId === templateId &&
              version.id !== id &&
              version.version === input.definition.version,
          )
      )
        throw new BackofficeFault(409, "model_version_exists");
      const referenceInputs = composeModel(
        this.store,
        actor.clubId,
        id ?? "pending",
        input.definition,
      ).inputs;
      input = {
        ...input,
        definition: { ...input.definition, inputs: referenceInputs },
      };
      const items = config.listAssessmentTestItems(actor.clubId),
        metrics = this.store.listAbilityMetrics(actor.clubId);
      if (
        input.definition.inputs.some(
          (item) => !items.some((existing) => existing.id === item.testItemId),
        ) ||
        input.definition.outputs.some(
          (output) =>
            !metrics.some((metric) => metric.id === output.metricId) ||
            output.inputs.some(
              (input) =>
                !metrics.some((metric) => metric.id === input.metricId),
            ),
        )
      )
        throw new BackofficeFault(400, "invalid_reference");
      for (const binding of input.definition.inputs)
        for (const mappingId of [
          binding.scoreMappingVersionId,
          binding.gradeMappingVersionId,
        ])
          if (
            mappingId &&
            !this.mappings.repository.get(actor.clubId, mappingId)
          )
            throw new BackofficeFault(400, "invalid_reference");
      const now = new Date().toISOString(),
        versionId = id ?? repo.newId("model-version"),
        compiled = this.compiled(actor.clubId, versionId, input.definition);
      if (!template)
        config.saveAssessmentTemplate({
          id: templateId,
          catalogScope: { scope: "club", clubId: actor.clubId },
          name: input.definition.name,
          ageGroup: input.definition.ageGroup,
          teamLevel: input.definition.teamLevel,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      const existingGraph = config
        .listMetricGraphVersions(actor.clubId)
        .find((graph) => graph.id === compiled.graph.id);
      config.saveMetricGraphVersion({
        ...compiled.graph,
        createdAt: existingGraph?.createdAt ?? now,
      });
      config.saveAssessmentTemplateVersion({
        id: versionId,
        clubId: actor.clubId,
        templateId,
        graphVersionId: compiled.graph.id,
        version: input.definition.version,
        status: "draft",
        createdAt: previous
          ? config
              .listAssessmentTemplateVersions(actor.clubId)
              .find((version) => version.id === versionId)!.createdAt
          : now,
        updatedAt: now,
      });
      this.repository.clearDraftEdges(
        actor.clubId,
        versionId,
        compiled.graph.id,
      );
      compiled.formulas
        .filter((formula) => formula.id.startsWith(`formula-${versionId}-`))
        .forEach((formula) => this.repository.saveFormula(formula));
      compiled.dependencies.forEach((edge) =>
        config.saveMetricDependency(edge),
      );
      input.definition.inputs.forEach((input, index) => {
        const item = items.find((item) => item.id === input.testItemId)!;
        const binding: AssessmentMetricBinding = {
          id: `binding-${versionId}-${digest(item.id).slice(0, 10)}`,
          clubId: actor.clubId,
          templateVersionId: versionId,
          metricId: item.metricId,
          testItemId: item.id,
          role: "input",
          scoreMappingVersionId: input.scoreMappingVersionId,
          gradeMappingVersionId: input.gradeMappingVersionId,
          maxScore: metrics.find((metric) => metric.id === item.metricId)
            ?.maxScore,
          sortOrder: index + 1,
          createdAt: now,
          updatedAt: now,
        };
        config.saveAssessmentMetricBinding(binding);
      });
      input.definition.outputs.forEach((output, index) =>
        config.saveAssessmentMetricBinding({
          id: `binding-output-${versionId}-${digest(output.metricId).slice(0, 10)}`,
          clubId: actor.clubId,
          templateVersionId: versionId,
          metricId: output.metricId,
          role: "output",
          formulaId: compiled.formulas.find(
            (formula) =>
              formula.outputMetricId === output.metricId &&
              formula.id.startsWith(`formula-${versionId}-`),
          )!.id,
          sortOrder: index + 1,
          createdAt: now,
          updatedAt: now,
        }),
      );
      (input.definition.references ?? []).forEach((reference, index) =>
        config.saveAssessmentMetricBinding({
          id: `binding-reference-${versionId}-${digest(reference.metricId).slice(0, 10)}`,
          clubId: actor.clubId,
          templateVersionId: versionId,
          metricId: reference.metricId,
          role: "reference",
          sortOrder: input.definition.outputs.length + index + 1,
          createdAt: now,
          updatedAt: now,
        }),
      );
      this.repository.save(actor.clubId, versionId, input.definition, now);
      repo.audit(
        actor.clubId,
        "models",
        versionId,
        actor.user.id,
        previous ? "update" : "create",
        previous?.definition,
        input.definition,
        input.requestId,
        now,
      );
      const result = { id: versionId };
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
    this.store.refreshBackofficeAssessmentCatalog(actor.clubId);
    return (await this.get(actor, result.id)).record;
  }
  display(clubId: string, id: string) {
    const groups = this.repository.display(clubId, id),
      view = this.store.repositories.dataCapability
        .listMetricViews(clubId)
        .find((view) => view.id === `model-view-${id}`);
    return {
      groups,
      revision: digest({ groups, updatedAt: view?.updatedAt ?? null }),
    };
  }
  async saveDisplay(
    actor: AuthContext,
    id: string,
    input: {
      groups: Array<{ name: string; metricIds: string[] }>;
      expectedRevision: string;
      requestId: string;
    },
  ) {
    this.require(actor, true);
    const repo = this.store.repositories.backofficeManagement,
      config = this.store.repositories.dataCapability;
    const result = await repo.transaction(async () => {
      this.require(actor, true);
      const hash = digest({ action: "model_display", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return replay;
      const { record } = await this.get(actor, id);
      if (
        record.legacy ||
        record.scope !== "club" ||
        record.status === "archived"
      )
        throw new BackofficeFault(403, "shared_catalog_read_only");
      const before = this.display(actor.clubId, id);
      if (before.revision !== input.expectedRevision)
        throw new BackofficeFault(409, "revision_conflict", { latest: before });
      const allowed = new Set(
        config
          .listAssessmentMetricBindings(actor.clubId)
          .filter((binding) => binding.templateVersionId === id)
          .map((binding) => binding.metricId),
      );
      if (
        input.groups.some(
          (group) =>
            !group.name.trim() ||
            group.metricIds.some((metricId) => !allowed.has(metricId)),
        )
      )
        throw new BackofficeFault(400, "invalid_display_metric");
      const now = new Date().toISOString(),
        viewId = `model-view-${id}`,
        catalogScope = { scope: "club" as const, clubId: actor.clubId },
        version = config
          .listAssessmentTemplateVersions(actor.clubId)
          .find((version) => version.id === id)!,
        existing = config
          .listMetricViews(actor.clubId)
          .find((view) => view.id === viewId);
      config.saveMetricView({
        id: viewId,
        catalogScope,
        graphVersionId: version.graphVersionId!,
        name: record.definition.name,
        status: version.status,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
      this.repository.clearDisplay(actor.clubId, id);
      input.groups.forEach((group, index) => {
        const parentId = `view-group-${id}-${index}`;
        config.saveMetricViewNode({
          id: parentId,
          catalogScope,
          viewId,
          label: group.name,
          sortOrder: index + 1,
          createdAt: now,
          updatedAt: now,
        });
        group.metricIds.forEach((metricId, position) =>
          config.saveMetricViewNode({
            id: `view-metric-${id}-${index}-${position}`,
            catalogScope,
            viewId,
            parentViewNodeId: parentId,
            metricId,
            label:
              this.store
                .listAbilityMetrics(actor.clubId)
                .find((metric) => metric.id === metricId)?.name ?? metricId,
            sortOrder: position + 1,
            createdAt: now,
            updatedAt: now,
          }),
        );
      });
      repo.audit(
        actor.clubId,
        "model-display",
        id,
        actor.user.id,
        "display_update",
        { groups: before.groups },
        { groups: input.groups },
        input.requestId,
        now,
      );
      const result = this.display(actor.clubId, id);
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, result);
      return result;
    });
    this.store.refreshBackofficeAssessmentCatalog(actor.clubId);
    return result;
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
    const repo = this.store.repositories.backofficeManagement,
      config = this.store.repositories.dataCapability;
    await repo.transaction(async () => {
      this.require(actor, true);
      const hash = digest({ action: "model_transition", id, input }),
        replay = repo.replay(
          actor.clubId,
          actor.user.id,
          input.requestId,
          hash,
        );
      if (replay !== undefined) return;
      const { record } = await this.get(actor, id);
      if (record.revision !== input.expectedRevision)
        throw new BackofficeFault(409, "revision_conflict", { latest: record });
      if (
        record.legacy ||
        record.scope !== "club" ||
        !this.repository.definition(actor.clubId, id)
      )
        throw new BackofficeFault(403, "shared_catalog_read_only");
      if (input.action === "publish") {
        if (!record.canEdit)
          throw new BackofficeFault(409, "immutable_version_copy_required");
        if (record.issues.length)
          throw new BackofficeFault(400, "invalid_model_definition", {
            issues: record.issues,
          });
        if (
          record.definition.basis !== "official" ||
          !record.definition.reference.trim()
        )
          throw new BackofficeFault(409, "formal_standard_required");
      } else if (record.status !== "active")
        throw new BackofficeFault(409, "invalid_version_transition");
      const now = new Date().toISOString(),
        version = config
          .listAssessmentTemplateVersions(actor.clubId)
          .find((version) => version.id === id)!;
      const status = input.action === "publish" ? "active" : "archived";
      const updateRelatedStatus = (
        versionId: string,
        nextStatus: "active" | "archived",
      ) => {
        const related = config
          .listAssessmentTemplateVersions(actor.clubId)
          .find((row) => row.id === versionId);
        if (!related || !this.repository.definition(actor.clubId, versionId))
          return;
        const relatedGraph = config
          .listMetricGraphVersions(actor.clubId)
          .find((row) => row.id === related.graphVersionId);
        if (relatedGraph)
          config.saveMetricGraphVersion({
            ...relatedGraph,
            status: nextStatus,
            updatedAt: now,
          });
        const view = config
          .listMetricViews(actor.clubId)
          .find((row) => row.id === `model-view-${versionId}`);
        if (view)
          config.saveMetricView({
            ...view,
            status: nextStatus,
            updatedAt: now,
          });
      };
      if (input.action === "publish") {
        for (const previous of config
          .listAssessmentTemplateVersions(actor.clubId)
          .filter(
            (previous) =>
              previous.templateId === version.templateId &&
              previous.status === "active",
          )) {
          config.saveAssessmentTemplateVersion({
            ...previous,
            status: "archived",
            updatedAt: now,
          });
          updateRelatedStatus(previous.id, "archived");
        }
      }
      updateRelatedStatus(id, status);
      config.saveAssessmentTemplateVersion({
        ...version,
        status: input.action === "publish" ? "active" : "archived",
        updatedAt: now,
      });
      const graph = config
        .listMetricGraphVersions(actor.clubId)
        .find((graph) => graph.id === version.graphVersionId)!;
      config.saveMetricGraphVersion({
        ...graph,
        status: input.action === "publish" ? "active" : "archived",
        updatedAt: now,
      });
      repo.audit(
        actor.clubId,
        "models",
        id,
        actor.user.id,
        input.action,
        { status: record.status },
        { status: input.action === "publish" ? "active" : "archived" },
        input.requestId,
        now,
      );
      repo.remember(actor.clubId, actor.user.id, input.requestId, hash, { id });
    });
    this.store.refreshBackofficeAssessmentCatalog(actor.clubId);
    return (await this.get(actor, id)).record;
  }
  async trial(
    actor: AuthContext,
    id: string,
    input: { values: Array<{ testItemId: string; value: MetricValue }> },
  ) {
    const { record } = await this.get(actor, id),
      items = await this.store.listAssessmentTestItems(actor.clubId),
      compiled = this.compiled(actor.clubId, id, record.definition),
      records: PlayerMetricRecord[] = [],
      now = new Date().toISOString();
    if (
      record.issues.some(
        (issue) =>
          issue.code !== "formal_mapping_required" &&
          issue.code !== "project_mappings_required" &&
          issue.code !== "referenced_model_inactive",
      )
    )
      throw new BackofficeFault(400, "invalid_model_definition", {
        issues: record.issues,
      });
    if (
      new Set(input.values.map((value) => value.testItemId)).size !==
        input.values.length ||
      input.values.some(
        (value) =>
          !record.definition.inputs.some(
            (binding) => binding.testItemId === value.testItemId,
          ),
      )
    )
      throw new BackofficeFault(400, "invalid_trial_input");
    for (const binding of record.definition.inputs) {
      const item = items.find((item) => item.id === binding.testItemId);
      if (!item) throw new BackofficeFault(400, "invalid_reference");
      const entry = input.values.find((entry) => entry.testItemId === item.id);
      if (!entry || entry.value.kind !== item.valueKind)
        throw new BackofficeFault(400, "incomplete_trial_input");
      let score = getNumericMetricValue(entry.value);
      if (score === null || !Number.isFinite(score))
        throw new BackofficeFault(400, "invalid_trial_input");
      if (binding.scoreMappingVersionId || binding.gradeMappingVersionId) {
        const raw = this.mappings.repository.get(
            actor.clubId,
            binding.scoreMappingVersionId ?? "",
          ),
          grade = this.mappings.repository.get(
            actor.clubId,
            binding.gradeMappingVersionId ?? "",
          );
        if (!raw || !grade) throw new BackofficeFault(400, "invalid_reference");
        try {
          score = mapAssessmentValue(
            item,
            entry.value,
            {
              ...raw,
              status: "active",
              definition: {
                ...raw.definition,
                basis: "official",
                reference: "Isolated trial",
              },
            },
            {
              ...grade,
              status: "active",
              definition: {
                ...grade.definition,
                basis: "official",
                reference: "Isolated trial",
              },
            },
          ).integerScore;
        } catch {
          throw new BackofficeFault(400, "invalid_trial_input");
        }
      } else if (
        !["score_0_100", "rating_1_5"].includes(entry.value.kind) ||
        score < (entry.value.kind === "rating_1_5" ? 1 : 0) ||
        score > (entry.value.kind === "rating_1_5" ? 5 : 100) ||
        (entry.value.kind === "rating_1_5" && !Number.isInteger(score))
      )
        throw new BackofficeFault(400, "invalid_trial_input");
      records.push({
        id: `trial-${item.id}`,
        clubId: actor.clubId,
        studentId: "trial",
        metricId: item.metricId,
        value: { kind: "measurement", value: score, unit: "score" },
        source: "assessment",
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
    try {
      let sequence = 0;
      const result = computeMetricGraph({
        clubId: actor.clubId,
        studentId: "trial",
        graphVersion: compiled.graph,
        metrics: this.store.listAbilityMetrics(actor.clubId),
        dependencies: compiled.dependencies,
        formulas: compiled.formulas,
        inputRecords: records,
        ids: { next: () => `trial-${++sequence}` },
        now,
      });
      return {
        versionId: id,
        revision: record.revision,
        outputs: result.records.map((row) => ({
          metricId: row.metricId,
          value: row.value,
        })),
        inputCount: records.length,
      };
    } catch {
      throw new BackofficeFault(400, "invalid_model_trial");
    }
  }
}
