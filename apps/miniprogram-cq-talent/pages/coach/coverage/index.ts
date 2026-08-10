import { getCoachTrainingCoverage } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachTrainingCoverageStudent, LoadState } from "../../../utils/types";

interface DimensionBar {
  dimensionId: string;
  label: string;
  covered: boolean;
  hasScore: boolean;
  barWidth: number;
  barClass: string;
  pendingLabel: string;
}

interface StudentRow {
  studentId: string;
  name: string;
  coverageLabel: string;
  dimensions: DimensionBar[];
}

interface PageData {
  state: LoadState;
  statusTitle: string;
  message: string;
  retryLabel: string;
  hasStudents: boolean;
  students: StudentRow[];
}

let loadToken = 0;

Page<PageData>({
  data: {
    state: "loading",
    statusTitle: "覆盖预览",
    message: "正在读取训练覆盖信息",
    retryLabel: "",
    hasStudents: false,
    students: [],
  },
  onLoad() {
    return this.load();
  },
  async load() {
    const session = requireRole("coach");
    if (!session) return;

    const requestToken = ++loadToken;
    this.setData({
      state: "loading",
      statusTitle: "正在读取训练覆盖信息",
      message: "正在读取训练覆盖信息",
      retryLabel: "",
      hasStudents: false,
      students: [],
    });

    try {
      const response = await getCoachTrainingCoverage();
      if (requestToken !== loadToken) return;
      const students = presentStudents(response);
      this.setData(students.length ? {
        state: "ready",
        statusTitle: "",
        message: "",
        retryLabel: "",
        hasStudents: true,
        students,
      } : {
        state: "empty",
        statusTitle: "暂无训练覆盖信息",
        message: "近 30 天暂无可展示的执教覆盖信息",
        retryLabel: "",
        hasStudents: false,
        students: [],
      });
    } catch {
      if (requestToken !== loadToken) return;
      this.setData({
        state: "error",
        statusTitle: "暂时无法读取覆盖信息",
        message: "请稍后重试",
        retryLabel: "重试",
        hasStudents: false,
        students: [],
      });
    }
  },
  retry() {
    return this.load();
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
});

function presentStudents(students: CoachTrainingCoverageStudent[]): StudentRow[] {
  if (!Array.isArray(students)) return [];
  return students.filter((student) => student.studentId).map((student) => ({
    studentId: student.studentId,
    name: student.name || "学员信息待同步",
    coverageLabel: coverageLabel(student.coveredCount, student.totalCount),
    dimensions: (student.dimensions || []).filter((dimension) => dimension.dimensionId).map((dimension) => {
      const scorePercent = validScorePercent(dimension.scorePercent);
      const hasScore = scorePercent !== null;
      return {
        dimensionId: dimension.dimensionId,
        label: dimension.label || "维度待同步",
        covered: Boolean(dimension.covered),
        hasScore,
        barWidth: scorePercent === null ? 0 : scorePercent,
        barClass: barClass(Boolean(dimension.covered), hasScore),
        pendingLabel: hasScore ? "" : "待同步",
      };
    }),
  }));
}

function coverageLabel(coveredCount: number, totalCount: number) {
  return Number.isInteger(coveredCount) && coveredCount >= 0 && Number.isInteger(totalCount) && totalCount >= 0
    ? `覆盖 ${coveredCount}/${totalCount}`
    : "覆盖待同步";
}

function validScorePercent(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
}

function barClass(covered: boolean, hasScore: boolean) {
  if (!hasScore) return "dimension-row__bar dimension-row__bar--pending";
  return covered ? "dimension-row__bar dimension-row__bar--covered" : "dimension-row__bar dimension-row__bar--uncovered";
}
