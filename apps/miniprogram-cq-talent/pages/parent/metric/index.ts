import { getParentGrowth, getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityTypeLabel, formatDateTime, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, MetricDetail } from "../../../utils/types";

interface MetricRecordView {
  id: string;
  valueLabel: string;
  dateLabel: string;
  source: string;
  note: string;
  changeLabel: string;
  changeTone: string;
}

interface SourceEventView {
  recordId: string;
  eventId: string;
  title: string;
  typeLabel: string;
  typeSymbol: string;
  startsAtLabel: string;
}

interface ChartPoint {
  id: string;
  left: number;
  bottom: number;
  valueLabel: string;
  monthLabel: string;
  current: boolean;
}

interface ChartSegment {
  id: string;
  left: number;
  top: number;
  width: number;
  angle: number;
}

// 绘图区名义尺寸（rpx）：与 wxss .chart-card__plot 实际可用宽度一致，用于折线段角度/长度换算
const PLOT_WIDTH_RPX = 558;
const PLOT_HEIGHT_RPX = 320;

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取指标详情",
    metricId: "",
    studentId: "",
    detail: null as MetricDetail | null,
    records: [] as MetricRecordView[],
    sourceEvents: [] as SourceEventView[],
    latestLabel: "暂无数据",
    latestDateLabel: "暂无记录",
    trendSummary: "等待更多记录",
    trendTone: "neutral",
    heroValue: "–",
    heroMaxLabel: "",
    trendDelta: "",
    chartPoints: [] as ChartPoint[],
    chartSegments: [] as ChartSegment[],
    chartAreaPath: "",
    yTicks: [] as string[],
    peerBadgeLabel: "",
    peerBadgeTone: "info",
    peerMinePercent: 0,
    peerAveragePercent: 0,
    peerAverageLabel: "",
    coachCommentText: "",
    coachCommentDate: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("parent");
    const metricId = query?.metricId || "";
    const studentId = query?.studentId || "";
    this.setData({ metricId, studentId });
    this.load();
  },
  async load() {
    if (!this.data.metricId || !this.data.studentId) {
      this.setData({ state: "error", message: "缺少指标或孩子信息。" });
      return;
    }
    this.setData({ state: "loading", message: "正在读取指标详情" });
    try {
      const detailPromise = getParentMetricDetail(this.data.studentId, this.data.metricId);
      // 同龄均值来自成长汇总（雷达点带 peerAverage），取不到时降级隐藏对比模块
      const growthPromise = getParentGrowth(this.data.studentId).catch(() => undefined);
      const detail = await detailPromise;
      const growth = await growthPromise;
      const records = presentRecords(detail);
      const peerPoint = growth?.radar.find((point) => point.metricId === detail.metricId);
      const latestValue = detail.latest?.value;
      const maxValue = detail.maxValue || 10;
      const peerAverage = typeof peerPoint?.peerAverage === "number" ? peerPoint.peerAverage : undefined;
      const coachRecord = records.find((record) => record.note);
      this.setData({
        state: "ready",
        message: "",
        detail,
        records,
        sourceEvents: detail.sourceEvents.map((item) => ({
          ...item,
          typeLabel: activityTypeLabel(item.type),
          typeSymbol: activityTypeLabel(item.type).slice(0, 1),
          startsAtLabel: item.startsAt ? formatDateTime(item.startsAt) : "时间待确认",
        })),
        latestLabel: records[0]?.valueLabel || "暂无数据",
        latestDateLabel: records[0]?.dateLabel || "暂无记录",
        trendSummary: records[0]?.changeLabel || "等待更多记录",
        trendTone: records[0]?.changeTone || "neutral",
        heroValue: latestValue === undefined ? "–" : String(latestValue),
        heroMaxLabel: latestValue === undefined ? "" : `/ ${maxValue}`,
        trendDelta: records[0]?.changeTone === "success" ? `+${records[0].changeLabel.replace(/[^0-9.]/g, "")}` : "",
        ...buildChart(detail, maxValue),
        ...buildPeerView(latestValue, peerAverage, maxValue, detail.unit),
        coachCommentText: coachRecord?.note ?? "",
        coachCommentDate: coachRecord?.dateLabel ?? "",
      });
    } catch (error) {
      const record = error as { code?: string; message?: string };
      this.setData({ state: "error", message: record.code === "forbidden" ? "当前账号无权查看该指标。" : record.message || "指标详情读取失败。" });
    }
  },
  openSourceEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id) openPage(`/pages/parent/event/index?id=${id}`);
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});

function presentRecords(detail: MetricDetail): MetricRecordView[] {
  const ordered = [...detail.records].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return ordered.map((item, index) => {
    const next = ordered[index + 1];
    const delta = item.value !== undefined && next?.value !== undefined ? Number((item.value - next.value).toFixed(1)) : undefined;
    return {
      id: item.id,
      valueLabel: item.value === undefined ? "未量化" : `${item.value}${detail.unit || ""}`,
      dateLabel: formatDateTime(item.occurredAt),
      source: item.source,
      note: item.note || "",
      changeLabel: delta === undefined ? "首次记录" : delta > 0 ? `提升 ${delta}${detail.unit || ""}` : delta < 0 ? `变化 ${delta}${detail.unit || ""}` : "保持稳定",
      changeTone: delta === undefined ? "neutral" : delta > 0 ? "success" : delta < 0 ? "warning" : "info",
    };
  });
}

// 绝对量纲定位（0..maxValue），Y 轴刻度与设计稿一致；月份标签相邻去重
function buildChart(detail: MetricDetail, maxValue: number) {
  const empty = { chartPoints: [] as ChartPoint[], chartSegments: [] as ChartSegment[], chartAreaPath: "", yTicks: [] as string[] };
  const valued = [...detail.records]
    .filter((record) => record.value !== undefined)
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .slice(-6);
  if (valued.length < 2) return empty;
  const points: ChartPoint[] = valued.map((record, index) => {
    const month = Number(record.occurredAt.slice(5, 7));
    const prevMonth = index > 0 ? Number(valued[index - 1]?.occurredAt.slice(5, 7)) : undefined;
    return {
      id: record.id,
      left: (index / (valued.length - 1)) * 100,
      bottom: 8 + ((record.value ?? 0) / maxValue) * 84,
      valueLabel: `${record.value}${detail.unit || ""}`,
      monthLabel: month === prevMonth ? "" : `${month}月`,
      current: index === valued.length - 1,
    };
  });
  const segments: ChartSegment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) continue;
    const dxRpx = ((to.left - from.left) / 100) * PLOT_WIDTH_RPX;
    const dyRpx = ((to.bottom - from.bottom) / 100) * PLOT_HEIGHT_RPX;
    segments.push({
      id: `${from.id}-${to.id}`,
      left: from.left,
      top: 100 - from.bottom,
      width: Math.min(140, (Math.hypot(dxRpx, dyRpx) / PLOT_WIDTH_RPX) * 100),
      angle: Number((-Math.atan2(dyRpx, dxRpx) * 180 / Math.PI).toFixed(2)),
    });
  }
  // 渐变面积：clip-path 多边形（折线顶点 + 底边两角）
  const polygonPoints = points.map((point) => `${point.left}% ${100 - point.bottom}%`).join(", ");
  const chartAreaPath = `polygon(0% 100%, ${polygonPoints}, 100% 100%)`;
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => trimTick(maxValue * ratio));
  return { chartPoints: points, chartSegments: segments, chartAreaPath, yTicks };
}

function trimTick(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildPeerView(latestValue: number | undefined, peerAverage: number | undefined, maxValue: number, unit?: string) {
  const empty = { peerBadgeLabel: "", peerBadgeTone: "info", peerMinePercent: 0, peerAveragePercent: 0, peerAverageLabel: "" };
  if (latestValue === undefined || peerAverage === undefined) return empty;
  const delta = Number((latestValue - peerAverage).toFixed(1));
  return {
    peerBadgeLabel: delta > 0 ? `高于同龄均值 ${delta}` : delta < 0 ? `低于同龄均值 ${Math.abs(delta)}` : "与同龄均值持平",
    peerBadgeTone: delta > 0 ? "success" : delta < 0 ? "warning" : "info",
    peerMinePercent: Math.min(100, Math.round((latestValue / maxValue) * 100)),
    peerAveragePercent: Math.min(100, Math.round((peerAverage / maxValue) * 100)),
    peerAverageLabel: `${peerAverage}${unit || ""}`,
  };
}
