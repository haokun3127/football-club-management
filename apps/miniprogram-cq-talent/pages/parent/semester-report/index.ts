import { getParentCalendar, getParentChildren, getParentGrowth } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveParentPageDate } from "../../../utils/date";
import { openPage } from "../../../utils/navigation";
import { formatDateTime, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, ScheduleEvent, StudentSummary } from "../../../utils/types";

export interface SemesterReportDimensionView {
  label: string;
  valueLabel: string;
  percent: number;
}

export interface SemesterReportView {
  state: "ready" | "empty";
  studentName: string;
  teamLabel: string;
  periodLabel: string;
  overallLabel: string;
  dimensions: SemesterReportDimensionView[];
  trainingSummary: { label: string; value: string };
  matchSummary: { label: string; value: string };
  attendanceSummary: { label: string; value: string };
  coachNoteLabel: string;
  updatedAtLabel: string;
  metricsEmptyLabel: string;
  activitiesEmptyLabel: string;
}

type PageData = {
  navInset: number;
  menuInset: number;
  state: LoadState;
  message: string;
  children: StudentSummary[];
  activeStudentId: string;
  activeStudentName: string;
  report: SemesterReportView;
};

let loadGeneration = 0;

Page<PageData>({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading",
    message: "正在读取成长报告",
    children: [],
    activeStudentId: "",
    activeStudentName: "",
    report: emptyReport(""),
  },
  onLoad() {
    void this.load();
  },
  onShow() {
    const session = requireRole("parent");
    if (session && this.data.activeStudentId && session.currentStudentId !== this.data.activeStudentId) {
      void this.load();
    }
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const generation = ++loadGeneration;
    this.setData({ state: "loading", message: "正在读取成长报告" });
    try {
      const children = await getParentChildren();
      if (generation !== loadGeneration) return;
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，无法查看成长报告。", children: [], activeStudentName: "", report: emptyReport("") });
        return;
      }
      setCurrentStudentId(active.id);
      const [growth, events] = await Promise.all([
        getParentGrowth(active.id, active),
        fetchCalendarRange(resolveParentPageDate(), 180),
      ]);
      if (generation !== loadGeneration) return;
      const report = buildSemesterReportView(growth, events, active);
      this.setData({
        state: report.state,
        message: report.state === "empty" ? "当前还没有足够的成长记录" : "",
        children,
        activeStudentId: active.id,
        activeStudentName: active.name,
        report,
      });
    } catch (error) {
      if (generation !== loadGeneration) return;
      const record = error as { message?: string; code?: string };
      this.setData({ state: "error", message: record?.message || record?.code || "成长报告读取失败，请点击重试" });
    }
  },
  switchChild(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id;
    if (!id || id === this.data.activeStudentId) return;
    setCurrentStudentId(id);
    void this.load();
  },
  goBack() {
    wx.navigateBack();
  },
  openGrowth() {
    openPage("/pages/parent/growth/index");
  },
  retry() {
    void this.load();
  },
});

export function buildSemesterReportView(growth: GrowthSummary, events: ScheduleEvent[], active: StudentSummary): SemesterReportView {
  const dimensions = (growth.radar ?? [])
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value))
    .map((point) => {
      const maxValue = point.maxValue > 0 ? point.maxValue : 100;
      const value = point.value ?? 0;
      return {
        label: point.label,
        valueLabel: `${value}分`,
        percent: Math.max(0, Math.min(100, Math.round((value / maxValue) * 100))),
      };
    });
  const activeEvents = events.filter((event) => belongsToStudent(event, active.id) && event.status !== "cancelled");
  const trainingCount = activeEvents.filter((event) => event.type === "training").length;
  const matchCount = activeEvents.filter((event) => event.type === "match").length;
  const attendanceRate = growth.trainingStats?.attendanceRate;
  const average = dimensions.length
    ? Math.round(dimensions.reduce((total, dimension) => total + dimension.percent, 0) / dimensions.length)
    : undefined;
  const updatedAt = growth.updatedAt;
  return {
    state: dimensions.length || activeEvents.length ? "ready" : "empty",
    studentName: active.name,
    teamLabel: active.teams.filter(Boolean).join("、") || "队伍待同步",
    periodLabel: "最近阶段",
    overallLabel: average === undefined ? "暂无" : `${average} 分`,
    dimensions,
    trainingSummary: { label: "训练", value: trainingCount ? `${trainingCount} 次` : "暂无" },
    matchSummary: { label: "比赛", value: matchCount ? `${matchCount} 场` : "暂无" },
    attendanceSummary: { label: "出勤", value: attendanceRate === undefined || attendanceRate === null ? "暂无" : `${attendanceRate}%` },
    coachNoteLabel: "暂无教练评语",
    updatedAtLabel: updatedAt ? `更新时间：${formatDateTime(updatedAt)}` : "更新时间待同步",
    metricsEmptyLabel: "暂无能力数据",
    activitiesEmptyLabel: "暂无训练或比赛记录",
  };
}

function emptyReport(studentName: string): SemesterReportView {
  return {
    state: "empty",
    studentName,
    teamLabel: "队伍待同步",
    periodLabel: "最近阶段",
    overallLabel: "暂无",
    dimensions: [],
    trainingSummary: { label: "训练", value: "暂无" },
    matchSummary: { label: "比赛", value: "暂无" },
    attendanceSummary: { label: "出勤", value: "暂无" },
    coachNoteLabel: "暂无教练评语",
    updatedAtLabel: "更新时间待同步",
    metricsEmptyLabel: "暂无能力数据",
    activitiesEmptyLabel: "暂无训练或比赛记录",
  };
}

function belongsToStudent(event: ScheduleEvent, studentId: string) {
  if (event.childIds?.length) return event.childIds.includes(studentId);
  return event.children?.some((child) => child.id === studentId) ?? false;
}

async function fetchCalendarRange(today: string, days: number) {
  const chunks: Array<Promise<Awaited<ReturnType<typeof getParentCalendar>>>> = [];
  for (let offset = days; offset > 0; offset -= 31) {
    const from = shiftDate(today, -offset);
    const to = offset - 31 <= 0 ? today : shiftDate(today, -offset + 30);
    chunks.push(getParentCalendar(from, to));
  }
  const results = await Promise.all(chunks);
  return results.flat();
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
