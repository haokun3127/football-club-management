import type {AssessmentTestItem} from "./assessment.js";
import {getNumericMetricValue,type MetricValue} from "./metrics.js";
/** Versioned raw measurement -> integer score -> grade; no implicit unit conversion. */
export interface MappingInterval {
  lower: number;
  upper: number;
  lowerInclusive: boolean;
  upperInclusive: boolean;
  score?: number;
  grade?: string;
}
export interface ScoreMappingDefinition {
  name: string;
  stage: "raw_score" | "score_grade";
  unit: string;
  minimum: number;
  maximum: number;
  applicability: string;
  basis: "trial" | "official";
  reference: string;
  rules: MappingInterval[];
}
export interface MappingIssue {
  code: string;
  rule?: number;
}
const contains = (rule: MappingInterval, value: number) =>
  (value > rule.lower || (value === rule.lower && rule.lowerInclusive)) &&
  (value < rule.upper || (value === rule.upper && rule.upperInclusive));
export function validateScoreMapping(
  definition: ScoreMappingDefinition,
): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const integer = definition.stage === "score_grade";
  if (
    !definition.name.trim() ||
    !definition.unit.trim() ||
    !definition.applicability.trim()
  )
    issues.push({ code: "definition_required" });
  if (
    !Number.isFinite(definition.minimum) ||
    !Number.isFinite(definition.maximum) ||
    definition.minimum > definition.maximum ||
    (integer &&
      (!Number.isInteger(definition.minimum) ||
        !Number.isInteger(definition.maximum)))
  )
    issues.push({ code: "invalid_domain" });
  if (!definition.rules.length) issues.push({ code: "rules_required" });
  const intervals = definition.rules
    .map((rule, index) => {
      const lower = integer
        ? rule.lower + (rule.lowerInclusive ? 0 : 1)
        : rule.lower;
      const upper = integer
        ? rule.upper - (rule.upperInclusive ? 0 : 1)
        : rule.upper;
      if (
        !Number.isFinite(rule.lower) ||
        !Number.isFinite(rule.upper) ||
        rule.lower > rule.upper ||
        (rule.lower === rule.upper &&
          !(rule.lowerInclusive && rule.upperInclusive)) ||
        lower > upper ||
        (integer &&
          (!Number.isInteger(rule.lower) || !Number.isInteger(rule.upper)))
      )
        issues.push({ code: "invalid_interval", rule: index });
      if (
        definition.stage === "raw_score"
          ? !Number.isSafeInteger(rule.score) ||
            rule.score! < 0 ||
            rule.grade !== undefined
          : !rule.grade?.trim() || rule.score !== undefined
      )
        issues.push({ code: "invalid_output", rule: index });
      if (rule.lower < definition.minimum || rule.upper > definition.maximum)
        issues.push({ code: "outside_domain", rule: index });
      return { rule, index, lower, upper };
    })
    .sort((a, b) => a.lower - b.lower || a.upper - b.upper);
  for (let i = 0; i < intervals.length; i++) {
    const current = intervals[i]!,
      previous = intervals[i - 1];
    if (!previous) {
      if (
        current.lower !== definition.minimum ||
        (!integer && !current.rule.lowerInclusive)
      )
        issues.push({ code: "domain_gap", rule: current.index });
    } else if (integer) {
      if (current.lower <= previous.upper)
        issues.push({ code: "interval_overlap", rule: current.index });
      else if (current.lower > previous.upper + 1)
        issues.push({ code: "domain_gap", rule: current.index });
    } else {
      if (
        current.lower < previous.upper ||
        (current.lower === previous.upper &&
          current.rule.lowerInclusive &&
          previous.rule.upperInclusive)
      )
        issues.push({ code: "interval_overlap", rule: current.index });
      else if (
        current.lower > previous.upper ||
        (current.lower === previous.upper &&
          !current.rule.lowerInclusive &&
          !previous.rule.upperInclusive)
      )
        issues.push({ code: "domain_gap", rule: current.index });
    }
  }
  const last = intervals.at(-1);
  if (
    last &&
    (last.upper !== definition.maximum ||
      (!integer && !last.rule.upperInclusive))
  )
    issues.push({ code: "domain_gap", rule: last.index });
  return issues;
}
export function evaluateScoreMapping(
  definition: ScoreMappingDefinition,
  input: { value: number; unit: string },
) {
  const issues = validateScoreMapping(definition);
  if (issues.length)
    throw new Error(
      "Invalid score mapping: " + issues.map((i) => i.code).join(","),
    );
  if (input.unit !== definition.unit) throw new Error("Mapping unit mismatch");
  if (
    !Number.isFinite(input.value) ||
    (definition.stage === "score_grade" && !Number.isInteger(input.value))
  )
    throw new Error("Invalid mapping input");
  const matched = definition.rules.filter((rule) =>
    contains(rule, input.value),
  );
  if (matched.length !== 1)
    throw new Error("Mapping input outside configured domain");
  const rule = matched[0]!;
  return definition.stage === "raw_score"
    ? { score: rule.score! }
    : { grade: rule.grade! };
}

export interface AssessmentMappingVersion {
 id:string;testItemId:string;status:"draft"|"active"|"archived";definition:ScoreMappingDefinition;
}
export function mapAssessmentValue(item:AssessmentTestItem,value:MetricValue,raw:AssessmentMappingVersion,grade:AssessmentMappingVersion) {
 if(raw.testItemId!==item.id || grade.testItemId!==item.id || raw.definition.stage!=="raw_score" || grade.definition.stage!=="score_grade" || raw.status==="draft" || grade.status==="draft" || raw.definition.basis!=="official" || grade.definition.basis!=="official" || !raw.definition.reference.trim() || !grade.definition.reference.trim())throw new Error("Invalid bound mapping versions");
 if(value.kind!==item.valueKind)throw new Error("Project value kind mismatch");
 const numeric=getNumericMetricValue(value);
 if(numeric===null || !Number.isFinite(numeric) || (value.kind === "count" && (!Number.isInteger(numeric)||numeric<0)) || (item.minimumValue!==undefined && numeric<item.minimumValue) || (item.maximumValue!==undefined && numeric>item.maximumValue))throw new Error("Invalid raw measurement");
 if((value.kind === "rating_1_5" && (!Number.isInteger(numeric) || numeric<1 || numeric>5)) || (["score_0_100","percentage"].includes(value.kind) && (numeric<0||numeric>100)) || (["duration_minutes","duration_seconds","distance_meters"].includes(value.kind) && numeric<0))throw new Error("Invalid typed measurement");
 const units:Record<string,string>={score_0_100:"score",rating_1_5:"score",count:"count",percentage:"%",duration_minutes:"min",duration_seconds:"s",distance_meters:"m"};
 const unit=value.kind==="measurement"?value.unit:item.unit??units[value.kind];
 if(!unit || (item.unit && unit!==item.unit))throw new Error("Project measurement unit mismatch");
 const mapped=evaluateScoreMapping(raw.definition,{value:numeric,unit});
 if(mapped.score===undefined)throw new Error("Integer score required");
 const rated=evaluateScoreMapping(grade.definition,{value:mapped.score,unit:"score"});
 if(rated.grade===undefined)throw new Error("Grade required");
 return {rawScoreVersionId:raw.id,gradeVersionId:grade.id,integerScore:mapped.score,grade:rated.grade};
}
