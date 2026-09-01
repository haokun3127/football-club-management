import { getCoachStudentRadar, getCoachTeam } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, RadarMetricPoint } from "../../../utils/types";

const COACH_TRAINING_TEAM_KEY = "coach-training-team-id";

type StudentView = {
  id: string;
  name: string;
  initial: string;
  isActive: boolean;
};

type DimensionView = {
  metricId: string;
  label: string;
  value: string;
  width: string;
};

interface PageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  hasTeam: boolean;
  teamContext: string;
  teamHint: string;
  students: StudentView[];
  hasStudents: boolean;
  activeStudentId: string;
  activeStudentName: string;
  radar: RadarMetricPoint[];
  dimensions: DimensionView[];
  hasRadar: boolean;
  radarMounted: boolean;
  overall: string;
  assessmentPeriod: string;
}

Page<PageData>({
  data: emptyPageData("idle", ""),
  onLoad() {
    return this.load();
  },
  onShow() {
    if (this.data.state !== "loading") return this.load();
  },
  async load() {
    if (!requireRole("coach")) {
      this.setData(emptyPageData("empty", "当前账号暂无可查看的球队能力数据。"));
      return;
    }

    const requestToken = nextRequestToken(this);
    const teamId = wx.getStorageSync<string>(COACH_TRAINING_TEAM_KEY);
    this.setData(emptyPageData("loading", "正在读取能力评估"));
    try {
      const detail = await getCoachTeam(teamId);
      if (!isCurrentRequest(this, requestToken)) return;

      if (!detail.team) {
        this.setData(emptyPageData("empty", "训练管理尚未选择可用球队。"));
        return;
      }

      const students = toStudents(detail.members);
      if (!students.length) {
        this.setData({
          ...emptyPageData("empty", "当前训练球队暂无在队学员。"),
          hasTeam: true,
          teamContext: detail.team.name,
          teamHint: "由训练管理选择",
        });
        return;
      }

      const active = students[0];
      if (!active) return;
      this.setData({
        ...emptyPageData("loading", "正在读取学员能力雷达"),
        hasTeam: true,
        teamContext: detail.team.name,
        teamHint: "由训练管理选择",
        students: markActiveStudent(students, active.id),
        hasStudents: true,
        activeStudentId: active.id,
        activeStudentName: active.name,
      });
      await this.loadRadar(active.id, requestToken);
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData(emptyPageData("error", "球队能力读取失败，请稍后重试。"));
    }
  },
  async loadRadar(studentId: string, inheritedRequestToken?: number) {
    const requestToken = inheritedRequestToken ?? nextRequestToken(this);
    const selected = this.data.students.find((student: StudentView) => student.id === studentId);
    if (!selected) return;

    this.setData({
      state: "loading",
      message: `正在读取${selected.name}的能力雷达`,
      students: markActiveStudent(this.data.students, selected.id),
      activeStudentId: selected.id,
      activeStudentName: selected.name,
      radar: [],
      dimensions: [],
      hasRadar: false,
      radarMounted: false,
      overall: "-",
      assessmentPeriod: "评估时间待同步",
    });
    try {
      const radar = await getCoachStudentRadar(selected.id);
      if (!isCurrentRequest(this, requestToken)) return;

      const dimensions = projectDimensions(radar);
      const hasRadar = dimensions.length >= 3;
      this.setData({
        state: hasRadar ? "ready" : "empty",
        message: hasRadar ? "" : `${selected.name}暂无足够的有效评测数据生成雷达图。`,
        radar: hasRadar ? radar.filter(isValidRadarPoint) : [],
        dimensions,
        hasRadar,
        radarMounted: false,
        overall: hasRadar ? formatAverage(dimensions) : "-",
        assessmentPeriod: formatAssessmentPeriod(radar),
      });
      if (hasRadar) {
        wx.nextTick(() => {
          if (isCurrentRequest(this, requestToken) && this.data.hasRadar) {
            this.setData({ radarMounted: true });
          }
        });
      }
    } catch {
      if (!isCurrentRequest(this, requestToken)) return;
      this.setData({
        state: "error",
        message: "能力雷达读取失败，请稍后重试。",
        radar: [],
        dimensions: [],
        hasRadar: false,
        radarMounted: false,
        overall: "-",
        assessmentPeriod: "评估时间待同步",
      });
    }
  },
  selectStudent(event: { currentTarget?: { dataset?: { id?: string } } }) {
    const studentId = event.currentTarget?.dataset?.id;
    if (!studentId || studentId === this.data.activeStudentId) return;
    return this.loadRadar(studentId);
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
    hasTeam: false,
    teamContext: "当前训练球队待同步",
    teamHint: "由训练管理选择",
    students: [],
    hasStudents: false,
    activeStudentId: "",
    activeStudentName: "",
    radar: [],
    dimensions: [],
    hasRadar: false,
    radarMounted: false,
    overall: "-",
    assessmentPeriod: "评估时间待同步",
  };
}

function toStudents(members: Array<{ id: string; name: string }>): StudentView[] {
  const ids = new Set<string>();
  return members
    .filter((member) => member.id && member.name && !ids.has(member.id) && Boolean(ids.add(member.id)))
    .map((member) => ({
      id: member.id,
      name: member.name.slice(0, 4),
      initial: member.name.slice(0, 1),
      isActive: false,
    }));
}

function markActiveStudent(students: StudentView[], activeStudentId: string): StudentView[] {
  return students.map((student) => ({ ...student, isActive: student.id === activeStudentId }));
}

function projectDimensions(radar: RadarMetricPoint[]): DimensionView[] {
  return radar
    .filter(isValidRadarPoint)
    .map((point) => {
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

function formatAssessmentPeriod(radar: RadarMetricPoint[]) {
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

function formatAverage(dimensions: DimensionView[]) {
  const values = dimensions.map((dimension) => Number.parseFloat(dimension.width));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return String(Math.round(average));
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function nextRequestToken(page: unknown) {
  const state = page as { _c14RequestToken?: number };
  state._c14RequestToken = (state._c14RequestToken ?? 0) + 1;
  return state._c14RequestToken;
}

function isCurrentRequest(page: unknown, requestToken: number) {
  return (page as { _c14RequestToken?: number })._c14RequestToken === requestToken;
}
