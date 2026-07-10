import { getParentChildren, getParentGrowth, getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, MetricDetail, RadarMetricPoint, StudentSummary } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取成长数据",
    children: [] as StudentSummary[],
    activeStudentId: "",
    growth: null as GrowthSummary | null,
    viewIndex: 0,
    radar: [] as RadarMetricPoint[],
    selectedMetricId: "",
    selectedMetric: null as RadarMetricPoint | null,
    selectedDetail: null as MetricDetail | null,
    detailState: "idle" as LoadState,
    detailCache: {} as Record<string, MetricDetail>,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取成长数据" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，无法查看成长数据。" });
        return;
      }
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) return;
      setCurrentStudentId(active.id);
      const growth = await getParentGrowth(active.id, active);
      const radar = radarForView(growth, 0);
      const selectedMetric = radar[0] ?? null;
      this.setData({
        state: radar.length >= 3 ? "ready" : "empty",
        message: radar.length >= 3 ? "" : "有效能力指标不足，完成训练或评测后生成雷达图。",
        children,
        activeStudentId: active.id,
        growth,
        viewIndex: 0,
        radar,
        selectedMetricId: selectedMetric?.metricId ?? "",
        selectedMetric,
        selectedDetail: null,
        detailCache: {},
      });
      if (selectedMetric) await this.loadMetricDetail(selectedMetric.metricId);
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  switchChild(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id || id === this.data.activeStudentId) return;
    setCurrentStudentId(id);
    this.load();
  },
  onViewChange(event: { detail: { value: string | number } }) {
    const viewIndex = Number(event.detail.value);
    if (!this.data.growth) return;
    const radar = radarForView(this.data.growth, viewIndex);
    const selectedMetric = radar[0] ?? null;
    this.setData({ viewIndex, radar, selectedMetricId: selectedMetric?.metricId ?? "", selectedMetric, selectedDetail: null });
    if (selectedMetric) this.loadMetricDetail(selectedMetric.metricId);
  },
  selectMetric(event: { detail?: { metricId?: string }; currentTarget?: { dataset?: { id?: string } } }) {
    const metricId = event.detail?.metricId || event.currentTarget?.dataset?.id;
    if (!metricId) return;
    const selectedMetric = this.data.radar.find((metric: RadarMetricPoint) => metric.metricId === metricId) ?? null;
    this.setData({ selectedMetricId: metricId, selectedMetric });
    this.loadMetricDetail(metricId);
  },
  async loadMetricDetail(metricId: string) {
    const cached = this.data.detailCache[metricId];
    if (cached) {
      this.setData({ selectedDetail: cached, detailState: "ready" });
      return;
    }
    this.setData({ detailState: "loading", selectedDetail: null });
    try {
      const detail = await getParentMetricDetail(this.data.activeStudentId, metricId);
      this.setData({ selectedDetail: detail, detailState: "ready", detailCache: { ...this.data.detailCache, [metricId]: detail } });
    } catch (_error) {
      this.setData({ detailState: "error", selectedDetail: null });
    }
  },
  openMetricDetail() {
    if (this.data.selectedMetricId) {
      openPage(`/pages/parent/metric/index?metricId=${this.data.selectedMetricId}&studentId=${this.data.activeStudentId}`);
    }
  },
  retry() {
    this.load();
  },
});

function radarForView(growth: GrowthSummary, viewIndex: number) {
  const metricIds = new Set(growth.views[viewIndex]?.metricIds ?? growth.radar.map((point) => point.metricId));
  const filtered = growth.radar.filter((point) => metricIds.has(point.metricId));
  return filtered.length >= 3 ? filtered : growth.radar;
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "成长数据读取失败。";
}
