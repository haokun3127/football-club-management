import { getParentChildren, getParentGrowth, getParentSchedule, getParentStudentHome, switchActiveRole } from "../../../utils/api";
import { requireRole, routeHome } from "../../../utils/auth";
import { openPage, openTab } from "../../../utils/navigation";
import { formatDateTime, formatTenure, resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { persistAuthenticatedSession, setCurrentStudentId } from "../../../utils/store";
import type { GrowthSummary, LoadState, ScheduleEvent, StudentHome, StudentSummary } from "../../../utils/types";

Page({
  data: {
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
    state: "loading" as LoadState,
    message: "正在读取孩子档案",
    children: [] as StudentSummary[],
    activeStudentId: "",
    activeChild: null as StudentSummary | null,
    studentHome: null as StudentHome | null,
    avatarLetter: "",
    teamLabel: "",
    heroStats: [] as Array<{ label: string; value: string }>,
    recentActivities: [] as Array<{ title: string; date: string }>,
    canSwitchToCoach: false,
  },
  onLoad() {
    this.load();
  },
  async load() {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({
      state: "loading",
      message: "正在读取孩子档案",
      canSwitchToCoach: session.availableRoles.includes("coach"),
    });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      const active = children.find((child) => child.id === session.currentStudentId) ?? children[0];
      if (!active) {
        this.setData({ state: "empty", message: "当前账号没有绑定孩子，请联系俱乐部确认手机号。" });
        return;
      }
      setCurrentStudentId(active.id);
      const [studentHome, schedule, growth] = await Promise.all([
        getParentStudentHome(active),
        getParentSchedule(active.id),
        getParentGrowth(active.id).catch(() => undefined),
      ]);
      this.setData({
        state: "ready",
        message: "",
        children,
        activeStudentId: active.id,
        activeChild: { ...active, trainingStatus: trainingStatusLabel(active.trainingStatus) },
        studentHome,
        avatarLetter: active.name.slice(0, 1),
        teamLabel: active.teams.filter(Boolean).join("、"),
        heroStats: buildTrainingHeroStats(growth, active) ?? buildAvailableHeroStats(studentHome),
        recentActivities: buildScheduledActivities(schedule),
      });
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
  retry() {
    this.load();
  },
  openStatus() {
    openPage(`/pages/parent/status/index?student=${this.data.activeStudentId}`);
  },
  openContent() {
    openTab("/pages/parent/content/index");
  },
  openPrivate() {
    openPage(`/pages/parent/private/index?student=${this.data.activeStudentId}`);
  },
  openBinding() {
    openPage("/pages/parent/binding/index");
  },
  openSchedule() {
    openTab("/pages/parent/schedule/index");
  },
  openGrowth() {
    openTab("/pages/parent/growth/index");
  },
  openRadar() {
    openPage("/pages/parent/radar/index");
  },
  openCoach() {
    openPage("/pages/parent/coaches/index");
  },
  async switchToCoach() {
    const session = requireRole("parent");
    if (!session || !session.availableRoles.includes("coach")) return;
    try {
      const result = await switchActiveRole("coach");
      const nextSession = persistAuthenticatedSession(result);
      if (!nextSession) {
        wx.showToast({ title: "身份切换失败，请稍后重试", icon: "none" });
        return;
      }
      routeHome(nextSession.role);
    } catch {
      wx.showToast({ title: "身份切换失败，请稍后重试", icon: "none" });
    }
  },

});

function buildHeroStats(home: StudentHome) {
  const lessonText = home.lessonStatus.map((item) => `${item.label} ${item.value}`);
  const profileText = home.profile.map((item) => `${item.label} ${item.value}`);
  return [
    { label: "训练课时", value: extractHomeMetric(lessonText, /(\d+(?:\.\d+)?)\s*(?:课时|课|节)/) },
    { label: "出勤率", value: extractHomeMetric(lessonText, /(\d+(?:\.\d+)?)\s*%/, "%") },
    { label: "在队时长", value: extractDuration(profileText) },
  ];
}

function extractHomeMetric(values: string[], pattern: RegExp, suffix = "") {
  for (const value of values) {
    const match = value.match(pattern);
    if (match?.[1]) return `${match[1]}${suffix}`;
  }
  return "—";
}

function extractDuration(values: string[]) {
  for (const value of values) {
    const match = value.match(/(\d+年(?:\d+个月)?|\d+个月)/);
    if (match?.[1]) return match[1];
  }
  return "—";
}

function buildRecentActivities(home: StudentHome) {
  const sources = [...home.lessonStatus, ...home.insuranceStatus, ...home.profile].slice(0, 3);
  const fallback = ["完成本周训练", "更新训练数据", "档案信息已同步"];
  return [0, 1, 2].map((index) => ({
    title: sources[index]?.value || fallback[index],
    date: sources[index]?.label || "近期更新",
  }));
}

// 训练统计行：课时总数/出勤率/在队时长（成长汇总 trainingStats 真实推导，取不到回退档案课时）
function buildTrainingHeroStats(growth: GrowthSummary | undefined, active: StudentSummary) {
  const stats = growth?.trainingStats;
  if (!stats) return undefined;
  return [
    { label: "训练课时", value: String(stats.totalTrainings) },
    { label: "出勤率", value: stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%` },
    { label: "在队时长", value: formatTenure(active.teamStartsAt, "") || "—" },
  ];
}

function buildAvailableHeroStats(home: StudentHome) {
  return home.lessonStatus
    .filter((item) => item.label && item.value && !isUnavailable(item.value))
    .map((item) => ({ label: item.label, value: item.value }));
}

function buildScheduledActivities(events: ScheduleEvent[]) {
  return [...events]
    .filter((event) => event.title && event.startsAt)
    .sort((left, right) => right.startsAt.localeCompare(left.startsAt))
    .slice(0, 3)
    .map((event) => ({ title: event.title, date: formatDateTime(event.startsAt) }));
}

function isUnavailable(value: string) {
  return /待同步|数据同步|未登记|尚未同步|请联系/.test(value);
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "孩子档案读取失败。";
}

function trainingStatusLabel(status?: string) {
  const labels: Record<string, string> = { active: "在训", enrolled: "在训", paused: "暂停训练", inactive: "已停训", graduated: "已结业" };
  return labels[String(status ?? "").toLowerCase()] || status || "在训";
}
