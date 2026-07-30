import { confirmCoachLesson, correctCoachLesson, getCoachLessonConfirmation, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveNavInset } from "../../../utils/presentation";
import { openPage } from "../../../utils/navigation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];

Page({
  data: {
    navInset: resolveNavInset(),
    state: "loading" as LoadState,
    message: "正在读取销课名单",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
    correctingStudentId: "",
    lessonNote: "",
    timeRangeLabel: "",
    eventDateLabel: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.load(query?.id || "");
  },
  goBack() {
    wx.navigateBack();
  },
  async load(id: string) {
    try {
      const workbench = await getCoachWorkbench(id);
      const confirmation = await getCoachLessonConfirmation(id);
      const confirmationByStudentId = new Map(confirmation.participants.map((student) => [student.studentId, student]));
      const sourceRoster = workbench.roster.map((student) => ({ ...student, ...confirmationByStudentId.get(student.studentId), name: student.name }));
      this.setData({
        state: "ready",
        workbench: {
          ...workbench,
          roster: sourceRoster.map((student) => ({
            ...student,
            avatarLetter: student.name.slice(0, 1),
            shouldConsume: student.shouldConsume !== false,
            exceptionReason: student.exceptionReason || "",
          })),
        },
        message: "",
        eventId: id,
        eventDateLabel: (workbench.event.startsAt ?? "").slice(0, 10),
        timeRangeLabel: timeRangeLabel(workbench.event.startsAt, workbench.event.endsAt),
      });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  toggleConsume(event: { currentTarget: { dataset: Record<string, unknown> } }) {
    const studentId = String(event.currentTarget.dataset.studentId ?? "");
    if (!this.data.workbench || !studentId) return;
    const roster = this.data.workbench.roster.map((student: RosterItem) => (
      student.studentId === studentId ? { ...student, shouldConsume: student.shouldConsume === false } : student
    ));
    this.setData({ workbench: { ...this.data.workbench, roster } });
  },
  onReasonInput(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string } }) {
    const studentId = String(event.currentTarget.dataset.studentId ?? "");
    if (!this.data.workbench || !studentId) return;
    const roster = this.data.workbench.roster.map((student: RosterItem) => (
      student.studentId === studentId ? { ...student, exceptionReason: event.detail.value } : student
    ));
    this.setData({ workbench: { ...this.data.workbench, roster } });
  },
  onLessonNoteInput(event: { detail: { value: string } }) {
    this.setData({ lessonNote: event.detail.value });
  },
  openLessonCorrection() {
    if (this.data.eventId) openPage(`/pages/coach/lesson-correction/index?id=${this.data.eventId}`);
  },
  async confirmLesson() {
    if (!this.data.workbench || !this.data.eventId || this.data.saving) return;
    const selected = this.data.workbench.roster.filter((student: RosterItem) => student.studentId && student.shouldConsume !== false);
    const skipped = this.data.workbench.roster.filter((student: RosterItem) => student.studentId && student.shouldConsume === false);
    const studentIds = selected.map((student: RosterItem) => student.studentId);
    const exceptionText = skipped
      .map((student: RosterItem) => `${student.name}:${student.exceptionReason || "不销课"}`)
      .join("；");
    if (!studentIds.length) {
      wx.showToast({ title: "至少选择 1 名销课学员", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      await confirmCoachLesson(this.data.eventId, studentIds, [this.data.lessonNote, exceptionText].filter(Boolean).join("；"));
      wx.showToast({ title: "销课已确认", icon: "success" });
      await this.load(this.data.eventId);
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async correctLesson(event: { currentTarget: { dataset: Record<string, unknown> } }) {
    if (!this.data.eventId || this.data.saving || this.data.correctingStudentId) return;
    const studentId = String(event.currentTarget.dataset.studentId ?? "");
    const delta = Number(event.currentTarget.dataset.delta);
    const student = this.data.workbench?.roster.find((item: RosterItem) => item.studentId === studentId);
    if (!studentId || !Number.isFinite(delta) || delta === 0) return;

    const actionText = delta > 0 ? "返还 1 课时" : "补扣 1 课时";
    wx.showModal({
      title: actionText,
      content: `确认对 ${student?.name ?? "该学员"} ${actionText}？`,
      success: async (result) => {
        if (!result.confirm) return;
        this.setData({ correctingStudentId: studentId });
        try {
          await correctCoachLesson(this.data.eventId, studentId, delta, `小程序教练端${actionText}`);
          wx.showToast({ title: "纠正已保存", icon: "success" });
          await this.load(this.data.eventId);
        } catch (error) {
          wx.showToast({ title: readableError(error), icon: "none" });
        } finally {
          this.setData({ correctingStudentId: "" });
        }
      },
    });
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "销课名单读取失败。";
}

function timeRangeLabel(startsAt?: string, endsAt?: string) {
  const start = Date.parse(startsAt ?? "");
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "时间待确认";
  const minutes = Math.round((end - start) / 60000);
  return `${(startsAt ?? "").slice(11, 16)}-${(endsAt ?? "").slice(11, 16)} (${minutes}分钟)`;
}
