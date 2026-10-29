import { assessmentValueText } from "../../utils/assessment-input";
import type { ConfirmedStudentResult } from "../../utils/types";

type ResultValue = Pick<ConfirmedStudentResult, "value" | "unit">;

// Domain score-mapping units and existing native metric-unit aliases; never infer from the project name.
const UNIT_LABELS: Record<string, string> = {
  score: "分", count: "次", "%": "%", min: "分钟", s: "秒", m: "米",
  goal: "个", assist: "次", 分: "分", 次: "次", 秒: "秒", 分钟: "分钟", 米: "米", 个: "个", 级: "级",
};
const KIND_UNITS: Record<string, string> = {
  score_0_100: "分", rating_1_5: "级", count: "次", percentage: "%",
  duration_minutes: "分钟", duration_seconds: "秒", distance_meters: "米",
};

export function parentResultUnit(row: ResultValue): { label: string; known: boolean; raw: string } {
  const raw = row.unit?.trim() || (typeof row.value.unit === "string" ? row.value.unit.trim() : "");
  if (raw) {
    const label = Object.prototype.hasOwnProperty.call(UNIT_LABELS, raw) ? UNIT_LABELS[raw] : undefined;
    return { label: label ?? "单位待确认", known: label !== undefined, raw };
  }
  const kind = String(row.value.kind);
  const kindUnit = Object.prototype.hasOwnProperty.call(KIND_UNITS, kind) ? KIND_UNITS[kind] : undefined;
  if (kindUnit !== undefined) return { label: kindUnit, known: true, raw: "" };
  if (kind === "text" || kind === "tag") return { label: "", known: true, raw: "" };
  return { label: "单位待确认", known: false, raw: "" };
}

export function parentResultValue(row: ResultValue): string {
  const raw = assessmentValueText(row.value);
  if (!raw) return "原始值未记录";
  const unit = parentResultUnit(row);
  return unit.known ? `${raw}${unit.label ? ` ${unit.label}` : ""}` : `${raw}（单位待确认）`;
}
