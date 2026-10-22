import { describe, expect, it } from "vitest";
import { assessmentInputError, assessmentUnit, assessmentValueText } from "./assessment-input";
const field = (valueKind, extra = {}) => ({ valueKind, ...extra });
describe("configured assessment input", () => {
  it.each(["score_0_100", "count", "percentage", "duration_seconds", "duration_minutes", "distance_meters"])("retains zero and allows a missing %s draft without manufacturing a value", kind => {
    expect(assessmentInputError(field(kind), "0")).toBeNull(); expect(assessmentInputError(field(kind), "")).toBeNull();
  });
  it("accepts configured raw measurements without pretending they are standard scores", () => {
    expect(assessmentInputError(field("duration_seconds", { minValue: 1, maxValue: 600 }), "185.25")).toBeNull();
    expect(assessmentInputError(field("duration_seconds", { maxValue: 180 }), "185.25")).toContain("180");
    expect(assessmentInputError(field("duration_seconds"), "-1")).not.toBeNull();
  });
  it("rejects invalid typed values instead of rounding or clamping", () => {
    for (const [kind, value] of [["count", "1.2"], ["count", "-1"], ["rating_1_5", "2.5"], ["rating_1_5", "0"], ["score_0_100", "101"], ["percentage", "Infinity"]]) expect(assessmentInputError(field(kind), value)).not.toBeNull();
  });
  it("preserves supplied units and supports text", () => {
    expect(assessmentUnit(field("measurement", {unit:"km/h"}))).toBe("km/h");
    expect(assessmentUnit(field("duration_seconds"))).toBe("秒");
    expect(assessmentInputError(field("text"), "良好")).toBeNull();
  });
});

it.each([{count:0},{seconds:185.25},{meters:1.2},{tag:"良好"}])("reads raw values for review and history: %j", value => {
  expect(assessmentValueText(value)).toBe(String(Object.values(value)[0]));
  expect(assessmentValueText(null)).toBe("");
});
