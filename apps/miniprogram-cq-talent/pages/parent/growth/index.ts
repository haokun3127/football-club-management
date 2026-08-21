import { getParentCalendar, getParentChildren, getParentGrowth, getParentMetricDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate, shiftCalendarDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { formatDateTime, formatTenure, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, MetricDetail, RadarMetricPoint, ScheduleEvent, StudentSummary } from "../../../utils/types";

let growthRequestId = 0;

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
    heroSummaryMessage: "",
    heroTags: [] as string[],
    heroStats: [] as Array<{ value: string; label: string; accent: boolean }>,
    milestoneMessage: "",
    trainingHistoryMessage: "",
    milestones: [] as GrowthMilestone[],
    trainingBars: [] as TrainingBar[],
  },
  onLoad() {
    this.load();
  },
  onShow() {
    const session = requireRole("parent");
    if (!session || !this.data.activeStudentId || session.currentStudentId === this.data.activeStudentId) return;
    return this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const requestId = ++growthRequestId;
    this.setData({ state: "loading", message: "正在读取成长数据" });
    try {
      const children = await getParentChildren();
      if (requestId !== growthRequestId) return;
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，无法查看成长数据。" });
        return;
      }
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) return;
      setCurrentStudentId(active.id);
      const today = currentLocalDate();
      const [growth, recentActivities] = await Promise.all([
        getParentGrowth(active.id, active),
        getParentCalendar(shiftCalendarDate(today, -29), today),
      ]);
      if (requestId !== growthRequestId) return;
      const radar = radarForView(growth, 0);
      const selectedMetric = radar[0] ?? null;
      const activityMessages = growthActivityMessages(recentActivities, active.id);
      const activityView = buildActivityView(recentActivities, active.id, radar.length > 0);
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
        updatedAtLabel: growth.updatedAt ? formatDateTime(growth.updatedAt) : "更新时间待同步",
        latestLabel: "",
        trendLabel: "等待更多记录",
        heroSurname: active.name.slice(0, 1),
        heroName: active.name,
        heroTeam: active.teams.find(Boolean) || "球队待同步",
        heroSummaryMessage: activityMessages.heroSummary,
        heroTags: buildHeroTags(active, growth),
        heroStats: buildHeroStats(growth),
        milestoneMessage: activityMessages.milestone,
        trainingHistoryMessage: activityMessages.trainingHistory,
        milestones: activityView.milestones,
        trainingBars: buildMonthlyBars(growth) ?? activityView.trainingBars,
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
  openTrainingHistory() {
    openPage("/pages/parent/training-history/index");
  },
  openMilestones() {
    openPage("/pages/parent/milestones/index");
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
    const studentId = this.data.activeStudentId;
    const cached = this.data.detailCache[metricId];
    if (cached) {
      this.applyMetricDetail(cached);
      return;
    }
    this.setData({ detailState: "loading", selectedDetail: null });
    try {
      const detail = await getParentMetricDetail(studentId, metricId);
      if (this.data.activeStudentId === studentId && this.data.selectedMetricId === metricId) {
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

function growthActivityMessages(events: ScheduleEvent[], studentId: string) {
  const completed = events
    .filter((event) => event.status === "completed" && eventBelongsToStudent(event, studentId))
    .sort((left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime());
  const trainingCount = completed.filter((event) => event.type === "training").length;
  const matchCount = completed.filter((event) => event.type === "match").length;
  const latest = completed[0];

  return {
    heroSummary: completed.length ? `近30天完成 ${trainingCount} 次训练、${matchCount} 场比赛` : "近30天暂无已完成活动",
    milestone: latest ? `最新足迹：${latest.title}` : "成长足迹正在积累",
    trainingHistory: trainingCount ? `近30天已完成 ${trainingCount} 次训练，点击查看完整历程` : "近30天暂无完成训练",
  };
}

type GrowthMilestone = { id: string; title: string; state: string; tone: "green" | "red" | "blue"; icon: string };
type TrainingBar = { id: string; height: number; label: string };

function buildActivityView(events: ScheduleEvent[], studentId: string, hasMetrics: boolean) {
  const completed = events
    .filter((event) => event.status === "completed" && eventBelongsToStudent(event, studentId))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const trainings = completed.filter((event) => event.type === "training");
  const matches = completed.filter((event) => event.type === "match");
  const bars = Array.from({ length: 8 }, (_, index) => {
    const event = trainings[index];
    const date = event ? new Date(event.startsAt) : null;
    return {
      id: `training-bar-${index + 1}`,
      height: event ? 32 + ((index % 3) * 16) : 8,
      label: date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : "—",
    };
  });
  return {
    milestones: [
      { id: "training", title: trainings.length ? `完成 ${trainings.length} 次训练` : "完成首次训练", state: trainings.length ? "已达成" : "待达成", tone: trainings.length ? "green" : "red", icon: trainings.length ? "✓" : "○" },
      { id: "match", title: matches.length ? `完成 ${matches.length} 场比赛` : "首次参加比赛", state: matches.length ? "已达成" : "待达成", tone: matches.length ? "green" : "red", icon: matches.length ? "✓" : "○" },
      { id: "assessment", title: "能力模型更新", state: hasMetrics ? "已更新" : "待达成", tone: hasMetrics ? "blue" : "red", icon: hasMetrics ? "•" : "○" },
    ] as GrowthMilestone[],
    trainingBars: bars,
  };
}

function eventBelongsToStudent(event: ScheduleEvent, studentId: string) {
  if (event.childIds?.length) return event.childIds.includes(studentId);
  return event.children?.some((child) => child.id === studentId) ?? false;
}

// 在队时长标签：从队伍 startsAt 到今天的年月差
const tenureLabel = formatTenure;

function buildHeroTags(student: StudentSummary, growth: GrowthSummary) {
  const tags: string[] = [];
  const tenure = tenureLabel(student.teamStartsAt);
  if (tenure) tags.push(tenure);
  const total = growth.trainingStats?.totalTrainings ?? 0;
  if (total > 0) tags.push(`训练${total}课`);
  return tags;
}

function buildHeroStats(growth: GrowthSummary) {
  const stats = growth.trainingStats;
  if (!stats) return [];
  return [
    { value: `${stats.totalTrainings}`, label: "训练课时", accent: false },
    { value: stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`, label: "出勤率", accent: stats.attendanceRate !== null },
    { value: `${stats.monthTrainings}`, label: "本月训练", accent: false },
  ];
}

// 训练历程：服务端月度分布（近8个月），高度按当月最大值归一
function buildMonthlyBars(growth: GrowthSummary): TrainingBar[] | null {
  const monthly = growth.trainingStats?.monthly;
  if (!monthly?.length) return null;
  const max = Math.max(...monthly.map((item) => item.count), 0);
  return monthly.map((item, index) => ({
    id: `training-month-${index + 1}`,
    height: item.count > 0 ? 32 + Math.round((item.count / max) * 48) : 8,
    label: `${item.month}月`,
  }));
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

function metricTrend(detail: MetricDetail) {
  const current = detail.records[0]?.value;
  const previous = detail.records[1]?.value;
  if (current === undefined || previous === undefined) return "等待更多记录";
  const delta = Number((current - previous).toFixed(1));
  if (delta > 0) return `较上次提升 ${delta}${detail.unit || ""}`;
  if (delta < 0) return `较上次变化 ${delta}${detail.unit || ""}`;
  return "与上次持平";
}
