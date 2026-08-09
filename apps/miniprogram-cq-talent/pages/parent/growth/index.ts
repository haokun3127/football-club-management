import { getParentChildren, getParentGrowth, getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatDateTime, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, MetricDetail, RadarMetricPoint, StudentSummary } from "../../../utils/types";

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取成长数据",
    children: [] as StudentSummary[],
    activeStudentId: "",
    growth: null as GrowthSummary | null,
    viewIndex: 0,
    radar: [] as RadarMetricPoint[],
    radarPreview: null as RadarPreview | null,
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
        radarPreview: buildRadarPreview(radar),
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
        heroChips: growth.trainingHistory.slice(0, 2).map((chip) => clampChip(chip)),
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
  openTrainingHistory() {
    if (!this.data.activeStudentId) return;
    openPage(`/pages/parent/status/index?student=${this.data.activeStudentId}`);
  },
  openRadar() {
    console.info("[growth] openRadar tapped", { pageStackDepth: getCurrentPages().length });
    openPage("/pages/parent/radar/index");
  },
  onViewChange(event: { detail: { value: string | number } }) {
    const viewIndex = Number(event.detail.value);
    if (!this.data.growth) return;
    const radar = radarForView(this.data.growth, viewIndex);
    const selectedMetric = radar[0] ?? null;
    this.setData({ viewIndex, radar, radarPreview: buildRadarPreview(radar), selectedMetricId: selectedMetric?.metricId ?? "", selectedMetric, selectedDetail: null, canDrawRadar: radar.length >= 3, latestLabel: "", trendLabel: "等待更多记录" });
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

type RadarPreview = {
  count: number;
  spokes: number[];
  gridLayers: Array<{ size: number; kind: "line" | "cover" }>;
  ringPath: string;
  valuePath: string;
  valuePathInner: string;
  peerPath: string | null;
  peerPathInner: string | null;
  labels: Array<{ text: string; x: number; y: number }>;
};

function previewVertex(index: number, total: number, radiusPct: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return `${(50 + Math.cos(angle) * radiusPct).toFixed(1)}% ${(50 + Math.sin(angle) * radiusPct).toFixed(1)}%`;
}

function previewPolygon(points: RadarMetricPoint[], key: "value" | "peerAverage", inset: number) {
  const total = points.length;
  return `polygon(${points
    .map((point, index) => {
      const raw = point[key];
      const ratio = typeof raw === "number" && point.maxValue ? raw / point.maxValue : 0;
      return previewVertex(index, total, Math.max(0.08, Math.min(ratio, 1)) * 50 * inset);
    })
    .join(",")})`;
}

function buildRadarPreview(points: RadarMetricPoint[]): RadarPreview | null {
  if (points.length < 3) return null;
  const total = points.length;
  const ringPath = `polygon(${points.map((_, index) => previewVertex(index, total, 50)).join(",")})`;
  // 描边在 clip-path 下不绘制：所有轮廓线用「外多边形实心 + 内缩多边形盖面」双层叠加模拟
  const gridLayers: RadarPreview["gridLayers"] = [];
  [336, 252, 168, 84].forEach((size) => {
    gridLayers.push({ size, kind: "line" });
    gridLayers.push({ size: size - 4, kind: "cover" });
  });
  // 与详情页一致：全部维度都有同伴均值时才画基准多边形
  const hasPeer = points.every((point) => typeof point.peerAverage === "number");
  // 偶数轴时每条直线贯穿两条对轴，奇数轴时每轴一条半径线
  const spokeCount = total % 2 === 0 ? total / 2 : total;
  const spokes = Array.from({ length: spokeCount }, (_, index) => (180 / spokeCount) * index);
  // 标签布在图表外圈（图表外圈 336rpx 占容器 60%，标签半径取容器 42%）
  const labels = points.map((point, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
    return {
      text: point.label,
      x: 50 + Math.cos(angle) * 42,
      y: 50 + Math.sin(angle) * 42,
    };
  });
  return {
    count: total,
    spokes,
    gridLayers,
    ringPath,
    valuePath: previewPolygon(points, "value", 1),
    valuePathInner: previewPolygon(points, "value", 0.976),
    peerPath: hasPeer ? previewPolygon(points, "peerAverage", 1) : null,
    peerPathInner: hasPeer ? previewPolygon(points, "peerAverage", 0.95) : null,
    labels,
  };
}

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
  const values = history.map((item) => `${item.label} ${item.value}`);
  return [
    { label: "训练课时", value: extractShortMetric(values, /(\d+(?:\.\d+)?)\s*(?:课时|课|节)/) },
    { label: "出勤率", value: extractShortMetric(values, /(\d+(?:\.\d+)?)\s*%/, "%") },
    { label: "本月训练", value: extractShortMetric(values, /本月[^\d]*(\d+(?:\.\d+)?)\s*(?:课|节)?/) },
  ];
}

function extractShortMetric(values: string[], pattern: RegExp, suffix = "") {
  for (const value of values) {
    const match = value.match(pattern);
    if (match?.[1]) return `${match[1]}${suffix}`;
  }
  return "—";
}

function clampStatValue(value: string) {
  const text = (value || "").trim();
  if (!text) return "暂无";
  return text.length > 8 ? `${text.slice(0, 7)}…` : text;
}

function clampChip(chip: { label: string; value: string }) {
  return { label: chip.label, value: clampStatValue(chip.value) };
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
