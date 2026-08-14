import { getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatDateTime, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, RadarMetricPoint, StudentSummary } from "../../../utils/types";

type RadarPointView = RadarMetricPoint & {
  percent: number;
};

// 模块级请求代际计数器：page 单例语义下单调递增即可
let loadGeneration = 0;

const runtimeTimers = globalThis as unknown as {
  setTimeout: (callback: () => void, delay: number) => number;
};

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取能力雷达",
    children: [] as StudentSummary[],
    activeStudentId: "",
    activeChildName: "",
    activeChildTeam: "",
    radar: [] as RadarPointView[],
    selectedMetricId: "",
    canDrawRadar: false,
    radarDimensionLabel: "",
    updatedAtLabel: "",
    compositeScore: "" as number | "",
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    // 请求代际守卫：switchChild/重试触发的后发 load 会让旧响应失效，避免旧数据覆盖新选择
    loadGeneration += 1;
    const gen = loadGeneration;
    this.setData({ state: "loading", message: "正在读取能力雷达" });
    try {
      const preferredId = session.currentStudentId;
      const childrenPromise = getParentChildren();
      // 有偏好学生时并行预发 growth；汇合后仍按 children 列表校验，miss 则以 children[0] 重发
      const preferredGrowthPromise = preferredId
        ? getParentGrowth(preferredId).catch(() => undefined)
        : undefined;
      const children = await childrenPromise;
      if (gen !== loadGeneration) return;
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子。" });
        return;
      }
      const active = children.find((child) => child.id === preferredId) ?? children[0];
      if (!active) return;
      setCurrentStudentId(active.id);
      let growth;
      if (preferredGrowthPromise && active.id === preferredId) {
        growth = await preferredGrowthPromise;
        if (gen !== loadGeneration) return;
        if (!growth) {
          growth = await getParentGrowth(active.id, active);
          if (gen !== loadGeneration) return;
        }
      } else {
        growth = await getParentGrowth(active.id, active);
        if (gen !== loadGeneration) return;
      }
      const radar = presentRadar(radarForView(growth));
      this.setData({
        state: radar.length >= 3 ? "ready" : "empty",
        message: radar.length >= 3 ? "" : "有效能力指标不足，完成训练或评测后生成雷达图。",
        children,
        activeStudentId: active.id,
        activeChildName: active.name,
        activeChildTeam: active.teams?.[0] ?? "",
        radar,
        selectedMetricId: radar[0]?.metricId ?? "",
        canDrawRadar: false,
        radarDimensionLabel: radar.length >= 3 ? `${radar.length}维能力模型` : "",
        updatedAtLabel: growth.updatedAt ? formatDateTime(growth.updatedAt) : "更新时间待同步",
        compositeScore: compositeScoreOf(radar),
      });
      // 首帧门控：让 webview 内容（导航/hero/维度行）先上屏，下一帧再挂载原生 canvas，避免 canvas 合成层抢跑
      if (radar.length >= 3) {
        runtimeTimers.setTimeout(() => {
          if (gen !== loadGeneration) return;
          this.setData({ canDrawRadar: true });
        }, 32);
      }
    } catch (error) {
      if (gen !== loadGeneration) return;
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
  openMetricHistory() {
    if (this.data.selectedMetricId) {
      openPage(`/pages/parent/metric/index?metricId=${this.data.selectedMetricId}&studentId=${this.data.activeStudentId}`);
      return;
    }
    wx.showToast({ title: "暂无可查看的指标记录", icon: "none" });
  },
  goBack() {
    wx.navigateBack();
  },
  retry() {
    this.load();
  },
});

function radarForView(growth: GrowthSummary) {
  const metricIds = new Set(growth.views[0]?.metricIds ?? growth.radar.map((point) => point.metricId));
  const filtered = growth.radar.filter((point) => metricIds.has(point.metricId));
  return filtered.length >= 3 ? filtered : growth.radar;
}

function presentRadar(points: RadarMetricPoint[]): RadarPointView[] {
  return points.filter((point) => typeof point.value === "number" && Number.isFinite(point.value)).map((point) => ({
    ...point,
    percent: !point.maxValue ? 0 : Math.min(100, Math.round(((point.value ?? 0) / point.maxValue) * 100)),
  }));
}

// 综合评分：各维度得分率（value/maxValue）的均值折算百分制
function compositeScoreOf(radar: RadarPointView[]): number | "" {
  const percents = radar.map((point) => point.percent).filter((percent) => Number.isFinite(percent));
  if (!percents.length) return "";
  return Math.round(percents.reduce((sum, percent) => sum + percent, 0) / percents.length);
}
