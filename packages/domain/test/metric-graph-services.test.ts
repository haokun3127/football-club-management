import { describe, expect, it } from "vitest";
import {
  computeMetricGraph,
  validateMetricGraphVersion,
  type AbilityMetric,
  type DerivedMetricDefinition,
  type MetricDependency,
  type MetricGraphVersion,
  type PlayerMetricRecord,
} from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";
const systemCatalog = { scope: "system" as const };

const graphVersion: MetricGraphVersion = {
  id: "graph-v1",
  catalogScope: systemCatalog,
  name: "Assessment Graph",
  version: "1.0.0",
  status: "active",
  createdAt: now,
  updatedAt: now,
};

const metrics: AbilityMetric[] = [
  {
    id: "metric-speed",
    catalogScope: systemCatalog,
    code: "speed",
    name: "Speed",
    dimensionId: "dimension-physical",
    valueKind: "score_0_100",
    metricKind: "atomic",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "metric-agility",
    catalogScope: systemCatalog,
    code: "agility",
    name: "Agility",
    dimensionId: "dimension-physical",
    valueKind: "score_0_100",
    metricKind: "atomic",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "metric-physical-index",
    catalogScope: systemCatalog,
    code: "physical_index",
    name: "Physical Index",
    dimensionId: "dimension-physical",
    valueKind: "measurement",
    metricKind: "computed",
    createdAt: now,
    updatedAt: now,
  },
];

const dependencies: MetricDependency[] = [
  {
    id: "dependency-speed-index",
    catalogScope: systemCatalog,
    graphVersionId: "graph-v1",
    inputMetricId: "metric-speed",
    outputMetricId: "metric-physical-index",
    formulaId: "formula-physical-index",
    weight: 2,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "dependency-agility-index",
    catalogScope: systemCatalog,
    graphVersionId: "graph-v1",
    inputMetricId: "metric-agility",
    outputMetricId: "metric-physical-index",
    formulaId: "formula-physical-index",
    weight: 1,
    sortOrder: 2,
    createdAt: now,
    updatedAt: now,
  },
];

const formula: DerivedMetricDefinition = {
  id: "formula-physical-index",
  catalogScope: systemCatalog,
  code: "physical_index",
  name: "Physical Index",
  outputMetricId: "metric-physical-index",
  method: "weighted_average",
  inputMetricIds: ["metric-speed", "metric-agility"],
  version: "1.0.0",
  outputUnit: "score",
  createdAt: now,
  updatedAt: now,
};

const inputRecords: PlayerMetricRecord[] = [
  {
    id: "record-speed",
    clubId: "club-demo",
    studentId: "student-1",
    metricId: "metric-speed",
    value: { kind: "score_0_100", score: 80 },
    source: "assessment",
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "record-agility",
    clubId: "club-demo",
    studentId: "student-1",
    metricId: "metric-agility",
    value: { kind: "score_0_100", score: 50 },
    source: "assessment",
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
  },
];

describe("metric graph services", () => {
  it("computes controlled formulas in dependency order and records lineage", () => {
    let idCounter = 0;
    const result = computeMetricGraph({
      clubId: "club-demo",
      studentId: "student-1",
      graphVersion,
      metrics,
      dependencies,
      formulas: [formula],
      inputRecords,
      ids: {
        next: (prefix = "id") => `${prefix}-${++idCounter}`,
      },
      now,
      assessmentId: "assessment-1",
      templateVersionId: "assessment-template-version-1",
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual(expect.objectContaining({
      metricId: "metric-physical-index",
      value: { kind: "measurement", value: 70, unit: "score" },
      source: "algorithm",
      assessmentId: "assessment-1",
      templateVersionId: "assessment-template-version-1",
    }));
    expect(result.lineages).toEqual([
      expect.objectContaining({
        definitionId: "formula-physical-index",
        definitionVersion: "1.0.0",
        inputRecordIds: ["record-speed", "record-agility"],
      }),
    ]);
    expect(result.records[0]?.lineageId).toBe(result.lineages[0]?.id);
  });

  it("rejects circular metric graph dependencies", () => {
    expect(() => validateMetricGraphVersion({
      graphVersion,
      metrics,
      dependencies: [
        ...dependencies,
        {
          id: "dependency-cycle",
          catalogScope: systemCatalog,
          graphVersionId: "graph-v1",
          inputMetricId: "metric-physical-index",
          outputMetricId: "metric-speed",
          formulaId: "formula-physical-index",
          sortOrder: 3,
          createdAt: now,
          updatedAt: now,
        },
      ],
    })).toThrow("contains a cycle");
  });
});
