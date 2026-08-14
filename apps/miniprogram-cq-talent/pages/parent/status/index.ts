import { getParentCalendar, getParentChildren, getParentGrowth, getParentStudentHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { currentLocalDate, shiftCalendarDate } from "../../../utils/date";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { openPage } from "../../../utils/navigation";
import type { GrowthSummary, LoadState, ScheduleEvent, StudentHome, StudentSummary } from "../../../utils/types";

interface HistoryRow {
  id: string;
  dateLabel: string;
  title: string;
  hoursLabel: string;
}

interface StatusRow {
  label: string;
  value: string;
}

interface PageData {
  state: LoadState;
  message: string;
  studentId: string;
  activeStudentName: string;
  totalCount: number;
  monthCount: number;
  seasonCount: number;
  lessonRows: StatusRow[];
  insuranceRows: StatusRow[];
  insuranceBadge: string;
  insuranceBadgeTone: string;
  insuranceSubtitle: string;
  history: HistoryRow[];
  navInset: number;
  navActionTop: number;
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    studentId: "",
    activeStudentName: "",
    totalCount: 0,
    monthCount: 0,
    seasonCount: 0,
    lessonRows: [],
    insuranceRows: [],
    insuranceBadge: "",
    insuranceBadgeTone: "success",
    insuranceSubtitle: "",
    history: [],
    navInset: resolveNavInset(),
    menuInset: resolveMenuInset(),
  },
  onLoad(query: { student?: string }) {
    const studentId = query?.student || "";
    this.setData({ studentId });
    this.load(studentId);
  },
  async load(studentId: string) {
    const session = requireRole("parent");
    if (!session) return;
    this.setData({ state: "loading", message: "正在读取课时与保障信息" });
    try {
      const children = await getParentChildren();
      if (!children.length) {
        this.setData({ state: "empty", message: "当前微信手机号尚未绑定孩子档案，请联系俱乐部确认登记信息。" });
        return;
      }
      const active = children.find((child) => child.id === studentId) ?? children[0] as StudentSummary;
      const today = currentLocalDate();
      const thirtyDaysAgo = shiftCalendarDate(today, -29);
      const [studentHome, events, growth] = await Promise.all([
        getParentStudentHome(active),
        getParentCalendar(thirtyDaysAgo, today),
        getParentGrowth(active.id).catch(() => undefined),
      ]);
      this.render(active, studentHome, events, new Date(today), growth);
    } catch (error) {
      this.setData({
        state: "error",
        message: error instanceof Error ? error.message : "课时与保障信息读取失败，请稍后重试。",
      });
    }
  },
  retry() {
    this.load(this.data.studentId);
  },
  goBack() { wx.navigateBack(); },
  render(student: StudentSummary, home: StudentHome, events: ScheduleEvent[], today: Date, growth?: GrowthSummary) {
    const pastTrainings = events
      .filter((event) => event.type === "training" && eventBelongsToStudent(event, student.id) && new Date(event.startsAt).getTime() <= today.getTime())
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
    const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
    const seasonKey = `${today.getFullYear()}-${Math.floor(today.getMonth() / 3)}`;
    const monthCount = pastTrainings.filter((event) => {
      const d = new Date(event.startsAt);
      return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
    }).length;
    const seasonCount = pastTrainings.filter((event) => {
      const d = new Date(event.startsAt);
      return `${d.getFullYear()}-${Math.floor(d.getMonth() / 3)}` === seasonKey;
    }).length;
    // 设计口径=累计课时/本月/本季：trainingStats 优先（全时间轴真实统计），回退 30 天窗口计数
    const stats = growth?.trainingStats;
    const seasonTotal = stats ? stats.monthly.slice(-3).reduce((sum, item) => sum + item.count, 0) : seasonCount;
    const insuranceStatus = home.insuranceStatus[0]?.status ?? "";
    const badge = insuranceBadge(insuranceStatus);
    this.setData({
      state: "ready",
      message: "",
      studentId: student.id,
      activeStudentName: student.name,
      totalCount: stats?.totalTrainings ?? pastTrainings.length,
      monthCount: stats?.monthTrainings ?? monthCount,
      seasonCount: seasonTotal,
      lessonRows: home.lessonStatus.map((row) => ({ label: row.label, value: row.value })),
      insuranceRows: home.insuranceStatus.slice(0, 3).map((row) => ({ label: row.label, value: row.value })),
      insuranceBadge: badge.label,
      insuranceBadgeTone: badge.tone,
      insuranceSubtitle: badge.tone === "success" ? "随队保险覆盖中" : "",
      history: pastTrainings.slice(0, 4).map((event) => ({
        id: event.id,
        dateLabel: formatMonthDay(event.startsAt),
        title: event.title,
        hoursLabel: hoursLabel(event.startsAt, event.endsAt),
      })),
    });
  },
  openCoach() {
    openPage("/pages/parent/coaches/index");
  },
});

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function hoursLabel(startsAt: string, endsAt?: string): string {
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (!(ms > 0)) return "";
  const hours = Math.round((ms / 3600000) * 10) / 10;
  return `${hours}h`;
}

function insuranceBadge(status: string): { label: string; tone: string } {
  if (/pending|待|审核/i.test(status)) return { label: "审核中", tone: "warning" };
  if (/expired|到期|失效/i.test(status)) return { label: "已到期", tone: "error" };
  if (/active|有效|生效/i.test(status)) return { label: "已生效", tone: "success" };
  return { label: "待同步", tone: "neutral" };
}

function eventBelongsToStudent(event: ScheduleEvent, studentId: string) {
  if (event.childIds?.length) return event.childIds.includes(studentId);
  if (event.children?.length) return event.children.some((child) => child.id === studentId);
  return false;
}
