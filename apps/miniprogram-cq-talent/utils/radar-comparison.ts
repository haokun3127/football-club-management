import type { RadarMetricPoint } from "./types";
import type { PlotSeries } from "./radar-option";
export interface ComparisonPoint {
  metricId: string;
  score: number | null;
  rawLabel: string;
  factId: string | null;
  occurredAt: string | null;
  metricVersion: string | null;
  mappingVersion: string | null;
  status: "measured" | "missing" | "unmapped" | "incompatible";
  reason: string;
}
export interface ComparisonSeries {
  id: string;
  name: string;
  kind: "latest_per_metric" | "history" | "standard";
  points: ComparisonPoint[];
}
export interface ComparisonData {
  views: Array<{ id: string; name: string; metricIds: string[] }>;
  axes: Array<{
    metricId: string;
    label: string;
    rawUnit: string | null;
    scoreMin: number;
    scoreMax: number;
    metricVersion: string | null;
    mappingVersion: string | null;
  }>;
  current: ComparisonSeries;
  comparisonOptions: {
    history: Array<{ id: string; label: string; date: string }>;
    standards: Array<{ id: string; label: string; date: string }>;
    historyReason: string;
    standardReason: string;
  };
  selectedComparisons: ComparisonSeries[];
}
const dateLabel = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 10)
    : "";
export const SERIES_COLORS = {
  latest_per_metric: "#3686ed",
  history: "#e08a35",
  standard: "#31aa83",
};
export function comparisonView(
  data: ComparisonData,
  viewId: string,
  selected: string[],
  hidden: string[],
) {
  const view = data.views.find((item) => item.id === viewId) ?? data.views[0],
    groupIds = view?.metricIds ?? [];
  const groupAxes = groupIds.flatMap((id) => {
    const axis = data.axes.find((item) => item.metricId === id);
    return axis ? [axis] : [];
  });
  const axes = groupAxes
    .filter((axis) => selected.includes(axis.metricId))
    .slice(0, 8);
  const series = [data.current, ...data.selectedComparisons],
    plots: PlotSeries[] = [],
    issues: Array<{ id: string; text: string }> = [];
  for (const item of series) {
    if (hidden.includes(item.id)) continue;
    const points = axes.map((axis) =>
      item.points.find((point) => point.metricId === axis.metricId),
    );
    const missing = axes.filter((axis, index) => {
      const point = points[index];
      return (
        !point ||
        point.status !== "measured" ||
        point.score === null ||
        !Number.isFinite(point.score) ||
        point.metricVersion !== axis.metricVersion ||
        point.mappingVersion !== axis.mappingVersion ||
        point.score < axis.scoreMin ||
        point.score > axis.scoreMax
      );
    });
    if (missing.length) {
      issues.push({
        id: item.id,
        text: `${item.name}：${missing.map((axis) => axis.label).join("、")}缺测、未映射或版本不兼容，未绘制此系列`,
      });
      continue;
    }
    plots.push({
      id: item.id,
      name: item.name,
      values: points.map((point) => point!.score!),
      color: SERIES_COLORS[item.kind],
      opacity: item.kind === "latest_per_metric" ? 0.2 : 0.12,
      lineWidth: item.kind === "latest_per_metric" ? 2 : 1.5,
    });
  }
  return {
    viewId: view?.id || "",
    viewName: view?.name || "已配置指标",
    metrics: axes.map((axis) => ({
      metricId: axis.metricId,
      label: axis.label,
      value:
        data.current.points.find((point) => point.metricId === axis.metricId)
          ?.score ?? null,
      maxValue: axis.scoreMax,
    })) as RadarMetricPoint[],
    plots,
    issues,
    axisOptions: groupAxes.map((axis) => ({
      label: axis.label,
      value: axis.metricId,
    })),
    selectionLabel: `已选${axes.length}/${groupAxes.length}项${axes.length < 3 ? " · 显示数值" : ""}`,
    legends: series.map((item) => ({
      id: item.id,
      name: item.name,
      color: SERIES_COLORS[item.kind],
      visible: !hidden.includes(item.id),
    })),
    allHidden: series.every((item) => hidden.includes(item.id)),
    rows: groupAxes.map((axis) => ({
      id: axis.metricId,
      name: axis.label,
      values: series.map((item) => {
        const point = item.points.find((p) => p.metricId === axis.metricId),
          score = point?.score;
        const value =
          point?.status === "measured" && score !== null && score !== undefined
            ? `${point.rawLabel === String(score) ? "" : `${point.rawLabel} · `}${score} / 100`
            : point?.rawLabel || "未测";
        return {
          id: item.id,
          text: `${item.name}：${value}`,
          date: dateLabel(point?.occurredAt),
          reason:
            point?.status !== "measured" ? point?.reason || "尚无此项成绩" : "",
        };
      }),
    })),
  };
}
