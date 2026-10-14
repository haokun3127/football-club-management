import { describe, it, expect } from "vitest";
import {
  evaluateScoreMapping,
  validateScoreMapping,
  type ScoreMappingDefinition,
} from "../src/score-mapping.js";
const raw: ScoreMappingDefinition = {
  name: "合成试算",
  stage: "raw_score",
  unit: "s",
  minimum: 0,
  maximum: 10,
  applicability: "仅合成测试",
  basis: "trial",
  reference: "",
  rules: [
    {
      lower: 0,
      upper: 5,
      lowerInclusive: true,
      upperInclusive: false,
      score: 90,
    },
    {
      lower: 5,
      upper: 10,
      lowerInclusive: true,
      upperInclusive: true,
      score: 70,
    },
  ],
};
describe("explicit two-stage score mappings", () => {
  it("preserves precision and owns every raw boundary once", () => {
    expect(validateScoreMapping(raw)).toEqual([]);
    expect(evaluateScoreMapping(raw, { value: 0, unit: "s" })).toEqual({
      score: 90,
    });
    expect(evaluateScoreMapping(raw, { value: 4.999, unit: "s" })).toEqual({
      score: 90,
    });
    expect(evaluateScoreMapping(raw, { value: 5, unit: "s" })).toEqual({
      score: 70,
    });
    expect(evaluateScoreMapping(raw, { value: 10, unit: "s" })).toEqual({
      score: 70,
    });
  });
  it("rejects overlaps and missing boundary points", () => {
    expect(
      validateScoreMapping({
        ...raw,
        rules: raw.rules.map((r) => ({ ...r, upperInclusive: true })),
      }).some((i) => i.code === "interval_overlap"),
    ).toBe(true);
    expect(
      validateScoreMapping({
        ...raw,
        rules: raw.rules.map((r) => ({ ...r, lowerInclusive: false })),
      }).some((i) => i.code === "domain_gap"),
    ).toBe(true);
  });
  it("requires integer scores, finite intervals and correct units", () => {
    expect(
      validateScoreMapping({
        ...raw,
        rules: [{ ...raw.rules[0]!, score: 90.5 }],
      }).some((i) => i.code === "invalid_output"),
    ).toBe(true);
    expect(() => evaluateScoreMapping(raw, { value: 5, unit: "m" })).toThrow(
      "unit",
    );
    expect(() => evaluateScoreMapping(raw, { value: 11, unit: "s" })).toThrow(
      "outside",
    );
    expect(validateScoreMapping({ ...raw, maximum: Infinity })).toContainEqual({
      code: "invalid_domain",
    });
  });
  it("validates contiguous integer grade intervals without treating integer gaps as decimal gaps", () => {
    const grade: ScoreMappingDefinition = {
      ...raw,
      stage: "score_grade",
      unit: "score",
      minimum: 0,
      maximum: 100,
      rules: [
        {
          lower: 0,
          upper: 49,
          lowerInclusive: true,
          upperInclusive: true,
          grade: "B",
        },
        {
          lower: 50,
          upper: 100,
          lowerInclusive: true,
          upperInclusive: true,
          grade: "A",
        },
      ],
    };
    expect(validateScoreMapping(grade)).toEqual([]);
    expect(evaluateScoreMapping(grade, { value: 49, unit: "score" })).toEqual({
      grade: "B",
    });
    expect(evaluateScoreMapping(grade, { value: 50, unit: "score" })).toEqual({
      grade: "A",
    });
    expect(() =>
      evaluateScoreMapping(grade, { value: 49.5, unit: "score" }),
    ).toThrow("input");
    expect(
      validateScoreMapping({
        ...grade,
        rules: [grade.rules[0]!, { ...grade.rules[1]!, lower: 51 }],
      }).some((i) => i.code === "domain_gap"),
    ).toBe(true);
  });
  it("rejects disjoint and reversed intervals instead of inventing a rule", () => {
    expect(
      validateScoreMapping({
        ...raw,
        rules: [{ ...raw.rules[0]!, lower: 7, upper: 6 }],
      }).some((i) => i.code === "invalid_interval"),
    ).toBe(true);
    expect(
      validateScoreMapping({ ...raw, rules: [raw.rules[0]!] }).some(
        (i) => i.code === "domain_gap",
      ),
    ).toBe(true);
  });
});
