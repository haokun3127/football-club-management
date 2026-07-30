import { getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityTypeLabel, formatDateTime, resolveNavInset } from "../../../utils/presentation";
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

Page({
  data: {
    navInset: resolveNavInset(),
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
    trendDelta: "",
    chartPoints: [] as ChartPoint[],
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
      const detail = await getParentMetricDetail(this.data.studentId, this.data.metricId);
      const records = presentRecords(detail);
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
        heroValue: detail.latest?.value === undefined ? "–" : String(detail.latest.value),
        trendDelta: records[0]?.changeTone === "success" ? `+${records[0].changeLabel.replace(/[^0-9.]/g, "")}` : "",
        chartPoints: buildChartPoints(detail),
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
  switchRange() {
    wx.showToast({ title: "更多赛季数据即将上线", icon: "none" });
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

function buildChartPoints(detail: MetricDetail): ChartPoint[] {
  const valued = [...detail.records]
    .filter((record) => record.value !== undefined)
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .slice(-6);
  if (valued.length < 2) return [];
  const values = valued.map((record) => record.value ?? 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return valued.map((record, index) => ({
    id: record.id,
    left: valued.length === 1 ? 50 : (index / (valued.length - 1)) * 100,
    bottom: 10 + (((record.value ?? 0) - min) / span) * 80,
    valueLabel: `${record.value}${detail.unit || ""}`,
    monthLabel: `${Number(record.occurredAt.slice(5, 7))}月`,
    current: index === valued.length - 1,
  }));
}
