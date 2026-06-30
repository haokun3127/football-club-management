import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, StudentSummary } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取成长数据",
    children: [] as StudentSummary[],
    activeStudentId: "",
    growth: null as GrowthSummary | null,
    radar: [],
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
      if (!active) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，无法查看成长数据。" });
        return;
      }
      setCurrentStudentId(active.id);
      const growth = await getParentGrowth(active.id, active);
      this.setData({
        state: growth.radar.length >= 3 ? "ready" : "empty",
        message: growth.radar.length >= 3 ? "" : "有效能力指标不足，完成训练或评测后生成雷达图。",
        children,
        activeStudentId: active.id,
        growth,
        radar: growth.radar,
      });
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
  openMetric(event: { detail?: { metricId?: string } }) {
    const metricId = event.detail?.metricId || this.data.growth?.metricItems[0]?.metricId;
    if (metricId) openPage(`/pages/parent/metric/index?metricId=${metricId}&studentId=${this.data.activeStudentId}`);
  },
  retry() {
    this.load();
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "成长数据读取失败。";
}
