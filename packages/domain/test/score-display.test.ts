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
