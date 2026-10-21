import type { RadarMetricPoint } from "./types";
export interface PlotSeries {
  id: string;
  name: string;
  values: number[];
  color: string;
  opacity: number;
  lineWidth: number;
}
export function radarOption(
  metrics: RadarMetricPoint[],
  series: PlotSeries[],
  configured: boolean,
  dark: boolean,
) {
  const axes = metrics.filter(
    (point) =>
      point.metricId &&
      point.label &&
      Number.isFinite(point.maxValue) &&
      point.maxValue > 0,
  );
  const current = axes.map((point) => point.value);
  const plots = configured
    ? series
    : current.every(
          (value) => typeof value === "number" && Number.isFinite(value),
        )
      ? [
          {
            id: "current",
            name: "当前",
            values: current as number[],
            color: "#3686ed",
            opacity: 0.2,
            lineWidth: 2,
          },
        ]
      : [];
  const valid =
    axes.length >= 3 && axes.length <= 8
      ? plots.filter(
          (plot) =>
            plot.values.length === axes.length &&
            plot.values.every(
              (value, index) =>
                Number.isFinite(value) &&
                value >= 0 &&
                value <= axes[index]!.maxValue,
            ),
        )
      : [];
  return {
    animation: false,
    backgroundColor: "transparent",
    radar: {
      center: ["50%", "50%"],
      radius: "60%",
      splitNumber: 4,
      shape: "polygon",
      axisName: {
        color: dark ? "#e8edf5" : "#344054",
        fontSize: 14,
        lineHeight: 18,
        formatter: (name: string) =>
          name.length > 5
            ? `${name.slice(0, 5)}\n${name.slice(5, 10)}${name.length > 10 ? "…" : ""}`
            : name,
      },
      nameGap: 8,
      indicator: axes.map((point) => ({
        name: point.label,
        min: 0,
        max: point.maxValue,
      })),
      axisLine: { lineStyle: { color: dark ? "#33445d" : "#d0d5dd" } },
      splitLine: { lineStyle: { color: dark ? "#33445d" : "#e4e7ec" } },
      splitArea: { show: false },
    },
    series: [
      {
        type: "radar",
        silent: true,
        symbol: "circle",
        symbolSize: 4,
        data: valid.map((plot) => ({
          id: plot.id,
          name: plot.name,
          value: plot.values,
          lineStyle: { color: plot.color, width: plot.lineWidth },
          itemStyle: { color: plot.color },
          areaStyle: { color: plot.color, opacity: plot.opacity },
        })),
      },
    ],
  };
}
