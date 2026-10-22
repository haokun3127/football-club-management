import type { AssessmentForm } from "./types";

type Field = AssessmentForm["fields"][number];

/** Validate the configured measurement without rounding it or turning missing into zero. */
export function assessmentInputError(field: Field, value: string): string | null {
  const text = value.trim();
  if (!text || field.valueKind === "text" || field.valueKind === "tag") return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return "请输入有效数字";
  if (["score_0_100", "percentage"].includes(field.valueKind) && (number < 0 || number > 100)) return "请输入0–100范围内的数值";
  if (field.valueKind === "rating_1_5" && (!Number.isInteger(number) || number < 1 || number > 5)) return "请输入1–5整数评级";
  if (field.valueKind === "count" && (!Number.isInteger(number) || number < 0)) return "次数须为非负整数";
  if (["duration_seconds", "duration_minutes", "distance_meters"].includes(field.valueKind) && number < 0) return "数值不能小于0";
  if (field.minValue !== undefined && number < field.minValue) return `不能小于${field.minValue}`;
  if (field.maxValue !== undefined && number > field.maxValue) return `不能大于${field.maxValue}`;
  return null;
}

export function assessmentUnit(field: Field): string {
  if (field.unit) return field.unit;
  const units: Record<string, string> = { duration_seconds: "秒", duration_minutes: "分钟", distance_meters: "米", count: "次", percentage: "%", score_0_100: "分", rating_1_5: "级" };
  return units[field.valueKind] || "";
}

/** Extract the stored raw value consistently in entry, review and history. */
export function assessmentValueText(value?: Record<string, unknown> | null): string {
  if (!value) return "";
  const raw = value.score ?? value.count ?? value.percentage ?? value.minutes ?? value.seconds ?? value.meters ?? value.value ?? value.text ?? value.tag;
  return typeof raw === "string" || typeof raw === "number" && Number.isFinite(raw) ? String(raw) : "";
}
