import {
  getParentChildren,
  getParentConfirmedResults,
  getParentGrowth,
  getParentMetricDetail,
} from "../../../utils/api";
import { calendarDateKey } from "../../../utils/date";
import { parentResultValue } from "../result-presentation";
import { requireRole } from "../../../utils/auth";
import { consumeGrowthStale } from "../../../utils/growth-invalidation";
import { openPage } from "../../../utils/navigation";
import {
  formatDateTime,
  resolveMenuInset,
  resolveNavInset,
} from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type {
  GrowthSummary,
  GrowthTimelineItem,
  LoadState,
  MetricDetail,
  RadarMetricPoint,
  StudentSummary,
} from "../../../utils/types";


Page({
  growthRequestId: 0,
  resultsRequest: 0,
  summaryRequest: 0,
  metricRequest: 0,
  loadedScope: "",
  requestedStudentId: "",
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取成长数据",
    children: [] as StudentSummary[],
    activeStudentId: "",
    growth: null as GrowthSummary | null,
    growthState: "loading" as LoadState,
    refreshing: false,
    refreshMessage: "",
    resultsState: "loading" as LoadState,
    resultsLoaded: false,
    resultsMessage: "",
    confirmedRows: [] as Array<{id:string;name:string;value:string;date:string;source:string;eventId:string}>,
    viewIndex: 0,
    radar: [] as RadarMetricPoint[],
    selectedMetricId: "",
    selectedMetric: null as RadarMetricPoint | null,
    selectedDetail: null as MetricDetail | null,
    detailState: "idle" as LoadState,
    detailCache: {} as Record<string, MetricDetail>,
    radarRows: [] as Array<{
      id: string;
      label: string;
      value: string;
      date: string;
    }>,
    canDrawRadar: false,
    updatedAtLabel: "",
    latestLabel: "",
    trendLabel: "等待更多记录",
    heroSurname: "",
    heroName: "",
    heroTeam: "",
    heroSummaryMessage: "",
    heroStats: [] as Array<{ value: string; label: string }>,
    evaluationCards: [] as Array<{
      teamId: string;
      teamName: string;
      text: string;
      author: string;
    }>,
    evaluationMessage: "队伍评价待读取，可进入详情查看",
    milestoneMessage: "",
    trainingHistoryMessage: "",
    matchHistoryMessage: "",
    milestones: [] as GrowthMilestone[],
    trainingBars: [] as TrainingBar[],
  },
  openMetricRow(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (id && this.data.radarRows.some((row: { id: string }) => row.id === id))
      openPage(
        `/pages/parent/metric/index?metricId=${encodeURIComponent(id)}&studentId=${encodeURIComponent(this.data.activeStudentId)}`,
      );
  },
  openConfirmedResults() {
    if (this.data.activeStudentId)
      openPage(
        `/pages/parent/confirmed-results/index?student=${encodeURIComponent(this.data.activeStudentId)}`,
      );
  },
  openEvaluation(event?: { currentTarget?: { dataset?: { team?: string } } }) {
    if (this.data.activeStudentId)
      openPage(
        `/pages/shared/student-evaluation/index?student=${encodeURIComponent(this.data.activeStudentId)}&team=${encodeURIComponent(event?.currentTarget?.dataset?.team || "")}`,
      );
  },
  onLoad() {
    this.load();
  },
  onUnload() {
    this.growthRequestId += 1;
  },
  onShow() {
    const session = requireRole("parent");
    if (!session) return;
    const scope = JSON.stringify([session.clubId, session.clientId, session.userId || session.token, session.role]);
    if (this.data.state === "loading" && this.loadedScope === scope && this.requestedStudentId === (session.currentStudentId || "")) return;
    consumeGrowthStale();
    return this.load();
  },
  resetContent() {
    this.setData({state:"loading",message:"正在读取成长数据",activeStudentId:"",children:[],growth:null,
      growthState:"loading",refreshing:false,refreshMessage:"",resultsState:"loading",resultsLoaded:false,resultsMessage:"",confirmedRows:[],
      radar:[],radarRows:[],evaluationCards:[],evaluationMessage:"队伍评价待读取，可进入详情查看",detailCache:{},selectedDetail:null,selectedMetric:null,selectedMetricId:"",detailState:"idle",
      milestones:[],trainingBars:[],heroName:"",heroTeam:"",heroStats:[],canDrawRadar:false});
  },
  async load() {
    const session = requireRole("parent"); if (!session) return;
    let requestId = ++this.growthRequestId;
    const scope = JSON.stringify([session.clubId, session.clientId, session.userId || session.token, session.role]);
    const retaining = this.data.state === "ready" && this.loadedScope === scope && this.data.activeStudentId === session.currentStudentId;
    if (retaining) this.setData({refreshing:true,refreshMessage:"",detailCache:{},selectedDetail:null});
    else this.resetContent();
    this.loadedScope = scope; this.requestedStudentId = session.currentStudentId || "";
    try {
      const children = await getParentChildren(); if (requestId !== this.growthRequestId) return;
      const active = children.find(child => child.id === session.currentStudentId) ?? children[0];
      if (!active) { this.growthRequestId++; this.resetContent(); this.setData({state:"empty",message:"当前账号没有绑定孩子，无法查看成长数据。"}); return; }
      if (retaining && active.id !== this.data.activeStudentId) { requestId = ++this.growthRequestId; this.resetContent(); }
      setCurrentStudentId(active.id); this.requestedStudentId = active.id;
      this.setData({state:"ready",message:"",refreshing:false,children,activeStudentId:active.id,heroName:active.name,heroSurname:active.name.slice(0,1),heroTeam:active.teams.find(Boolean) || "球队待同步"});
      await Promise.all([this.loadGrowth(requestId,active),this.loadConfirmed(requestId,active.id)]);
    } catch (error) {
      if (requestId !== this.growthRequestId) return;
      if (retaining) this.setData({refreshing:false,refreshMessage:`刷新失败，当前显示上次读取的内容。${readableError(error)}`});
      else this.setData({state:"error",message:readableError(error)});
    }
  },
  async loadGrowth(requestId: number, active: StudentSummary) {
    const summaryRequest = ++this.summaryRequest;
    this.setData({growthState:"loading",refreshMessage:""});
    try {
      const growth = await getParentGrowth(active.id, active);
      if (requestId !== this.growthRequestId || summaryRequest !== this.summaryRequest) return;
      const radar = radarForView(growth, 0);
      const selectedMetric = radar[0] ?? null;
      const activityMessages = growthActivityMessages(growth.timeline ?? []);
      const activityView = buildActivityView(growth.timeline ?? []);
      this.setData({
        state: "ready",
        growthState: "ready",
        message: "",
        activeStudentId: active.id,
        growth,
        viewIndex: 0,
        radar,
        radarRows: radar.map((point) => ({
          id: point.metricId,
          label: point.label,
          value:
            point.value === undefined
              ? "数值未记录"
              : `${point.value} / ${point.maxValue}`,
          date: point.occurredAt
            ? formatDateTime(point.occurredAt)
            : "记录日期待同步",
        })),
        selectedMetricId: selectedMetric?.metricId ?? "",
        selectedMetric,
        selectedDetail: null,
        detailCache: {},
        canDrawRadar: radar.length >= 3 && radar.length <= 8,
        updatedAtLabel: growth.updatedAt
          ? formatDateTime(growth.updatedAt)
          : "更新时间待同步",
        latestLabel: "",
        trendLabel: "等待更多记录",
        heroSurname: active.name.slice(0, 1),
        heroName: active.name,
        heroTeam: active.teams.find(Boolean) || "球队待同步",
        heroSummaryMessage: activityMessages.heroSummary,
        heroStats: buildHeroStats(growth),
        evaluationMessage:
          growth.evaluations === undefined
            ? "评价暂不可用，请进入详情重新读取"
            : growth.evaluations.length
              ? ""
              : "教练尚未维护评价",
        evaluationCards: (growth.evaluations || []).flatMap((record) => {
          const entry = record.history[record.history.length - 1];
          return entry
            ? [
                {
                  teamId: record.teamId,
                  teamName: record.teamName,
                  text:
                    [...entry.phrases.map((p) => p.text), entry.note]
                      .filter(Boolean)
                      .join(" · ") || "当前评价已清空，历史仍保留",
                  author: `${entry.actorDisplayName} · ${formatDateTime(entry.changedAt)}`,
                },
              ]
            : [];
        }),
        milestoneMessage: activityMessages.milestone,
        trainingHistoryMessage: activityMessages.trainingHistory,
        matchHistoryMessage: activityMessages.matchHistory,
        milestones: activityView.milestones,
        trainingBars: buildMonthlyBars(growth) ?? [],
      });

    } catch (error) {
      if (requestId === this.growthRequestId && summaryRequest === this.summaryRequest) this.setData({growthState:"error",refreshMessage:`${this.data.growth ? "成长汇总刷新失败，当前显示上次读取的内容。" : "成长汇总读取失败。"}${readableError(error)}`});
    }
  },
  async loadConfirmed(requestId: number, studentId: string) {
    const resultsRequest = ++this.resultsRequest;
    this.setData({resultsState:"loading",resultsMessage:""});
    try {
      const response = await getParentConfirmedResults(studentId);
      if (requestId !== this.growthRequestId || resultsRequest !== this.resultsRequest || studentId !== this.data.activeStudentId) return;
      const rows = response.confirmedResults.slice(0,3).map(row => ({id:row.id,name:row.name,
        value: parentResultValue(row),
        date: calendarDateKey(row.occurredAt) || "日期待确认", source: row.eventId ? "来源活动" : row.taskId ? "测评任务" : "已确认测评记录",
        eventId: row.eventId || ""}));
      this.setData({resultsState:"ready",resultsLoaded:true,confirmedRows:rows});
    } catch(error) {
      if (requestId !== this.growthRequestId || resultsRequest !== this.resultsRequest || studentId !== this.data.activeStudentId) return;
      this.setData({resultsState:"error",resultsMessage:`${this.data.resultsLoaded ? "成绩刷新失败，当前显示上次读取的结果。" : ""}${readableError(error)}`});
    }
  },
  retryResults() { if(this.data.activeStudentId) return this.loadConfirmed(this.growthRequestId,this.data.activeStudentId); },
  openResultSource(event:{currentTarget:{dataset:{id?:string}}}) {
    const row = this.data.confirmedRows.find((item: {id:string;eventId:string}) => item.id === event.currentTarget.dataset.id);
    if(row?.eventId) openPage(`/pages/parent/event/index?id=${encodeURIComponent(row.eventId)}&studentId=${encodeURIComponent(this.data.activeStudentId)}`);
  },
  switchChild(event: { detail: { studentId: string } }) {
    const id = event.detail.studentId;
    if (
      !id ||
      id === this.data.activeStudentId ||
      !this.data.children.some((child: StudentSummary) => child.id === id)
    )
      return;
    setCurrentStudentId(id);
    this.load();
  },
  openSettings() {
    openPage("/pages/parent/binding/index");
  },
  openTrainingHistory() {
    openPage("/pages/parent/training-history/index");
  },
  openMatchHistory() {
    openPage("/pages/parent/match-history/index");
  },
  openMilestones() {
    openPage("/pages/parent/milestones/index");
  },
  openRadar() {
    openPage("/pages/parent/radar/index");
  },
  onViewChange(event: { detail: { value: string | number } }) {
    const viewIndex = Number(event.detail.value);
    if (!this.data.growth) return;
    const radar = radarForView(this.data.growth, viewIndex);
    const selectedMetric = radar[0] ?? null;
    this.setData({
      viewIndex,
      radar,
      selectedMetricId: selectedMetric?.metricId ?? "",
      selectedMetric,
      selectedDetail: null,
      canDrawRadar: radar.length >= 3 && radar.length <= 8,
      latestLabel: "",
      trendLabel: "等待更多记录",
    });
    if (selectedMetric) this.loadMetricDetail(selectedMetric.metricId);
  },
  selectMetric(event: {
    detail?: { metricId?: string };
    currentTarget?: { dataset?: { id?: string } };
  }) {
    const metricId = event.detail?.metricId || event.currentTarget?.dataset?.id;
    if (!metricId) return;
    const selectedMetric =
      this.data.radar.find(
        (metric: RadarMetricPoint) => metric.metricId === metricId,
      ) ?? null;
    this.setData({ selectedMetricId: metricId, selectedMetric });
    this.loadMetricDetail(metricId);
  },
  async loadMetricDetail(metricId: string) {
    const metricRequest = ++this.metricRequest;
    const studentId = this.data.activeStudentId;
    const requestId = this.growthRequestId;
    const cached = this.data.detailCache[metricId];
    if (cached) {
      this.applyMetricDetail(cached);
      return;
    }
    this.setData({ detailState: "loading", selectedDetail: null });
    try {
      const detail = await getParentMetricDetail(studentId, metricId);
      if (
        requestId !== this.growthRequestId || metricRequest !== this.metricRequest ||
        this.data.activeStudentId !== studentId
      )
        return;
      if (this.data.selectedMetricId === metricId) {
        this.applyMetricDetail(detail, metricId);
      } else {
        this.setData({
          detailCache: { ...this.data.detailCache, [metricId]: detail },
        });
      }
    } catch (_error) {
      if (
        requestId !== this.growthRequestId || metricRequest !== this.metricRequest ||
        this.data.activeStudentId !== studentId ||
        this.data.selectedMetricId !== metricId
      )
        return;
      this.setData({ detailState: "error", selectedDetail: null });
    }
  },
  applyMetricDetail(detail: MetricDetail, metricId?: string) {
    this.setData({
      selectedDetail: detail,
      detailState: "ready",
      latestLabel: detail.latest?.occurredAt
        ? formatDateTime(detail.latest.occurredAt)
        : "暂无记录",
      trendLabel: metricTrend(detail),
      detailCache: metricId
        ? { ...this.data.detailCache, [metricId]: detail }
        : this.data.detailCache,
    });
  },
  openMetricDetail() {
    if (this.data.selectedMetricId) {
      openPage(
        `/pages/parent/metric/index?metricId=${this.data.selectedMetricId}&studentId=${this.data.activeStudentId}`,
      );
    }
  },
  retry() {
    this.load();
  },
});

function growthActivityMessages(timeline: GrowthTimelineItem[]) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = timeline.filter(
    (item) =>
      (item.kind === "training" || item.kind === "match") &&
      Date.parse(item.occurredAt) >= thirtyDaysAgo && Date.parse(item.occurredAt) <= Date.now(),
  );
  const trainingCount = recent.filter(
    (item) => item.kind === "training",
  ).length;
  const matchCount = recent.filter((item) => item.kind === "match").length;
  const latest = timeline[0];

  return {
    heroSummary: recent.length
      ? `近30天记录 ${trainingCount} 次训练、${matchCount} 场比赛`
      : "近30天暂无活动记录",
    milestone: latest ? `最新足迹：${latest.title}` : "成长足迹正在积累",
    trainingHistory: trainingCount
      ? `近30天记录 ${trainingCount} 次训练，点击查看完整历程`
      : "近30天暂无训练记录",
    matchHistory: matchCount
      ? `近30天已完成 ${matchCount} 场比赛，点击查看比赛记录`
      : "近30天暂无完成比赛",
  };
}

type GrowthMilestone = {
  id: string;
  title: string;
  state: string;
  tone: "green" | "red" | "blue";
  icon: string;
};
type TrainingBar = { id: string; height: number; label: string; count: number };

function buildActivityView(timeline: GrowthTimelineItem[]) {
  const latest = timeline.slice(0, 3);
  return {
    milestones: latest.map((item) => ({
      id: item.id,
      title: item.title,
      state: item.subtitle || "已记录",
      tone:
        item.kind === "training"
          ? "green"
          : item.kind === "match"
            ? "red"
            : "blue",
      icon: item.kind === "training" ? "✓" : item.kind === "match" ? "⚽" : "•",
    })) as GrowthMilestone[],
  };
}

// 概览统计（P08）：训练累计 + 已确认测评数量，仅展示可追溯事实，缺失留空
function buildHeroStats(growth: GrowthSummary) {
  const total = growth.trainingStats?.totalTrainings;
  // evaluations are per-team coach comments, not assessment publications.
  // The aggregate API has no confirmed assessment count; leave it unavailable.
  return [
    {
      value: typeof total === "number" ? String(total) : "—",
      label: "训练记录",
    },
  ];
}

// 训练历程：服务端月度分布（近8个月），高度按当月最大值归一
function buildMonthlyBars(growth: GrowthSummary): TrainingBar[] | null {
  const monthly = growth.trainingStats?.monthly;
  if (!monthly?.length) return null;
  const max = Math.max(...monthly.map((item) => item.count), 0);
  return monthly.map((item, index) => ({
    id: `training-month-${index + 1}`,
    height: item.count > 0 ? 32 + Math.round((item.count / max) * 48) : 0,
    count: item.count,
    label: `${item.month}月`,
  }));
}

function radarForView(growth: GrowthSummary, viewIndex: number) {
  const metricIds = new Set(
    growth.views[viewIndex]?.metricIds ??
      growth.radar.map((point) => point.metricId),
  );
  const filtered = growth.radar.filter((point) =>
    metricIds.has(point.metricId),
  );
  return filtered;
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "成长数据读取失败。";
}

function metricTrend(_detail: MetricDetail) {
  return "版本与单位信息不足，未计算趋势";
}
