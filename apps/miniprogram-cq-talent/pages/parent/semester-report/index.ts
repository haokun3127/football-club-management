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
  percent: number | null;
}

export interface SemesterReportView {
  state: "ready" | "empty";
  studentName: string;
  studentInitial: string;
  teamLabel: string;
  periodLabel: string;
  periodDescription: string;
  freshnessLabel: string;
  currentStudentLabel: string;
  abilityTitle: string;
  abilitySubtitle: string;
  overallScore: string;
  overallScoreLabel: string;
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

const loadGenerations = new WeakMap<object,number>();

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
  onUnload() { loadGenerations.set(this,(loadGenerations.get(this) ?? 0)+1); },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    const generation = (loadGenerations.get(this) ?? 0) + 1;
    loadGenerations.set(this,generation);
    this.setData({ state: "loading", message: "正在读取成长报告" });
    try {
      const children = await getParentChildren();
      if (generation !== loadGenerations.get(this)) return;
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
      if (generation !== loadGenerations.get(this)) return;
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
      if (generation !== loadGenerations.get(this)) return;
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
  openStudentPicker() {
    if (this.data.children.length < 2) return;
    wx.showActionSheet({
      itemList: this.data.children.map((child: StudentSummary) => child.name),
      success: ({ tapIndex }) => {
        const child = this.data.children[tapIndex];
        if (child) this.switchChild({ currentTarget: { dataset: { id: child.id } } });
      },
    });
  },
  goBack() {
    wx.navigateBack();
  },
  openConfirmedResults() {
    if (this.data.activeStudentId) openPage(`/pages/parent/confirmed-results/index?student=${encodeURIComponent(this.data.activeStudentId)}`);
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
      const maxValue = point.maxValue > 0 && Number.isFinite(point.maxValue) ? point.maxValue : null;
      const value = point.value ?? 0;
      return {
        label: point.label,
        valueLabel: maxValue === null ? String(value) : `${value} / ${maxValue}`,
        percent: maxValue === null ? null : Math.max(0, Math.min(100, Math.round((value / maxValue) * 100))),
      };
    })
    .slice(0, 4);
  const activeEvents = events.filter((event) => belongsToStudent(event, active.id) && event.status === "completed");
  const trainingCount = activeEvents.filter((event) => event.type === "training").length;
  const matchCount = activeEvents.filter((event) => event.type === "match").length;
  const attendanceRate = growth.trainingStats?.attendanceRate;
  const overall = typeof growth.overall === "number" && Number.isFinite(growth.overall) ? growth.overall : undefined;
  const updatedAt = growth.updatedAt;
  const studentName = active.name || "姓名待同步";
  return {
    state: dimensions.length || activeEvents.length || overall !== undefined ? "ready" : "empty",
    studentName,
    studentInitial: studentName.slice(0, 1),
    teamLabel: active.teams.filter(Boolean).join("、") || "队伍待同步",
    periodLabel: "最近阶段",
    periodDescription: "根据最近 180 天训练与比赛数据生成",
    freshnessLabel: updatedAt ? "数据已更新" : "等待数据同步",
    currentStudentLabel: "当前学员",
    abilityTitle: "综合能力",
    abilitySubtitle: "模型数值，原始成绩请查看已确认结果",
    overallScore: overall === undefined ? "暂无" : `${overall}`,
    overallScoreLabel: "模型综合值",
    overallLabel: overall === undefined ? "暂无" : String(overall),
    dimensions,
    trainingSummary: { label: "训练", value: `${trainingCount} 次` },
    matchSummary: { label: "比赛", value: `${matchCount} 场` },
    attendanceSummary: { label: "计次比例", value: attendanceRate === undefined || attendanceRate === null ? "暂无" : `${attendanceRate}%` },
    coachNoteLabel: "队伍评价请在成长页按队查看，不与课堂表现或测评合并。",
    updatedAtLabel: updatedAt ? `更新时间：${formatDateTime(updatedAt)}` : "更新时间待同步",
    metricsEmptyLabel: "暂无能力数据",
    activitiesEmptyLabel: "暂无训练或比赛记录",
  };
}

function emptyReport(studentName: string): SemesterReportView {
  return {
    state: "empty",
    studentName,
    studentInitial: studentName ? studentName.slice(0, 1) : "学",
    teamLabel: "队伍待同步",
    periodLabel: "最近阶段",
    periodDescription: "根据最近 180 天训练与比赛数据生成",
    freshnessLabel: "等待数据同步",
    currentStudentLabel: "当前学员",
    abilityTitle: "综合能力",
    abilitySubtitle: "模型数值，原始成绩请查看已确认结果",
    overallScore: "暂无",
    overallScoreLabel: "模型综合值",
    overallLabel: "暂无",
    dimensions: [],
    trainingSummary: { label: "训练", value: "暂无" },
    matchSummary: { label: "比赛", value: "暂无" },
    attendanceSummary: { label: "计次比例", value: "暂无" },
    coachNoteLabel: "队伍评价请在成长页按队查看，不与课堂表现或测评合并。",
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
  for (let offset = days - 1; offset >= 0; offset -= 31) {
    const from = shiftDate(today, -offset);
    const to = offset - 31 <= 0 ? today : shiftDate(today, -offset + 30);
    chunks.push(getParentCalendar(`${from}T00:00:00+08:00`, `${to}T23:59:59.999+08:00`));
  }
  const results = await Promise.all(chunks);
  return [...new Map(results.flat().map(event => [event.id,event])).values()];
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0,10);
}
