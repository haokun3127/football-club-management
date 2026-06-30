import type { AuditFields, EntityId, ISODateTimeString } from "./primitives.js";
import type { CatalogScoped, ClubScoped } from "./clubs.js";

export type MetricValueKind =
  | "rating_1_5"
  | "score_0_100"
  | "count"
  | "percentage"
  | "duration_minutes"
  | "duration_seconds"
  | "distance_meters"
  | "measurement"
  | "tag"
  | "text";
export type MetricSourceKind = "training_observation" | "match_event" | "assessment" | "fitness_test" | "manual_adjustment" | "algorithm";
export type DerivedMetricMethod = "weighted_average" | "normalized_weighted_sum" | "recent_average" | "sum" | "trend";
export type MetricKind = "atomic" | "computed" | "composite" | "view_only";
export type MetricDependencyRole = "primary" | "supporting" | "normalizer" | "context";

export interface AbilityMetric extends AuditFields, CatalogScoped {
  id: EntityId;
  code: string;
  name: string;
  dimensionId: EntityId;
  valueKind: MetricValueKind;
  metricKind: MetricKind;
  unit?: string;
  maxScore?: number;
  sourceKinds?: MetricSourceKind[];
  version?: string;
  status?: "active" | "inactive";
  description?: string;
}

export type MetricValue =
  | { kind: "rating_1_5"; score: 1 | 2 | 3 | 4 | 5 }
  | { kind: "score_0_100"; score: number }
  | { kind: "count"; count: number }
  | { kind: "percentage"; percentage: number }
  | { kind: "duration_minutes"; minutes: number }
  | { kind: "duration_seconds"; seconds: number }
  | { kind: "distance_meters"; meters: number }
  | { kind: "measurement"; value: number; unit: string }
  | { kind: "tag"; tag: string }
  | { kind: "text"; text: string };

export interface MetricGraphVersion extends AuditFields, CatalogScoped {
  id: EntityId;
  name: string;
  version: string;
  status: "draft" | "active" | "archived";
}

export interface MetricDependency extends AuditFields, CatalogScoped {
  id: EntityId;
  graphVersionId: EntityId;
  outputMetricId: EntityId;
  inputMetricId: EntityId;
  formulaId?: EntityId;
  weight?: number;
  role?: MetricDependencyRole;
  sortOrder: number;
}

export interface MetricView extends AuditFields, CatalogScoped {
  id: EntityId;
  graphVersionId: EntityId;
  name: string;
  status: "draft" | "active" | "archived";
}

export interface MetricViewNode extends AuditFields, CatalogScoped {
  id: EntityId;
  viewId: EntityId;
  metricId?: EntityId;
  parentViewNodeId?: EntityId;
  label: string;
  sortOrder: number;
}

export interface PlayerMetricRecord extends AuditFields, ClubScoped {
  id: EntityId;
  studentId: EntityId;
  metricId: EntityId;
  value: MetricValue;
  source: MetricSourceKind;
  occurredAt: ISODateTimeString;
  eventId?: EntityId;
  assessmentId?: EntityId;
  templateVersionId?: EntityId;
  rawResultId?: EntityId;
  sourceRecordId?: EntityId;
  recordedByCoachId?: EntityId;
  visibility?: "internal" | "coach" | "parent";
  confidence?: number;
  note?: string;
  lineageId?: EntityId;
}

export interface DerivedMetricDefinition extends AuditFields, CatalogScoped {
  id: EntityId;
  code: string;
  name: string;
  outputMetricId: EntityId;
  method: DerivedMetricMethod;
  inputMetricIds: EntityId[];
  version: string;
  weights?: Record<EntityId, number>;
  inputScale?: number;
  maxScore?: number;
  rounding?: "none" | "integer" | "two_decimals";
  inputWindowDays?: number;
  outputUnit?: string;
}

export interface MetricLineage extends AuditFields, ClubScoped {
  id: EntityId;
  outputRecordId: EntityId;
  definitionId: EntityId;
  definitionVersion: string;
  inputRecordIds: EntityId[];
  computedAt: ISODateTimeString;
}

export interface DerivedMetricResult {
  record: PlayerMetricRecord;
  lineage: MetricLineage;
}

export interface MetricGraphValidationResult {
  graph: MetricDependencyGraph;
  calculationOrder: EntityId[];
}

export interface MetricDependencyGraph {
  nodes: EntityId[];
  edges: Array<{ inputMetricId: EntityId; outputMetricId: EntityId; dependencyId?: EntityId }>;
}

export interface DeriveMetricGraphInput {
  metrics: AbilityMetric[];
  dependencies: MetricDependency[];
  definitions: DerivedMetricDefinition[];
  inputRecords: PlayerMetricRecord[];
  clubId: EntityId;
  studentId: EntityId;
  now: ISODateTimeString;
  nextRecordId(prefix?: string): EntityId;
  nextLineageId(prefix?: string): EntityId;
}

export interface DeriveMetricGraphResult {
  records: PlayerMetricRecord[];
  lineages: MetricLineage[];
}

export function validateMetricGraph(metrics: AbilityMetric[], dependencies: MetricDependency[]): MetricGraphValidationResult {
  const metricIds = new Set(metrics.map((metric) => metric.id));

  for (const dependency of dependencies) {
    if (!metricIds.has(dependency.inputMetricId)) {
      throw new Error(`Metric dependency ${dependency.id} references missing input metric ${dependency.inputMetricId}.`);
    }

    if (!metricIds.has(dependency.outputMetricId)) {
      throw new Error(`Metric dependency ${dependency.id} references missing output metric ${dependency.outputMetricId}.`);
    }
  }

  const result = sortMetricDependencyGraph([...metricIds], dependencies);
  if (result.cycles.length) {
    const cycles = result.cycles.map((cycle) => cycle.join(" -> ")).join("; ");
    throw new Error(`Metric graph contains cycle: ${cycles}`);
  }

  return {
    graph: result.graph,
    calculationOrder: result.calculationOrder,
  };
}

export function sortMetricDependencyGraph(metricIds: EntityId[], dependencies: MetricDependency[]): {
  graph: MetricDependencyGraph;
  calculationOrder: EntityId[];
  cycles: EntityId[][];
} {
  const nodes = Array.from(new Set(metricIds));
  const graph: MetricDependencyGraph = {
    nodes,
    edges: dependencies.map((dependency) => ({
      inputMetricId: dependency.inputMetricId,
      outputMetricId: dependency.outputMetricId,
      dependencyId: dependency.id,
    })),
  };
  const adjacency = new Map<EntityId, EntityId[]>();
  const indegree = new Map<EntityId, number>();
  for (const node of nodes) {
    adjacency.set(node, []);
    indegree.set(node, 0);
  }
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.inputMetricId)) adjacency.set(edge.inputMetricId, []);
    if (!indegree.has(edge.inputMetricId)) indegree.set(edge.inputMetricId, 0);
    if (!adjacency.has(edge.outputMetricId)) adjacency.set(edge.outputMetricId, []);
    if (!indegree.has(edge.outputMetricId)) indegree.set(edge.outputMetricId, 0);
    adjacency.get(edge.inputMetricId)?.push(edge.outputMetricId);
    indegree.set(edge.outputMetricId, (indegree.get(edge.outputMetricId) ?? 0) + 1);
  }

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([node]) => node)
    .sort();
  const calculationOrder: EntityId[] = [];
  while (queue.length) {
    const node = queue.shift();
    if (!node) break;
    calculationOrder.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }

  const cycles = calculationOrder.length === indegree.size ? [] : findMetricCycles(adjacency);
  return { graph, calculationOrder, cycles };
}

function findMetricCycles(adjacency: Map<EntityId, EntityId[]>): EntityId[][] {
  const cycles: EntityId[][] = [];
  const visiting = new Set<EntityId>();
  const visited = new Set<EntityId>();
  const stack: EntityId[] = [];

  function visit(node: EntityId) {
    if (visiting.has(node)) {
      const cycleStart = stack.indexOf(node);
      cycles.push([...stack.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      visit(next);
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of adjacency.keys()) {
    visit(node);
  }

  return cycles;
}

export function validateDerivedMetricDefinitions(
  metrics: AbilityMetric[],
  dependencies: MetricDependency[],
  definitions: DerivedMetricDefinition[],
): void {
  const metricIds = new Set(metrics.map((metric) => metric.id));
  const dependencyEdges = new Set(dependencies.map((dependency) =>
    `${dependency.inputMetricId}->${dependency.outputMetricId}`,
  ));
  const outputMetricIds = new Set<EntityId>();

  for (const definition of definitions) {
    if (!metricIds.has(definition.outputMetricId)) {
      throw new Error(`Derived metric definition ${definition.id} references missing output metric ${definition.outputMetricId}.`);
    }

    if (outputMetricIds.has(definition.outputMetricId)) {
      throw new Error(`Derived metric output ${definition.outputMetricId} has multiple definitions in one graph calculation.`);
    }
    outputMetricIds.add(definition.outputMetricId);

    for (const inputMetricId of definition.inputMetricIds) {
      if (!metricIds.has(inputMetricId)) {
        throw new Error(`Derived metric definition ${definition.id} references missing input metric ${inputMetricId}.`);
      }

      if (!dependencyEdges.has(`${inputMetricId}->${definition.outputMetricId}`)) {
        throw new Error(`Derived metric definition ${definition.id} input ${inputMetricId} is not declared in metric dependencies.`);
      }
    }
  }
}

export function deriveMetricGraph(input: DeriveMetricGraphInput): DeriveMetricGraphResult {
  const validation = validateMetricGraph(input.metrics, input.dependencies);
  validateDerivedMetricDefinitions(input.metrics, input.dependencies, input.definitions);
  const definitionsByOutputMetric = new Map(input.definitions.map((definition) => [definition.outputMetricId, definition]));
  const recordsByMetric = latestMetricRecords(input.inputRecords, input.clubId, input.studentId);
  const records: PlayerMetricRecord[] = [];
  const lineages: MetricLineage[] = [];

  for (const metricId of validation.calculationOrder) {
    const definition = definitionsByOutputMetric.get(metricId);
    if (!definition || recordsByMetric.has(metricId)) {
      continue;
    }

    const definitionInputs = definition.inputMetricIds.map((inputMetricId) => recordsByMetric.get(inputMetricId));
    if (definitionInputs.some((record) => !record)) {
      continue;
    }

    const result = derivePlayerMetricRecord({
      definition,
      inputRecords: definitionInputs.filter((record): record is PlayerMetricRecord => Boolean(record)),
      outputRecordId: input.nextRecordId("metric-record"),
      lineageId: input.nextLineageId("metric-lineage"),
      clubId: input.clubId,
      studentId: input.studentId,
      now: input.now,
    });

    recordsByMetric.set(result.record.metricId, result.record);
    records.push(result.record);
    lineages.push(result.lineage);
  }

  return { records, lineages };
}

function latestMetricRecords(records: PlayerMetricRecord[], clubId: EntityId, studentId: EntityId): Map<EntityId, PlayerMetricRecord> {
  const result = new Map<EntityId, PlayerMetricRecord>();

  for (const record of [...records].sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt))) {
    if (record.clubId === clubId && record.studentId === studentId) {
      result.set(record.metricId, record);
    }
  }

  return result;
}

export function getNumericMetricValue(value: MetricValue): number | null {
  switch (value.kind) {
    case "rating_1_5":
      return value.score;
    case "score_0_100":
      return value.score;
    case "count":
      return value.count;
    case "percentage":
      return value.percentage;
    case "duration_minutes":
      return value.minutes;
    case "duration_seconds":
      return value.seconds;
    case "distance_meters":
      return value.meters;
    case "measurement":
      return value.value;
    case "tag":
    case "text":
      return null;
  }
}

export function derivePlayerMetricRecord(input: {
  definition: DerivedMetricDefinition;
  inputRecords: PlayerMetricRecord[];
  outputRecordId: EntityId;
  lineageId: EntityId;
  clubId: EntityId;
  studentId: EntityId;
  now: ISODateTimeString;
}): DerivedMetricResult {
  const usableRecords = input.inputRecords.filter((record) =>
    record.clubId === input.clubId
    && record.studentId === input.studentId
    && input.definition.inputMetricIds.includes(record.metricId)
    && getNumericMetricValue(record.value) !== null,
  );

  if (usableRecords.length === 0) {
    throw new Error(`No numeric input records for derived metric ${input.definition.code}.`);
  }

  const numericValues = usableRecords.map((record) => ({
    record,
    value: getNumericMetricValue(record.value) ?? 0,
    weight: input.definition.weights?.[record.metricId] ?? 1,
  }));

  let result: number;

  switch (input.definition.method) {
    case "weighted_average": {
      const weightedTotal = numericValues.reduce((sum, item) => sum + item.value * item.weight, 0);
      const weightTotal = numericValues.reduce((sum, item) => sum + item.weight, 0);
      result = weightedTotal / weightTotal;
      break;
    }
    case "normalized_weighted_sum": {
      const weightedTotal = numericValues.reduce((sum, item) => sum + item.value * item.weight, 0);
      result = weightedTotal / (input.definition.inputScale ?? 100) * (input.definition.maxScore ?? 1);
      break;
    }
    case "recent_average": {
      const total = numericValues.reduce((sum, item) => sum + item.value, 0);
      result = total / numericValues.length;
      break;
    }
    case "sum":
      result = numericValues.reduce((sum, item) => sum + item.value, 0);
      break;
    case "trend": {
      const sorted = [...numericValues].sort((left, right) =>
        Date.parse(left.record.occurredAt) - Date.parse(right.record.occurredAt),
      );
      result = sorted[sorted.length - 1]!.value - sorted[0]!.value;
      break;
    }
  }

  const rounded = Number(result.toFixed(2));

  return {
    record: {
      id: input.outputRecordId,
      clubId: input.clubId,
      studentId: input.studentId,
      metricId: input.definition.outputMetricId,
      value: {
        kind: "measurement",
        value: rounded,
        unit: input.definition.outputUnit ?? "score",
      },
      source: "algorithm",
      occurredAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
      lineageId: input.lineageId,
      note: `${input.definition.code}@${input.definition.version}`,
    },
    lineage: {
      id: input.lineageId,
      clubId: input.clubId,
      outputRecordId: input.outputRecordId,
      definitionId: input.definition.id,
      definitionVersion: input.definition.version,
      inputRecordIds: usableRecords.map((record) => record.id),
      computedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    },
  };
}
