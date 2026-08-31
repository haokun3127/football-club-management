import { getCoachStudentRadar, getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
import type { LoadState, RadarMetricPoint } from "../../../utils/types";

interface StudentChip {
  id: string;
  name: string;
}

interface RadarDimension {
  metricId: string;
  label: string;
  value: string;
  width: string;
}

interface PageData {
  navInset: number;
  state: LoadState;
  message: string;
  students: StudentChip[];
  activeStudentId: string;
  activeStudentName: string;
  radar: RadarMetricPoint[];
  dimensions: RadarDimension[];
  hasRadar: boolean;
  radarHeroClass: string;
  overall: string;
  assessmentPeriod: string;
  feedbackMessage: string;
}

Page<PageData>({
  data: emptyPageData("idle", ""),
  onLoad(query: { student?: string }) {
    return this.load(query?.student || "");
  },
  async load(preferredStudentId: string) {
    if (!requireRole("coach")) {
      this.setData(emptyPageData("empty", "当前账号暂无可查看的学员。"));
      return;
    }

    const requestToken = nextRequestToken(this);
    this.setData(emptyPageData("loading", "正在读取学员名单"));
    try {
      const team = await getCoachTeam();
      if (!isCurrentRequest(this, requestToken)) return;

      const students = toStudentChips(team.members);
      if (!students.length) {
        this.setData(emptyPageData("empty", "近 30 天暂无执教学员。"));
        return;
      }

      const active = students.find((student) => student.id === preferredStudentId) ?? students[0];
      this.setData({ students });
      if (active) await this.loadRadar(active);
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData(emptyPageData("error", "学员名单读取失败，请稍后重试。"));
    }
  },
  async loadRadar(student: StudentChip) {
    const requestToken = nextRequestToken(this);
    this.setData({
      state: "loading",
      message: `正在读取${student.name}的能力雷达`,
      activeStudentId: student.id,
      activeStudentName: student.name,
      radar: [],
      dimensions: [],
      hasRadar: false,
      overall: "-",
      assessmentPeriod: "评估时间待同步",
    });
    try {
      const radar = await getCoachStudentRadar(student.id);
      if (!isCurrentRequest(this, requestToken)) return;

      const dimensions = projectDimensions(radar);
      const hasRadar = dimensions.length >= 3;
      const normalizedValues = dimensions.map((dimension) => Number.parseFloat(dimension.width));
      this.setData({
        state: hasRadar ? "ready" : "empty",
        message: hasRadar ? "" : `${student.name} 暂无足够的有效评测数据生成雷达图。`,
        activeStudentId: student.id,
        activeStudentName: student.name,
        radar: hasRadar ? radar.filter(isValidRadarPoint) : [],
        dimensions,
        hasRadar,
        radarHeroClass: dimensions.length > 6 ? "radar-hero--dense" : "",
        overall: hasRadar ? String(Math.round(average(normalizedValues))) : "-",
        assessmentPeriod: formatAssessmentPeriod(radar),
      });
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData({
        state: "error",
        message: "能力雷达读取失败，请稍后重试。",
        radar: [],
        dimensions: [],
        hasRadar: false,
        overall: "-",
        assessmentPeriod: "评估时间待同步",
      });
    }
  },
  selectStudent(event: { currentTarget: { dataset: { id: string } } }) {
    const student = this.data.students.find((item: StudentChip) => item.id === event.currentTarget.dataset.id);
    if (!student || student.id === this.data.activeStudentId) return;
    return this.loadRadar(student);
  },
  retry() {
    return this.load(this.data.activeStudentId);
  },
  goBack() {
    wx.navigateBack();
  },
});

function emptyPageData(state: LoadState, message: string): PageData {
  return {
    navInset: resolveNavInset(),
    state,
    message,
    students: [],
    activeStudentId: "",
    activeStudentName: "",
    radar: [],
    dimensions: [],
    hasRadar: false,
    radarHeroClass: "",
    overall: "-",
    assessmentPeriod: "评估时间待同步",
    feedbackMessage: "能力评语暂未同步。",
  };
}

function toStudentChips(members: Array<{ id: string; name: string }>): StudentChip[] {
  const ids = new Set<string>();
  return members.filter((member) => member.id && !ids.has(member.id) && Boolean(ids.add(member.id)));
}

function projectDimensions(radar: RadarMetricPoint[]): RadarDimension[] {
  return radar.filter(isValidRadarPoint).map((point) => {
    const normalized = clamp((point.value / point.maxValue) * 100);
    return {
      metricId: point.metricId,
      label: point.label,
      value: formatScore(point.value),
      width: `${formatScore(normalized)}%`,
    };
  });
}

function isValidRadarPoint(point: RadarMetricPoint): point is RadarMetricPoint & { value: number } {
  return typeof point.value === "number"
    && Number.isFinite(point.value)
    && Number.isFinite(point.maxValue)
    && point.maxValue > 0;
}

function formatAssessmentPeriod(radar: RadarMetricPoint[]): string {
  const dates = radar
    .map((point) => point.occurredAt)
    .filter((occurredAt): occurredAt is string => typeof occurredAt === "string" && Number.isFinite(Date.parse(occurredAt)))
    .map((occurredAt) => occurredAt.slice(0, 10))
    .sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return "评估时间待同步";
  return first === last ? `${first} 评估` : `${first} 至 ${last} 评估`;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function nextRequestToken(page: unknown) {
  const state = page as { _c13RequestToken?: number };
  state._c13RequestToken = (state._c13RequestToken ?? 0) + 1;
  return state._c13RequestToken;
}

function isCurrentRequest(page: unknown, requestToken: number) {
  return (page as { _c13RequestToken?: number })._c13RequestToken === requestToken;
}
