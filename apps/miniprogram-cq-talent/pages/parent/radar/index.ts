import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatDateTime } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { LoadState, RadarMetricPoint, StudentSummary } from "../../../utils/types";

type RadarPointView = RadarMetricPoint & {
  percent: number;
  peerPercent?: number;
};

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取能力雷达",
    children: [] as StudentSummary[],
    activeStudentId: "",
    activeChildName: "",
    activeChildTeam: "",
    radar: [] as RadarPointView[],
    selectedMetricId: "",
    canDrawRadar: false,
    overallScore: "–",
    updatedAtLabel: "",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取能力雷达" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子。" });
        return;
      }
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) return;
      setCurrentStudentId(active.id);
      const growth = await getParentGrowth(active.id, active);
      const radar = presentRadar(growth.radar);
      const scores = radar.filter((point) => point.value !== undefined);
      this.setData({
        state: radar.length >= 3 ? "ready" : "empty",
        message: radar.length >= 3 ? "" : "有效能力指标不足，完成训练或评测后生成雷达图。",
        children,
        activeStudentId: active.id,
        activeChildName: active.name,
        activeChildTeam: active.teams?.[0] ?? "",
        radar,
        selectedMetricId: radar[0]?.metricId ?? "",
        canDrawRadar: radar.length >= 3,
        overallScore: scores.length
          ? (scores.reduce((total, point) => total + (point.value ?? 0), 0) / scores.length).toFixed(0)
          : "–",
        updatedAtLabel: growth.updatedAt ? formatDateTime(growth.updatedAt) : "随训练和评测持续更新",
      });
    } catch (error) {
      const record = error as { message?: string; code?: string };
      this.setData({ state: "error", message: record?.message || record?.code || "能力雷达读取失败。" });
    }
  },
  switchChild(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id || id === this.data.activeStudentId) return;
    setCurrentStudentId(id);
    this.load();
  },
  selectMetric(event: { detail?: { metricId?: string } }) {
    if (event.detail?.metricId) {
      this.setData({ selectedMetricId: event.detail.metricId });
    }
  },
  openMetric(event: { currentTarget: { dataset: { id?: string } } }) {
    const metricId = event.currentTarget.dataset.id;
    if (metricId) {
      openPage(`/pages/parent/metric/index?metricId=${metricId}&studentId=${this.data.activeStudentId}`);
    }
  },
  openCompare() {
    if (this.data.selectedMetricId) {
      openPage(`/pages/parent/metric/index?metricId=${this.data.selectedMetricId}&studentId=${this.data.activeStudentId}`);
      return;
    }
    wx.showToast({ title: "暂无可对比的指标", icon: "none" });
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});

function presentRadar(points: RadarMetricPoint[]): RadarPointView[] {
  return points.map((point) => ({
    ...point,
    percent: point.value === undefined || !point.maxValue ? 0 : Math.min(100, Math.round((point.value / point.maxValue) * 100)),
    peerPercent: point.peerAverage === undefined || !point.maxValue ? undefined : Math.min(100, Math.round((point.peerAverage / point.maxValue) * 100)),
  }));
}
