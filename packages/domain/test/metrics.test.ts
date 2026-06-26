import { describe, expect, it } from "vitest";
import {
  deriveMetricGraph,
  derivePlayerMetricRecord,
  validateDerivedMetricDefinitions,
  validateMetricGraph,
  type AbilityMetric,
  type DerivedMetricDefinition,
  type MetricDependency,
  type PlayerMetricRecord,
} from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";

function record(id: string, metricId: string, value: number): PlayerMetricRecord {
  return {
    id,
    clubId: "club-chongqing-talent",
    studentId: "student-1",
    metricId,
    value: { kind: "count", count: value },
    source: "match_event",
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function metric(id: string, metricKind: AbilityMetric["metricKind"] = "atomic"): AbilityMetric {
  return {
    id,
    catalogScope: { scope: "system" },
    code: id,
    name: id,
    dimensionId: "dimension-technical",
    valueKind: "measurement",
    metricKind,
    createdAt: now,
    updatedAt: now,
  };
}

describe("derivePlayerMetricRecord", () => {
  it("creates an algorithm-sourced metric record with lineage", () => {
    const definition: DerivedMetricDefinition = {
      id: "derived-attacking-contribution",
      catalogScope: { scope: "system" },
      code: "attacking_contribution",
      name: "进攻贡献",
      outputMetricId: "metric-attacking-contribution",
      method: "weighted_average",
      inputMetricIds: ["metric-goals", "metric-assists"],
      version: "1.0.0",
      weights: {
        "metric-goals": 2,
        "metric-assists": 1,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = derivePlayerMetricRecord({
      definition,
      inputRecords: [
        record("record-goals", "metric-goals", 2),
        {
          ...record("record-foreign-goals", "metric-goals", 9),
          clubId: "club-other",
        },
        record("record-assists", "metric-assists", 1),
      ],
      outputRecordId: "record-attacking-contribution",
      lineageId: "lineage-1",
      clubId: "club-chongqing-talent",
      studentId: "student-1",
      now,
    });

    expect(result.record.source).toBe("algorithm");
    expect(result.record.clubId).toBe("club-chongqing-talent");
    expect(result.record.value).toEqual({ kind: "measurement", value: 1.67, unit: "score" });
    expect(result.lineage.inputRecordIds).toEqual(["record-goals", "record-assists"]);
    expect(result.lineage.definitionVersion).toBe("1.0.0");
  });

  it("validates metric graph dependencies and rejects cycles", () => {
    const metrics = [
      metric("metric-speed"),
      metric("metric-acceleration"),
      metric("metric-athleticism", "computed"),
    ];
    const dependencies: MetricDependency[] = [
      {
        id: "dependency-speed-athleticism",
        catalogScope: { scope: "system" },
        graphVersionId: "graph-1",
        inputMetricId: "metric-speed",
        outputMetricId: "metric-athleticism",
        weight: 0.7,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "dependency-acceleration-athleticism",
        catalogScope: { scope: "system" },
        graphVersionId: "graph-1",
        inputMetricId: "metric-acceleration",
        outputMetricId: "metric-athleticism",
        weight: 0.3,
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];

    expect(validateMetricGraph(metrics, dependencies).calculationOrder).toContain("metric-athleticism");

    expect(() => validateMetricGraph(metrics, [
      ...dependencies,
      {
        id: "dependency-athleticism-speed",
        catalogScope: { scope: "system" },
        graphVersionId: "graph-1",
        inputMetricId: "metric-athleticism",
        outputMetricId: "metric-speed",
        sortOrder: 3,
        createdAt: now,
        updatedAt: now,
      },
    ])).toThrow(/cycle/i);
  });

  it("computes metric graph outputs and records lineage", () => {
    const metrics = [
      metric("metric-speed"),
      metric("metric-acceleration"),
      metric("metric-athleticism", "computed"),
    ];
    const dependencies: MetricDependency[] = [
      {
        id: "dependency-speed-athleticism",
        catalogScope: { scope: "system" },
        graphVersionId: "graph-1",
        inputMetricId: "metric-speed",
        outputMetricId: "metric-athleticism",
        weight: 0.7,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "dependency-acceleration-athleticism",
        catalogScope: { scope: "system" },
        graphVersionId: "graph-1",
        inputMetricId: "metric-acceleration",
        outputMetricId: "metric-athleticism",
        weight: 0.3,
        sortOrder: 2,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const definitions: DerivedMetricDefinition[] = [
      {
        id: "derived-athleticism",
        catalogScope: { scope: "system" },
        code: "athleticism",
        name: "Athleticism",
        outputMetricId: "metric-athleticism",
        method: "normalized_weighted_sum",
        inputMetricIds: ["metric-speed", "metric-acceleration"],
        version: "1.0.0",
        weights: {
          "metric-speed": 0.7,
          "metric-acceleration": 0.3,
        },
        inputScale: 100,
        maxScore: 10,
        outputUnit: "score",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const result = deriveMetricGraph({
      metrics,
      dependencies,
      definitions,
      inputRecords: [
        {
          ...record("record-speed", "metric-speed", 80),
          value: { kind: "score_0_100", score: 80 },
        },
        {
          ...record("record-acceleration", "metric-acceleration", 60),
          value: { kind: "score_0_100", score: 60 },
        },
      ],
      clubId: "club-chongqing-talent",
      studentId: "student-1",
      now,
      nextRecordId: () => "record-athleticism",
      nextLineageId: () => "lineage-athleticism",
    });

    expect(result.records).toEqual([
      expect.objectContaining({
        id: "record-athleticism",
        metricId: "metric-athleticism",
        value: { kind: "measurement", value: 7.4, unit: "score" },
      }),
    ]);
    expect(result.lineages[0]?.inputRecordIds).toEqual(["record-speed", "record-acceleration"]);
  });

  it("requires derived definitions to match declared graph dependencies", () => {
    const metrics = [
      metric("metric-speed"),
      metric("metric-agility"),
      metric("metric-athleticism", "computed"),
    ];
    const dependencies: MetricDependency[] = [
      {
        id: "dependency-speed-athleticism",
        catalogScope: { scope: "system" },
        graphVersionId: "graph-1",
        inputMetricId: "metric-speed",
        outputMetricId: "metric-athleticism",
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const definitions: DerivedMetricDefinition[] = [
      {
        id: "derived-athleticism",
        catalogScope: { scope: "system" },
        code: "athleticism",
        name: "Athleticism",
        outputMetricId: "metric-athleticism",
        method: "weighted_average",
        inputMetricIds: ["metric-speed", "metric-agility"],
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
      },
    ];

    expect(() => validateDerivedMetricDefinitions(metrics, dependencies, definitions)).toThrow(/not declared/i);
  });
});
