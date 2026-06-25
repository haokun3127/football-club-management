import { describe, expect, it } from "vitest";
import { createMetricService, type MetricCatalogLookup, type MetricRecordStore } from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";

describe("createMetricService", () => {
  it("filters metric records by source and keeps lineage version on derived metrics", async () => {
    const saved = {
      records: [] as unknown[],
      lineages: [] as unknown[],
    };

    const store: MetricRecordStore = {
      listMetricRecordsByStudent: async () => [
        {
          id: "record-goals",
          clubId: "club-demo",
          studentId: "student-1",
          metricId: "metric-goals",
          value: { kind: "count", count: 2 },
          source: "match_event",
          occurredAt: "2026-06-24T10:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "record-training",
          clubId: "club-demo",
          studentId: "student-1",
          metricId: "metric-assists",
          value: { kind: "count", count: 1 },
          source: "training_observation",
          occurredAt: "2026-06-23T10:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "record-foreign",
          clubId: "club-other",
          studentId: "student-1",
          metricId: "metric-goals",
          value: { kind: "count", count: 9 },
          source: "match_event",
          occurredAt: "2026-06-22T10:00:00.000Z",
          createdAt: now,
          updatedAt: now,
        },
      ],
      saveMetricRecord: async (record) => saved.records.push(record),
      saveMetricLineage: async (lineage) => saved.lineages.push(lineage),
    };

    const catalog: MetricCatalogLookup = {
      findDerivedDefinitionByCode: async (_clubId, code) => {
        if (code !== "attacking_contribution") {
          return null;
        }

        return {
          id: "derived-attacking-contribution",
          catalogScope: { scope: "system" as const },
          code: "attacking_contribution",
          name: "Attacking Contribution",
          outputMetricId: "metric-attacking-contribution",
          method: "weighted_average",
          inputMetricIds: ["metric-goals"],
          version: "1.2.3",
          createdAt: now,
          updatedAt: now,
        };
      },
    };

    let idCounter = 0;
    const service = createMetricService({
      clock: { now: () => now },
      ids: {
        next: (prefix = "id") => `${prefix}-${++idCounter}`,
      },
      store,
      catalog,
    });

    const records = await service.listStudentMetricRecords("club-demo", "student-1", { source: "match_event" });
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe("record-goals");

    const result = await service.computeDerivedMetric("club-demo", "student-1", "attacking_contribution");
    expect(result.lineage.definitionVersion).toBe("1.2.3");
    expect(result.lineage.inputRecordIds).toEqual(["record-goals"]);
    expect(saved.records).toHaveLength(1);
    expect(saved.lineages).toHaveLength(1);
  });
});
