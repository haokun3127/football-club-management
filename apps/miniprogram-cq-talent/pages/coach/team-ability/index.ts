import { getCoachTeamAbilityOverview } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { LoadState, RadarMetricPoint } from "../../../utils/types";

interface DimensionRow {
  metricId: string;
  label: string;
  average: string;
  top: string;
  bottom: string;
}

interface PageData {
  state: LoadState;
  message: string;
  studentCount: number;
  overall: string;
  trendLabel: string;
  trendPositive: boolean;
  radar: RadarMetricPoint[];
  dimensions: DimensionRow[];
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    studentCount: 0,
    overall: "-",
    trendLabel: "",
    trendPositive: true,
    radar: [],
    dimensions: [],
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ state: "loading", message: "正在汇总团队能力数据" });
    try {
      const overview = await getCoachTeamAbilityOverview();
      const dimensions = overview.dimensions.map((dimension) => ({
        metricId: dimension.metricId,
        label: dimension.label,
        average: dimension.average === null ? "-" : String(dimension.average),
        top: dimension.top === null ? "-" : String(dimension.top),
        bottom: dimension.bottom === null ? "-" : String(dimension.bottom),
      }));
      const radar: RadarMetricPoint[] = overview.dimensions
        .filter((dimension) => dimension.average !== null)
        .map((dimension) => ({
          metricId: dimension.metricId,
          label: dimension.label,
          value: dimension.average as number,
          maxValue: 100,
        }));
      const delta = overview.trendDelta;
      this.setData({
        state: dimensions.length ? "ready" : "empty",
        message: dimensions.length ? "" : "暂无团队评测数据。",
        studentCount: overview.studentCount,
        overall: overview.overall === null ? "-" : String(Math.round(overview.overall)),
        trendLabel: delta === null ? "" : `较上季 ${delta >= 0 ? "+" : ""}${delta}`,
        trendPositive: delta === null || delta >= 0,
        radar,
        dimensions,
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "团队能力读取失败，请稍后重试。" });
    }
  },
  retry() {
    this.load();
  },
});
