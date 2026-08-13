import { confirmCoachLesson, getCoachLessonConfirmation, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachLessonConfirmation, CoachWorkbench, LoadState } from "../../../utils/types";

type LessonRosterItem = {
  studentId: string;
  name: string;
  avatarLetter: string;
  balanceText: string;
  lessonAmountText: string;
};

interface LessonPageData {
  state: LoadState;
  message: string;
  retryLabel: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventTeam: string;
  hasEventTeam: boolean;
  roster: LessonRosterItem[];
  hasRoster: boolean;
  rosterCount: number;
  selectedStudentIds: string[];
  selectionCount: number;
  canConfirm: boolean;
  saving: boolean;
  hasSubmitError: boolean;
  submitError: string;
}

Page<LessonPageData>({
  data: {
    state: "loading",
    message: "正在读取课时记录",
    retryLabel: "",
    eventId: "",
    eventTitle: "",
    eventDate: "",
    eventTime: "",
    eventTeam: "",
    hasEventTeam: false,
    roster: [],
    hasRoster: false,
    rosterCount: 0,
    selectedStudentIds: [],
    selectionCount: 0,
    canConfirm: false,
    saving: false,
    hasSubmitError: false,
    submitError: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    return this.load(query?.id || "");
  },
  async load(eventId: string): Promise<boolean> {
    if (!eventId) {
      this.setData({
        state: "empty",
        message: "缺少活动 ID",
        retryLabel: "",
        eventId: "",
        eventTitle: "",
        eventDate: "",
        eventTime: "",
        eventTeam: "",
        hasEventTeam: false,
        roster: [],
        hasRoster: false,
        rosterCount: 0,
        selectedStudentIds: [],
        selectionCount: 0,
        canConfirm: false,
        hasSubmitError: false,
        submitError: "",
      });
      return false;
    }

    this.setData({
      state: "loading",
      message: "正在读取课时记录",
      retryLabel: "",
      eventId,
      eventTitle: "",
      eventDate: "",
      eventTime: "",
      eventTeam: "",
      hasEventTeam: false,
      roster: [],
      hasRoster: false,
      rosterCount: 0,
      selectedStudentIds: [],
      selectionCount: 0,
      canConfirm: false,
      hasSubmitError: false,
      submitError: "",
    });

    try {
      const [workbench, confirmation] = await Promise.all([
        getCoachWorkbench(eventId),
        getCoachLessonConfirmation(eventId),
      ]);
      const roster = mergeLessonRoster(workbench, confirmation);
      const selectedStudentIds = roster.map((student) => student.studentId);
      const eventTeam = workbench.event.teamName || "";

      if (!selectedStudentIds.length) {
        this.setData({
          state: "empty",
          message: "当前活动没有可确认的学员。",
          retryLabel: "",
          eventId,
          eventTitle: eventTitle(workbench.event.title),
          eventDate: formatCalendarDate(workbench.event.startsAt),
          eventTime: formatTimeRange(workbench.event.startsAt, workbench.event.endsAt),
          eventTeam,
          hasEventTeam: Boolean(eventTeam),
          roster,
          hasRoster: false,
          rosterCount: 0,
          selectedStudentIds: [],
          selectionCount: 0,
          canConfirm: false,
        });
        return false;
      }

      this.setData({
        state: "ready",
        message: "",
        retryLabel: "",
        eventId,
        eventTitle: eventTitle(workbench.event.title),
        eventDate: formatCalendarDate(workbench.event.startsAt),
        eventTime: formatTimeRange(workbench.event.startsAt, workbench.event.endsAt),
        eventTeam,
        hasEventTeam: Boolean(eventTeam),
        roster,
        hasRoster: true,
        rosterCount: roster.length,
        selectedStudentIds,
        selectionCount: selectedStudentIds.length,
        canConfirm: true,
      });
      return true;
    } catch {
      this.setData({
        state: "error",
        message: "课时记录读取失败，请稍后重试。",
        retryLabel: "重新读取",
        eventId,
        eventTitle: "",
        eventDate: "",
        eventTime: "",
        eventTeam: "",
        hasEventTeam: false,
        roster: [],
        hasRoster: false,
        rosterCount: 0,
        selectedStudentIds: [],
        selectionCount: 0,
        canConfirm: false,
        hasSubmitError: false,
        submitError: "",
      });
      return false;
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  openCorrection() {
    if (!this.data.eventId) return;
    openPage(`/pages/coach/lesson-correction/index?id=${this.data.eventId}`);
  },
  async confirmLesson() {
    if (!this.data.eventId || this.data.saving) return;
    const studentIds = this.data.selectedStudentIds.filter(Boolean);
    if (!studentIds.length) {
      this.setData({ hasSubmitError: true, submitError: "没有可确认的学员。" });
      return;
    }

    this.setData({ saving: true, hasSubmitError: false, submitError: "" });
    try {
      await confirmCoachLesson(this.data.eventId, studentIds);
      const reloaded = await this.load(this.data.eventId);
      if (reloaded) wx.showToast({ title: "课时确认已提交", icon: "success" });
    } catch {
      this.setData({
        saving: false,
        hasSubmitError: true,
        submitError: "课时确认失败，请稍后重试。",
      });
    } finally {
      if (this.data.saving) this.setData({ saving: false });
    }
  },
});

function mergeLessonRoster(workbench: CoachWorkbench, confirmation: CoachLessonConfirmation): LessonRosterItem[] {
  const confirmationIds = new Set(confirmation.participants.map((student) => student.studentId).filter(Boolean));
  const ledgerByStudentId = new Map(confirmation.ledgers.map((ledger) => [ledger.studentId, ledger]));
  const seenStudentIds = new Set<string>();
  const roster: LessonRosterItem[] = [];

  for (const student of workbench.roster) {
    if (!student.studentId || !confirmationIds.has(student.studentId) || seenStudentIds.has(student.studentId)) continue;
    seenStudentIds.add(student.studentId);
    const name = student.name && student.name !== "学员" ? student.name : "姓名待同步";
    const ledger = ledgerByStudentId.get(student.studentId);
    const balance = ledger?.remainingLessons ?? ledger?.balance;
    roster.push({
      studentId: student.studentId,
      name,
      avatarLetter: name === "姓名待同步" ? "?" : name.slice(0, 1),
      balanceText: typeof balance === "number" ? `剩余 ${balance} 课时` : "课时余额待核对",
      lessonAmountText: "1课时",
    });
  }

  return roster;
}

function eventTitle(value: string) {
  return value && value !== "活动" ? value : "活动信息待同步";
}
