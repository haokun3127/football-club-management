import { getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { LoadState, MetricDetail } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取指标详情",
    metricId: "",
    studentId: "",
    detail: null as MetricDetail | null,
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
      this.setData({ state: "ready", message: "", detail });
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
