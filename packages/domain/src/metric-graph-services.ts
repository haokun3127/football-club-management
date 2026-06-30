import type {
  AbilityMetric,
  DerivedMetricDefinition,
  MetricDependency,
  MetricGraphVersion,
  MetricLineage,
  PlayerMetricRecord,
} from "./metrics.js";
import { getNumericMetricValue, sortMetricDependencyGraph } from "./metrics.js";
import type { EntityId, ISODateTimeString } from "./primitives.js";
import type { IdGenerator } from "./ports.js";

export interface MetricGraphComputationInput {
  clubId: EntityId;
  studentId: EntityId;
  graphVersion: MetricGraphVersion;
  metrics: AbilityMetric[];
  dependencies: MetricDependency[];
  formulas: DerivedMetricDefinition[];
  inputRecords: PlayerMetricRecord[];
  ids: IdGenerator;
  now: ISODateTimeString;
  assessmentId?: EntityId;
  templateVersionId?: EntityId;
}

export interface MetricGraphComputationResult {
  records: PlayerMetricRecord[];
  lineages: MetricLineage[];
  calculationOrder: EntityId[];
}

interface NumericInput {
  record: PlayerMetricRecord;
  value: number;
  weight: number;
}

export function validateMetricGraphVersion(input: {
  graphVersion: MetricGraphVersion;
  metrics: AbilityMetric[];
  dependencies: MetricDependency[];
}) {
  const metricIds = new Set(input.metrics.map((metric) => metric.id));

  for (const dependency of input.dependencies) {
    if (dependency.graphVersionId !== input.graphVersion.id) {
      throw new Error(`Dependency ${dependency.id} does not belong to graph version ${input.graphVersion.id}.`);
    }

    if (!metricIds.has(dependency.inputMetricId)) {
      throw new Error(`Dependency ${dependency.id} references missing input metric ${dependency.inputMetricId}.`);
    }

    if (!metricIds.has(dependency.outputMetricId)) {
      throw new Error(`Dependency ${dependency.id} references missing output metric ${dependency.outputMetricId}.`);
    }
  }

  const result = sortMetricDependencyGraph([...metricIds], input.dependencies);
  if (result.cycles.length) {
    throw new Error(`Metric graph ${input.graphVersion.id} contains a cycle.`);
  }

  return result.calculationOrder;
}

export function computeMetricGraph(input: MetricGraphComputationInput): MetricGraphComputationResult {
  const dependencies = input.dependencies
    .filter((dependency) => dependency.graphVersionId === input.graphVersion.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const calculationOrder = validateMetricGraphVersion({
    graphVersion: input.graphVersion,
    metrics: input.metrics,
    dependencies,
  });
  const recordsByMetric = new Map<EntityId, PlayerMetricRecord>();

  for (const record of input.inputRecords) {
    if (record.clubId !== input.clubId || record.studentId !== input.studentId) {
      continue;
    }

    const existing = recordsByMetric.get(record.metricId);
    if (!existing || Date.parse(record.occurredAt) >= Date.parse(existing.occurredAt)) {
      recordsByMetric.set(record.metricId, record);
    }
  }

  const formulaById = new Map(input.formulas.map((formula) => [formula.id, formula]));
  const formulasByOutput = new Map(input.formulas.map((formula) => [formula.outputMetricId, formula]));
  const records: PlayerMetricRecord[] = [];
  const lineages: MetricLineage[] = [];

  for (const metricId of calculationOrder) {
    const incoming = dependencies.filter((dependency) => dependency.outputMetricId === metricId);
    if (incoming.length === 0 || recordsByMetric.has(metricId)) {
      continue;
    }

    const formula = resolveFormula(metricId, incoming, formulaById, formulasByOutput);
    const numericInputs = incoming.map((dependency) => {
      const record = recordsByMetric.get(dependency.inputMetricId);
      const value = record ? getNumericMetricValue(record.value) : null;

      if (!record || value === null) {
        throw new Error(`Missing numeric input ${dependency.inputMetricId} for computed metric ${metricId}.`);
      }

      return {
        record,
        value,
        weight: dependency.weight ?? formula.weights?.[dependency.inputMetricId] ?? 1,
      };
    });
    const computedValue = computeFormulaValue(formula, numericInputs);
    const lineageId = input.ids.next("metric-lineage");
    const record: PlayerMetricRecord = {
      id: input.ids.next("metric-record"),
      clubId: input.clubId,
      studentId: input.studentId,
      metricId,
      value: {
        kind: "measurement",
        value: roundValue(computedValue, formula.rounding),
        unit: formula.outputUnit ?? "score",
      },
      source: "algorithm",
      occurredAt: input.now,
      assessmentId: input.assessmentId,
      templateVersionId: input.templateVersionId,
      createdAt: input.now,
      updatedAt: input.now,
      lineageId,
      note: `${formula.code}@${formula.version}`,
    };
    const lineage: MetricLineage = {
      id: lineageId,
      clubId: input.clubId,
      outputRecordId: record.id,
      definitionId: formula.id,
      definitionVersion: formula.version,
      inputRecordIds: numericInputs.map((item) => item.record.id),
      computedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    };

    recordsByMetric.set(metricId, record);
    records.push(record);
    lineages.push(lineage);
  }

  return {
    records,
    lineages,
    calculationOrder,
  };
}

function resolveFormula(
  outputMetricId: EntityId,
  dependencies: MetricDependency[],
  formulaById: Map<EntityId, DerivedMetricDefinition>,
  formulasByOutput: Map<EntityId, DerivedMetricDefinition>,
) {
  const formulaId = dependencies.find((dependency) => dependency.formulaId)?.formulaId;
  const formula = formulaId ? formulaById.get(formulaId) : formulasByOutput.get(outputMetricId);

  if (!formula) {
    throw new Error(`Missing formula for computed metric ${outputMetricId}.`);
  }

  const supportedMethods = new Set(["normalized_weighted_sum", "sum", "weighted_average"]);
  if (!supportedMethods.has(formula.method)) {
    throw new Error(`Unsupported metric graph formula method ${formula.method}.`);
  }

  return formula;
}

function computeFormulaValue(formula: DerivedMetricDefinition, inputs: NumericInput[]) {
  switch (formula.method) {
    case "sum":
      return inputs.reduce((sum, input) => sum + input.value, 0);
    case "weighted_average": {
      const weightedTotal = inputs.reduce((sum, input) => sum + input.value * input.weight, 0);
      const weightTotal = inputs.reduce((sum, input) => sum + input.weight, 0);
      return weightedTotal / weightTotal;
    }
    case "normalized_weighted_sum": {
      const weightedTotal = inputs.reduce((sum, input) => sum + input.value * input.weight, 0);
      return weightedTotal / (formula.inputScale ?? 100) * (formula.maxScore ?? 1);
    }
    case "recent_average":
    case "trend":
      throw new Error(`Unsupported metric graph formula method ${formula.method}.`);
  }
}

function roundValue(value: number, rounding: DerivedMetricDefinition["rounding"]) {
  switch (rounding) {
    case "integer":
      return Math.round(value);
    case "none":
      return value;
    case "two_decimals":
    case undefined:
      return Number(value.toFixed(2));
  }
}
