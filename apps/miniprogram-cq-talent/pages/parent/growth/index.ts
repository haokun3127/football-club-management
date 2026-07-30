import { getParentChildren, getParentGrowth, getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatDateTime, resolveNavInset } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, MetricDetail, RadarMetricPoint, StudentSummary } from "../../../utils/types";

Page({
  data: {
    navInset: resolveNavInset(),
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
    canDrawRadar: false,
    updatedAtLabel: "",
    latestLabel: "",
    trendLabel: "等待更多记录",
    heroSurname: "",
    heroName: "",
    heroTeam: "",
    heroChips: [] as Array<{ label: string; value: string }>,
    heroStats: [] as Array<{ label: string; value: string }>,
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
        canDrawRadar: radar.length >= 3,
        updatedAtLabel: growth.updatedAt ? formatDateTime(growth.updatedAt) : "随训练和评测持续更新",
        latestLabel: "",
        trendLabel: "等待更多记录",
        heroSurname: active.name.slice(0, 1),
        heroName: active.name,
        heroTeam: active.teams?.[0] ?? "重庆天才",
        heroChips: growth.trainingHistory.slice(0, 2),
        heroStats: buildHeroStats(growth.trainingHistory),
      });
      if (selectedMetric) await this.loadMetricDetail(selectedMetric.metricId);
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  switchChild(event: { detail: { studentId: string } }) {
    const id = event.detail.studentId;
    if (!id || id === this.data.activeStudentId) return;
    setCurrentStudentId(id);
    this.load();
  },
  openSettings() {
    openPage("/pages/parent/binding/index");
  },
  openMilestones() {
    wx.showToast({ title: "成长足迹详情即将上线", icon: "none" });
  },
  openRadar() {
    openPage("/pages/parent/radar/index");
  },
  onViewChange(event: { detail: { value: string | number } }) {
    const viewIndex = Number(event.detail.value);
    if (!this.data.growth) return;
    const radar = radarForView(this.data.growth, viewIndex);
    const selectedMetric = radar[0] ?? null;
    this.setData({ viewIndex, radar, selectedMetricId: selectedMetric?.metricId ?? "", selectedMetric, selectedDetail: null, canDrawRadar: radar.length >= 3, latestLabel: "", trendLabel: "等待更多记录" });
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
      this.applyMetricDetail(cached);
      return;
    }
    this.setData({ detailState: "loading", selectedDetail: null });
    try {
      const detail = await getParentMetricDetail(this.data.activeStudentId, metricId);
      if (this.data.selectedMetricId === metricId) {
        this.applyMetricDetail(detail, metricId);
      } else {
        this.setData({ detailCache: { ...this.data.detailCache, [metricId]: detail } });
      }
    } catch (_error) {
      this.setData({ detailState: "error", selectedDetail: null });
    }
  },
  applyMetricDetail(detail: MetricDetail, metricId?: string) {
    this.setData({
      selectedDetail: detail,
      detailState: "ready",
      latestLabel: detail.latest?.occurredAt ? formatDateTime(detail.latest.occurredAt) : "暂无记录",
      trendLabel: metricTrend(detail),
      detailCache: metricId ? { ...this.data.detailCache, [metricId]: detail } : this.data.detailCache,
    });
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

function buildHeroStats(history: Array<{ label: string; value: string }>) {
  const stats = history.slice(0, 3).map((item) => ({ label: item.label, value: item.value }));
  while (stats.length < 3) {
    stats.push({ label: ["训练课时", "出勤率", "本月训练"][stats.length] ?? "统计", value: "–" });
  }
  return stats;
}

function metricTrend(detail: MetricDetail) {
  const current = detail.records[0]?.value;
  const previous = detail.records[1]?.value;
  if (current === undefined || previous === undefined) return "等待更多记录";
  const delta = Number((current - previous).toFixed(1));
  if (delta > 0) return `较上次提升 ${delta}${detail.unit || ""}`;
  if (delta < 0) return `较上次变化 ${delta}${detail.unit || ""}`;
  return "与上次持平";
}
