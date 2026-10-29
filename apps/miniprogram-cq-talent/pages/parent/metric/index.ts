import { getParentMetricDetail } from "../../../utils/api";
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

Page({
  requestGeneration: 0,
  loadedKey: "",
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
    heroValue: "–",
    heroMaxLabel: "",
    refreshing: false,
    refreshMessage: "",
    comparabilityMessage: "这些历史记录缺少项目及映射版本信息，暂不合并绘图或判断进步。可在已确认成绩中查看同项目版本与单位的历史。",
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
  onUnload() { this.requestGeneration++; },
  async load() {
    if (!this.data.metricId || !this.data.studentId) {
      this.setData({ state: "error", message: "缺少指标或孩子信息。" });
      return;
    }
    const generation = ++this.requestGeneration;
    const studentId = this.data.studentId, metricId = this.data.metricId;
    const key = JSON.stringify([studentId, metricId]);
    const retaining = this.loadedKey === key && this.data.detail !== null;
    this.loadedKey = key;
    if (retaining) this.setData({refreshing:true,refreshMessage:""});
    else this.setData({state:"loading",message:"正在读取指标详情",detail:null,records:[],sourceEvents:[],refreshing:false,refreshMessage:""});
    try {
      const detail = await getParentMetricDetail(studentId, metricId);
      if (generation !== this.requestGeneration) return;
      const records = presentRecords(detail);
      const latestValue = detail.latest?.value;
      const coachRecord = records.find((record) => record.note);
      this.setData({
        state: "ready",
        message: "",
        refreshing: false,
        refreshMessage: "",
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
        heroValue: latestValue === undefined ? "–" : String(latestValue),
        heroMaxLabel: detail.unit || "单位未提供",
        coachCommentText: coachRecord?.note ?? "",
        coachCommentDate: coachRecord?.dateLabel ?? "",
      });
    } catch (error) {
      if (generation !== this.requestGeneration) return;
      const record = error as { code?: string; message?: string };
      const message = record.code === "forbidden" ? "当前账号无权查看该指标。" : record.message || "指标详情读取失败。";
      if (retaining) this.setData({refreshing:false,refreshMessage:`刷新失败，当前显示上次读取的记录。${message}`});
      else this.setData({state:"error",message});
    }
  },
  openSourceEvent(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id && this.data.sourceEvents.some((item: SourceEventView) => item.eventId === id)) openPage(`/pages/parent/event/index?id=${encodeURIComponent(id)}&studentId=${encodeURIComponent(this.data.studentId)}`);
  },
  openConfirmedResults() { openPage(`/pages/parent/confirmed-results/index?student=${encodeURIComponent(this.data.studentId)}`); },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});

function presentRecords(detail: MetricDetail): MetricRecordView[] {
  const ordered = [...detail.records].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return ordered.map((item) => {
    return {
      id: item.id,
      valueLabel: item.value === undefined ? "未量化" : `${item.value}${detail.unit || ""}`,
      dateLabel: formatDateTime(item.occurredAt),
      source: item.source,
      note: item.note || "",
      changeLabel: "历史记录",
      changeTone: "neutral",
    };
  });
}
