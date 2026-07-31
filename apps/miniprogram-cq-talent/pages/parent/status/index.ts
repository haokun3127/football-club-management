import { getParentCalendar, getParentChildren, getParentStudentHome } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { DEV_MODE, DEV_TEST_DATE } from "../../../utils/config";
import type { LoadState, ScheduleEvent, StudentHome, StudentSummary } from "../../../utils/types";

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
  activeStudentName: string;
  totalCount: number;
  monthCount: number;
  seasonCount: number;
  lessonRows: StatusRow[];
  insuranceRows: StatusRow[];
  insuranceBadge: string;
  insuranceBadgeTone: string;
  history: HistoryRow[];
}

Page<PageData>({
  data: {
    state: "idle",
    message: "",
    activeStudentName: "",
    totalCount: 0,
    monthCount: 0,
    seasonCount: 0,
    lessonRows: [],
    insuranceRows: [],
    insuranceBadge: "",
    insuranceBadgeTone: "success",
    history: [],
  },
  onLoad(query: { student?: string }) {
    this.load(query?.student || "");
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
      const today = anchorDate();
      const yearAgo = shiftDays(today, -365);
      const [studentHome, events] = await Promise.all([
        getParentStudentHome(active),
        getParentCalendar(yearAgo, today),
      ]);
      this.render(active, studentHome, events, new Date(today));
    } catch (error) {
      this.setData({
        state: "error",
        message: error instanceof Error ? error.message : "课时与保障信息读取失败，请稍后重试。",
      });
    }
  },
  retry() {
    this.load("");
  },
  goBack() { wx.navigateBack(); },
  render(student: StudentSummary, home: StudentHome, events: ScheduleEvent[], today: Date) {
    const pastTrainings = events
      .filter((event) => event.type === "training" && new Date(event.startsAt).getTime() <= today.getTime())
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
    const insuranceStatus = home.insuranceStatus[0]?.status ?? "";
    this.setData({
      state: "ready",
      message: "",
      activeStudentName: student.name,
      totalCount: pastTrainings.length,
      monthCount,
      seasonCount,
      lessonRows: home.lessonStatus.map((row) => ({ label: row.label, value: row.value })),
      insuranceRows: home.insuranceStatus.map((row) => ({ label: row.label, value: row.value })),
      insuranceBadge: insuranceBadge(insuranceStatus).label,
      insuranceBadgeTone: insuranceBadge(insuranceStatus).tone,
      history: pastTrainings.slice(0, 4).map((event) => ({
        id: event.id,
        dateLabel: formatMonthDay(event.startsAt),
        title: event.title,
        hoursLabel: hoursLabel(event.startsAt, event.endsAt),
      })),
    });
  },
});

function anchorDate(): string {
  if (DEV_MODE) return DEV_TEST_DATE;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
  return { label: "已生效", tone: "success" };
}
