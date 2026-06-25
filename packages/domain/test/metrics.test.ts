import { describe, expect, it } from "vitest";
import { derivePlayerMetricRecord, type DerivedMetricDefinition, type PlayerMetricRecord } from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";

function record(id: string, metricId: string, value: number): PlayerMetricRecord {
  return {
    id,
    clubId: "club-demo",
    studentId: "student-1",
    metricId,
    value: { kind: "count", count: value },
    source: "match_event",
    occurredAt: now,
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
      name: "Attacking Contribution",
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
      clubId: "club-demo",
      studentId: "student-1",
      now,
    });

    expect(result.record.source).toBe("algorithm");
    expect(result.record.clubId).toBe("club-demo");
    expect(result.record.value).toEqual({ kind: "measurement", value: 1.67, unit: "score" });
    expect(result.lineage.inputRecordIds).toEqual(["record-goals", "record-assists"]);
    expect(result.lineage.definitionVersion).toBe("1.0.0");
  });
});
