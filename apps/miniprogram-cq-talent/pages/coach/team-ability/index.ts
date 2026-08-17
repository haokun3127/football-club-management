import { getCoachTeam, getCoachTeamAbilityOverview } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { CoachTeamAbilityOverview, LoadState, RadarMetricPoint } from "../../../utils/types";

interface DimensionRow {
  metricId: string;
  label: string;
  average: string;
  top: string;
  bottom: string;
}

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  teamContext: string;
  assessmentPeriod: string;
  studentCount: number;
  overall: string;
  trendLabel: string;
  trendPositive: boolean;
  radar: RadarMetricPoint[];
  dimensions: DimensionRow[];
  hasOverview: boolean;
  hasRadar: boolean;
  radarMounted: boolean;
  showOverall: boolean;
  showTrend: boolean;
  rankingMessage: string;
}

Page<PageData>({
  data: emptyPageData("idle", ""),
  onLoad() {
    return this.load();
  },
  async load() {
    if (!requireRole("coach")) {
      this.setData(emptyPageData("empty", "当前账号暂无可查看的团队能力数据。"));
      return;
    }

    this.setData(emptyPageData("loading", "正在汇总团队能力数据"));
    const [overviewResult, teamResult] = await Promise.allSettled([
      getCoachTeamAbilityOverview(),
      getCoachTeam(),
    ]);

    if (overviewResult.status !== "fulfilled") {
      this.setData(emptyPageData("error", "团队能力读取失败，请稍后重试。"));
      return;
    }

    const overview = overviewResult.value;
    const dimensions = toDimensionRows(overview.dimensions);
    const radar = toRadar(overview.dimensions);
    const hasOverview = dimensions.length > 0;
    const hasRadar = radar.length >= 3;
    const overall = formatOverall(overview.overall);
    const trendLabel = formatTrend(overview.trendDelta);
    this.setData({
      state: hasOverview ? "ready" : "empty",
      message: hasOverview ? "" : "暂无团队评测数据。",
      teamContext: toTeamContext(teamResult),
      assessmentPeriod: "评估时间待同步",
      studentCount: toCount(overview.studentCount),
      overall,
      trendLabel,
      trendPositive: overview.trendDelta === null || overview.trendDelta >= 0,
      radar: radar.length >= 3 ? radar : [],
      dimensions,
      hasOverview,
      hasRadar,
      radarMounted: false,
      showOverall: hasRadar && overall !== "-",
      showTrend: hasRadar && Boolean(trendLabel),
      rankingMessage: "排名暂未同步",
    });

    if (hasRadar) {
      wx.nextTick(() => {
        if (this.data.state === "ready" && this.data.hasRadar) {
          this.setData({ radarMounted: true });
        }
      });
    }
  },
  retry() {
    return this.load();
  },
  goBack() {
    wx.navigateBack();
  },
});

function emptyPageData(state: LoadState, message: string): PageData {
  return {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state,
    message,
    teamContext: "团队信息待同步",
    assessmentPeriod: "评估时间待同步",
    studentCount: 0,
    overall: "-",
    trendLabel: "",
    trendPositive: true,
    radar: [],
    dimensions: [],
    hasOverview: false,
    hasRadar: false,
    radarMounted: false,
    showOverall: false,
    showTrend: false,
    rankingMessage: "排名暂未同步",
  };
}

function toDimensionRows(dimensions: CoachTeamAbilityOverview["dimensions"]): DimensionRow[] {
  return dimensions
    .filter((dimension) => Boolean(dimension.metricId) && Boolean(dimension.label))
    .map((dimension) => ({
      metricId: dimension.metricId,
      label: dimension.label,
      average: formatScore(dimension.average),
      top: formatScore(dimension.top),
      bottom: formatScore(dimension.bottom),
    }));
}

function toRadar(dimensions: CoachTeamAbilityOverview["dimensions"]): RadarMetricPoint[] {
  return dimensions
    .filter((dimension): dimension is CoachTeamAbilityOverview["dimensions"][number] & { average: number } => isFiniteNumber(dimension.average))
    .map((dimension) => ({
      metricId: dimension.metricId,
      label: dimension.label,
      value: clamp(dimension.average),
      maxValue: 100,
    }));
}

function toTeamContext(result: PromiseSettledResult<Awaited<ReturnType<typeof getCoachTeam>>>): string {
  if (result.status !== "fulfilled") return "团队信息待同步";
  const team = result.value.team;
  if (!team?.name || !team.season) return "团队信息待同步";
  return `${team.season} · ${team.name}`;
}

function toCount(value: number) {
  return isFiniteNumber(value) ? Math.max(0, Math.round(value)) : 0;
}

function formatTrend(value: number | null) {
  if (!isFiniteNumber(value)) return "";
  return `较上期 ${value >= 0 ? "+" : ""}${formatScore(value)}`;
}

function formatOverall(value: number | null) {
  return isFiniteNumber(value) ? String(Math.round(value)) : "-";
}

function formatScore(value: number | null) {
  if (!isFiniteNumber(value)) return "-";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 100));
}
