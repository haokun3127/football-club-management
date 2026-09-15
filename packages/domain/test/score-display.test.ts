import { describe, expect, it } from "vitest";
import { scorePercent } from "../src/score-display.js";
describe("score display", () => {
  it("requires an explicit score maximum for computed measurements", () => {
    expect(scorePercent({ kind: "measurement", value: 10, unit: "score" }, { maxScore: 10 })).toBe(100);
    expect(scorePercent({ kind: "measurement", value: 10, unit: "score" })).toBeNull();
    expect(scorePercent({ kind: "duration_seconds", seconds: 5.6 }, { maxScore: 10 })).toBeNull();
    expect(scorePercent({ kind: "rating_1_5", score: 4 })).toBe(80);
    expect(scorePercent({ kind: "score_0_100", score: 0 })).toBe(0);
  });
});

it("honors graph edge weights and rounds the combined score only once", async () => {
  const { withScoreMaxima, overallScore } = await import("../src/score-display.js");
  const audit = { createdAt: "2026-09-15T00:00:00Z", updatedAt: "2026-09-15T00:00:00Z", catalogScope: { scope: "system" as const } };
  const atomic = { ...audit, id: "a", code: "a", name: "A", dimensionId: "d", valueKind: "score_0_100" as const, metricKind: "atomic" as const, maxScore: 100 };
  const composite = { ...atomic, id: "c", code: "c", metricKind: "composite" as const, maxScore: 100 };
  const maxima = withScoreMaxima([atomic, composite], [{ ...audit, id: "formula", code: "formula", name: "F", outputMetricId: "c", inputMetricIds: ["a"], method: "normalized_weighted_sum", version: "1", weights: { a: 1 }, inputScale: 100, maxScore: 10 }], [{ ...audit, id: "edge", graphVersionId: "g", outputMetricId: "c", inputMetricId: "a", formulaId: "formula", weight: 0.5, sortOrder: 0 }]);
  expect(maxima[1]?.maxScore).toBe(5);
  const records = [
    { ...audit, id: "r1", clubId: "club", studentId: "s", metricId: "a", value: { kind: "measurement" as const, value: 0.33, unit: "score" }, source: "assessment" as const, occurredAt: audit.createdAt },
    { ...audit, id: "r2", clubId: "club", studentId: "s", metricId: "c", value: { kind: "measurement" as const, value: 0.12, unit: "score" }, source: "assessment" as const, occurredAt: audit.createdAt },
  ];
  expect(overallScore(records, [{ ...atomic, maxScore: 3 }, { ...composite, maxScore: 7 }])).toBe(4.5);
});
