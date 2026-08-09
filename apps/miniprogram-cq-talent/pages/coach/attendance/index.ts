import { getCoachWorkbench, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { activityStatus, formatCalendarDate, formatTimeRange, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];
type RosterUiItem = RosterItem & { avatarLetter: string; statusLabel: string; statusTone: string; statusIndex: number; hasLessonAction: boolean };

const statusOptions = [
  { label: "未点名", value: "pending" },
  { label: "已邀请", value: "invited" },
  { label: "已确认", value: "confirmed" },
  { label: "到课", value: "present" },
  { label: "迟到", value: "late" },
  { label: "缺席", value: "absent" },
  { label: "请假", value: "leave_requested" },
  { label: "免扣", value: "excused" },
];

interface AttendancePageData {
  navInset: number;
  state: LoadState;
  message: string;
  eventId: string;
  eventTitle: string;
  eventMeta: string;
  hasEventMeta: boolean;
  eventStatus: string;
  eventStatusTone: string;
  roster: RosterUiItem[];
  hasRoster: boolean;
  saving: boolean;
  canSave: boolean;
  statusOptions: typeof statusOptions;
  summary: { total: number; present: number; absent: number; pendingCount: number };
  correctionMode: boolean;
  disputedCount: number;
  hasSaveError: boolean;
  saveError: string;
}

Page<AttendancePageData>({
  data: {
    navInset: resolveNavInset(),
    state: "loading",
    message: "正在读取点名名单",
    eventId: "",
    eventTitle: "",
    eventMeta: "",
    hasEventMeta: false,
    eventStatus: "",
    eventStatusTone: "neutral",
    roster: [],
    hasRoster: false,
    saving: false,
    canSave: false,
    statusOptions,
    summary: { total: 0, present: 0, absent: 0, pendingCount: 0 },
    correctionMode: false,
    disputedCount: 0,
    hasSaveError: false,
    saveError: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.setData({ correctionMode: query?.mode === "correction" });
    this.load(query?.id || "");
  },
  async load(id: string) {
    if (!id) {
      this.setData({
        state: "empty",
        message: "缺少活动 ID",
        eventId: "",
        roster: [],
        hasRoster: false,
        canSave: false,
        summary: emptySummary(),
        hasSaveError: false,
        saveError: "",
      });
      return;
    }
    this.setData({ state: "loading", message: "正在读取点名名单", eventId: id, hasSaveError: false, saveError: "" });
    try {
      const workbench = await getCoachWorkbench(id);
      const roster = withRosterUi(workbench.roster);
      const eventStatus = activityStatus(workbench.event.status);
      const eventMeta = eventMetadata(workbench.event.teamName, workbench.event.startsAt, workbench.event.endsAt);
      const canSave = workbench.event.status !== "cancelled" && roster.length > 0;
      const disputedCount = this.data.correctionMode
        ? roster.filter((student) => student.status === "absent" || student.status === "leave_requested").length
        : 0;
      this.setData({
        state: roster.length ? "ready" : "empty",
        message: roster.length ? "" : "当前活动还没有可点名学员。",
        eventId: id,
        eventTitle: workbench.event.title,
        eventMeta,
        hasEventMeta: Boolean(eventMeta),
        eventStatus: eventStatus.label,
        eventStatusTone: eventStatus.tone,
        roster,
        hasRoster: roster.length > 0,
        canSave,
        summary: summarizeRoster(roster),
        disputedCount,
        saving: false,
        hasSaveError: false,
        saveError: "",
      });
    } catch {
      this.setData({
        state: "error",
        message: "点名名单读取失败，请稍后重试。",
        roster: [],
        hasRoster: false,
        canSave: false,
        summary: emptySummary(),
        saving: false,
        hasSaveError: false,
        saveError: "",
      });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  goBack() {
    wx.navigateBack();
  },
  clearAll() {
    if (!this.data.canSave || this.data.saving) return;
    const roster = withRosterUi(this.data.roster.map((student: RosterUiItem) => ({ ...student, status: "pending", note: "" })));
    this.setData({ roster, summary: summarizeRoster(roster), hasSaveError: false, saveError: "" });
  },
  markAllPresent() {
    if (!this.data.canSave || this.data.saving) return;
    const roster = withRosterUi(this.data.roster.map((student: RosterUiItem) => ({ ...student, status: "present" })));
    this.setData({ roster, summary: summarizeRoster(roster), hasSaveError: false, saveError: "" });
  },
  onStatusChange(event: { currentTarget: { dataset: { index?: number } }; detail: { value: string | number } }) {
    if (!this.data.canSave || this.data.saving) return;
    const index = Number(event.currentTarget.dataset.index);
    const status = statusOptions[Number(event.detail.value)]?.value;
    if (!Number.isInteger(index) || !status || !this.data.roster[index]) return;
    const roster = withRosterUi(this.data.roster.map((student: RosterUiItem, rosterIndex: number) => rosterIndex === index ? { ...student, status } : student));
    this.setData({ roster, summary: summarizeRoster(roster), hasSaveError: false, saveError: "" });
  },
  onNoteInput(event: { currentTarget: { dataset: { index?: number } }; detail: { value: string } }) {
    if (!this.data.canSave || this.data.saving) return;
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || !this.data.roster[index]) return;
    const roster = this.data.roster.map((student: RosterUiItem, rosterIndex: number) => rosterIndex === index ? { ...student, note: event.detail.value } : student);
    this.setData({ roster, hasSaveError: false, saveError: "" });
  },
  async saveAttendance() {
    if (!this.data.canSave || !this.data.eventId || this.data.saving) return;
    if (this.data.roster.some((student: RosterUiItem) => student.status === "pending")) {
      this.setData({ hasSaveError: true, saveError: "请先完成所有学员的点名。" });
      return;
    }
    this.setData({ saving: true, hasSaveError: false, saveError: "" });
    try {
      await saveCoachAttendance(this.data.eventId, this.data.roster.map(toAttendanceParticipant));
      wx.redirectTo({ url: `/pages/coach/attendance-success/index?eventId=${encodeURIComponent(this.data.eventId)}` });
    } catch (error) {
      this.setData({ saving: false, hasSaveError: true, saveError: attendanceSaveError(error) });
    }
  },
});

function toAttendanceParticipant(student: RosterUiItem): RosterItem {
  return {
    studentId: student.studentId,
    name: student.name,
    status: student.status,
    note: student.note,
    lessonAction: student.lessonAction,
    shouldConsume: student.shouldConsume,
    exceptionReason: student.exceptionReason,
    remainingLessons: student.remainingLessons,
  };
}

function withRosterUi(roster: RosterItem[]): RosterUiItem[] {
  return roster.map((student) => {
    const statusIndex = statusOptions.findIndex((option) => option.value === student.status);
    const option = statusOptions[statusIndex] ?? statusOptions[0]!;
    return {
      ...student,
      status: option.value,
      avatarLetter: student.name.slice(0, 1),
      statusLabel: option.label,
      statusTone: statusTone(option.value),
      statusIndex: Math.max(0, statusIndex),
      hasLessonAction: Boolean(student.lessonAction),
    };
  });
}

function summarizeRoster(roster: RosterItem[]) {
  const present = roster.filter((student) => student.status === "present" || student.status === "late").length;
  const absent = roster.filter((student) => student.status === "absent" || student.status === "leave_requested" || student.status === "excused").length;
  return { total: roster.length, present, absent, pendingCount: roster.filter((student) => student.status === "pending").length };
}

function emptySummary() {
  return { total: 0, present: 0, absent: 0, pendingCount: 0 };
}

function statusTone(status: string) {
  if (status === "present") return "success";
  if (status === "late") return "warning";
  if (status === "absent") return "error";
  return "pending";
}

function eventMetadata(teamName?: string, startsAt?: string, endsAt?: string) {
  const parts = [teamName, startsAt && endsAt ? `${formatCalendarDate(startsAt)} ${formatTimeRange(startsAt, endsAt)}` : ""].filter(Boolean);
  return parts.join(" · ");
}

function attendanceSaveError(error: unknown) {
  const status = (error as { status?: unknown })?.status;
  if (status === 400) return "请检查点名状态后重试。";
  if (status === 403) return "当前账号无权保存该活动点名。";
  if (status === 404) return "活动不存在或已不可访问。";
  return "点名保存失败，请稍后重试。";
}
