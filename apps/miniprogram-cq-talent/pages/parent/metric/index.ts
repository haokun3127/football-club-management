import { getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityTypeLabel, formatDateTime } from "../../../utils/presentation";
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

Page({
  data: {
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
