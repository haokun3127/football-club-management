import type {
  DerivedMetricDefinition,
  MetricDependency,
} from "@football-club/domain";
import type { PersistentApiStore } from "../store.js";
import type { ModelDefinition } from "./backoffice-model-types.js";
import { BackofficeModelRepository } from "../persistence/backoffice-model-repository.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
/** A referenced output is recalculated from the same assessment's raw inputs; it never selects another child's or an earlier assessment's result. */
export function composeModel(
  store: PersistentApiStore,
  clubId: string,
  id: string,
  definition: ModelDefinition,
) {
  const config = store.repositories.dataCapability,
    blueprints = new BackofficeModelRepository(
      store.repositories.backofficeManagement.database,
    ),
    versions = config.listAssessmentTemplateVersions(clubId),
    edges = config.listMetricDependencies(clubId),
    bindings = config.listAssessmentMetricBindings(clubId),
    allFormulas = config.listDerivedMetricDefinitions(clubId);
  const inputs = [...definition.inputs],
    dependencies: MetricDependency[] = [],
    formulas: DerivedMetricDefinition[] = [],
    outputIds = new Set<string>(),
    inactiveVersions: string[] = [];
  const ownOutputs = new Set(
    definition.outputs.map((output) => output.metricId),
  );
  for (const reference of definition.references ?? []) {
    const version = versions.find(
        (version) => version.id === reference.versionId,
      ),
      blueprint = version ? blueprints.definition(clubId, version.id) : null;
    if (
      !version ||
      version.status === "draft" ||
      !version.graphVersionId ||
      !blueprint ||
      blueprint.basis !== "official" ||
      !blueprint.reference.trim() ||
      reference.selection !== "same_assessment" ||
      !bindings.some(
        (binding) =>
          binding.templateVersionId === version.id &&
          ["output", "reference"].includes(binding.role) &&
          binding.metricId === reference.metricId,
      )
    )
      throw new BackofficeFault(400, "invalid_model_reference");
    if (
      (blueprint.ageGroup &&
        definition.ageGroup &&
        blueprint.ageGroup !== definition.ageGroup) ||
      (blueprint.teamLevel &&
        definition.teamLevel &&
        blueprint.teamLevel !== definition.teamLevel)
    )
      throw new BackofficeFault(400, "incompatible_model_applicability");
    if (version.status !== "active") inactiveVersions.push(version.id);
    if (outputIds.has(reference.metricId) || ownOutputs.has(reference.metricId))
      throw new BackofficeFault(400, "duplicate_model_reference");
    const visited = new Set<string>(),
      visiting = new Set<string>(),
      neededInputs = new Set<string>();
    function visit(metricId: string) {
      if (visiting.has(metricId))
        throw new BackofficeFault(400, "model_graph_invalid");
      if (visited.has(metricId)) return;
      visiting.add(metricId);
      const incoming = edges.filter(
        (edge) =>
          edge.graphVersionId === version!.graphVersionId &&
          edge.outputMetricId === metricId,
      );
      if (!incoming.length) {
        neededInputs.add(metricId);
      } else {
        if (ownOutputs.has(metricId))
          throw new BackofficeFault(400, "duplicate_model_reference");
        outputIds.add(metricId);
        for (const edge of incoming) {
          const formula = allFormulas.find(
            (formula) => formula.id === edge.formulaId,
          );
          if (
            !formula ||
            !["weighted_average", "normalized_weighted_sum", "sum"].includes(
              formula.method,
            )
          )
            throw new BackofficeFault(400, "invalid_model_reference");
          if (!formulas.some((row) => row.id === formula.id))
            formulas.push(formula);
          const copied = {
            ...edge,
            id: `reference-edge-${id}-${digest([version!.id, edge.id]).slice(0, 12)}`,
            catalogScope: { scope: "club" as const, clubId },
            graphVersionId: `graph-${id}`,
          };
          if (!dependencies.some((row) => row.id === copied.id))
            dependencies.push(copied);
          visit(edge.inputMetricId);
        }
      }
      visiting.delete(metricId);
      visited.add(metricId);
    }
    visit(reference.metricId);
    for (const metricId of neededInputs) {
      const binding = bindings.find(
        (binding) =>
          binding.templateVersionId === version.id &&
          binding.role === "input" &&
          binding.metricId === metricId &&
          binding.testItemId,
      );
      if (!binding) throw new BackofficeFault(400, "invalid_model_reference");
      const project = {
          testItemId: binding.testItemId!,
          ...(binding.scoreMappingVersionId
            ? { scoreMappingVersionId: binding.scoreMappingVersionId }
            : {}),
          ...(binding.gradeMappingVersionId
            ? { gradeMappingVersionId: binding.gradeMappingVersionId }
            : {}),
        },
        existing = inputs.find(
          (input) => input.testItemId === project.testItemId,
        );
      if (
        existing &&
        (existing.scoreMappingVersionId !== project.scoreMappingVersionId ||
          existing.gradeMappingVersionId !== project.gradeMappingVersionId)
      )
        throw new BackofficeFault(409, "referenced_input_is_immutable");
      if (!existing) inputs.push(project);
    }
  }
  return { inputs, dependencies, formulas, outputIds, inactiveVersions };
}
