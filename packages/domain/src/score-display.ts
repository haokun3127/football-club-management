import { getNumericMetricValue, type AbilityMetric, type DerivedMetricDefinition, type MetricValue, type PlayerMetricRecord } from "./metrics.js";

/** Derive attainable maxima from the same formulas as the score graph. No database writes. */
export function withScoreMaxima(metrics: AbilityMetric[], formulas: DerivedMetricDefinition[]): AbilityMetric[] {
  const maxima = new Map(metrics.filter((m) => m.metricKind === "atomic" && Number.isFinite(m.maxScore)).map((m) => [m.id, m.maxScore!]));
  const pending = [...formulas];
  while (pending.length) {
    let changed = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const formula = pending[index]!;
      const values = formula.inputMetricIds.map((id) => maxima.get(id));
      if (!values.length || values.some((v) => v === undefined)) continue;
      const weights = formula.inputMetricIds.map((id) => formula.weights?.[id] ?? 1);
      const weighted = values.reduce<number>((total, value, i) => total + value! * weights[i]!, 0);
      let maximum: number | undefined;
      if (formula.method === "sum") maximum = values.reduce<number>((total, value) => total + value!, 0);
      if (formula.method === "weighted_average") maximum = weighted / weights.reduce((a, b) => a + b, 0);
      if (formula.method === "normalized_weighted_sum") maximum = weighted / (formula.inputScale ?? 100) * (formula.maxScore ?? 1);
      if (maximum === undefined || !Number.isFinite(maximum) || maximum <= 0) continue;
      maxima.set(formula.outputMetricId, maximum);
      pending.splice(index, 1); changed = true;
    }
    if (!changed) break;
  }
  return metrics.map((metric) => maxima.has(metric.id) ? { ...metric, maxScore: maxima.get(metric.id)! } : metric);
}

export function scorePercent(value: MetricValue, metric?: Pick<AbilityMetric, "maxScore" | "unit">): number | null {
  const number = getNumericMetricValue(value);
  if (number === null || !Number.isFinite(number)) return null;
  const max = value.kind === "rating_1_5" ? 5 : value.kind === "score_0_100" || value.kind === "percentage" ? 100
    : value.kind === "measurement" && value.unit === "score" ? metric?.maxScore : undefined;
  return max && Number.isFinite(max) && max > 0 ? Math.round(Math.max(0, Math.min(100, number / max * 100)) * 10) / 10 : null;
}

export function overallScore(records: PlayerMetricRecord[], metrics: AbilityMetric[]): number | null {
  if (!metrics.length) return null;
  let total = 0, maximum = 0;
  for (const metric of metrics) {
    const record = records.filter((r) => r.metricId === metric.id).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
    if (!record) return null;
    const percent = scorePercent(record.value, metric);
    if (percent === null) return null;
    const weight = metric.maxScore ?? 100;
    total += percent * weight; maximum += weight;
  }
  return maximum ? Math.round(total / maximum * 10) / 10 : null;
}
