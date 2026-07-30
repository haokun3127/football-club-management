import { getCoachWorkbench, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { activityStatus, formatCalendarDate, formatTimeRange, resolveNavInset } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];
type RosterUiItem = RosterItem & { avatarLetter: string; statusLabel: string; statusTone: string; statusIndex: number };

const statusOptions = [
  { label: "未点名", value: "pending" },
  { label: "到课", value: "present" },
  { label: "迟到", value: "late" },
  { label: "缺席", value: "absent" },
  { label: "请假", value: "leave_requested" },
  { label: "免扣", value: "excused" },
];

Page({
  data: {
    navInset: resolveNavInset(),
    state: "loading" as LoadState,
    message: "正在读取点名名单",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
    statusOptions,
    summary: { total: 0, present: 0, attention: 0, absent: 0, pendingCount: 0 },
    correctionMode: false,
    disputedCount: 0,
    eventMetaLabel: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.setData({ correctionMode: query?.mode === "correction" });
    this.load(query?.id || "");
  },
  async load(id: string) {
    try {
      const workbench = await getCoachWorkbench(id);
      const roster = withRosterUi(workbench.roster);
      const disputedCount = this.data.correctionMode
        ? roster.filter((student) => student.status === "absent" || student.status === "leave_requested").length
        : 0;
      this.setData({ state: roster.length ? "ready" : "empty", workbench: { ...workbench, roster }, message: roster.length ? "" : "当前活动还没有可点名学员。", eventId: id, summary: summarizeRoster(roster), disputedCount, eventMetaLabel: `${workbench.event.teamName || "队伍待确认"} · ${formatCalendarDate(workbench.event.startsAt)} ${formatTimeRange(workbench.event.startsAt, workbench.event.endsAt)}` });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  goBack() {
    wx.navigateBack();
  },
  clearAll() {
    const workbench = this.data.workbench;
    if (!workbench) return;
    const roster = withRosterUi(workbench.roster.map((student: RosterItem) => ({ ...student, status: "pending", note: "" })));
    this.setData({ workbench: { ...workbench, roster }, summary: summarizeRoster(roster) });
  },
  markAllPresent() {
    const workbench = this.data.workbench;
    if (!workbench) return;
    const roster = withRosterUi(workbench.roster.map((student: RosterItem) => ({ ...student, status: "present" })));
    this.setData({ workbench: { ...workbench, roster }, summary: summarizeRoster(roster) });
  },
  onStatusChange(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string | number } }) {
    const index = Number(event.currentTarget.dataset.index);
    const status = statusOptions[Number(event.detail.value)]?.value;
    if (!this.data.workbench || !Number.isFinite(index) || !status) return;
    const roster = withRosterUi(this.data.workbench.roster.map((student: RosterItem, rosterIndex: number) => (
      rosterIndex === index ? { ...student, status } : student
    )));
    this.setData({ workbench: { ...this.data.workbench, roster }, summary: summarizeRoster(roster) });
  },
  onNoteInput(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string } }) {
    const index = Number(event.currentTarget.dataset.index);
    if (!this.data.workbench || !Number.isFinite(index)) return;
    const roster = this.data.workbench.roster.map((student: RosterItem, rosterIndex: number) => (
      rosterIndex === index ? { ...student, note: event.detail.value } : student
    ));
    this.setData({ workbench: { ...this.data.workbench, roster } });
  },
  async saveAttendance() {
    if (!this.data.workbench || !this.data.eventId || this.data.saving) return;
    const pendingStudent = this.data.workbench.roster.find((student: RosterItem) => student.status === "pending");
    if (pendingStudent) {
      wx.showToast({ title: `请先完成${pendingStudent.name}的点名`, icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      const roster = this.data.workbench.roster.map(({ statusLabel: _label, statusTone: _tone, statusIndex: _index, ...student }: RosterUiItem) => student);
      await saveCoachAttendance(this.data.eventId, roster);
      const event = this.data.workbench.event;
      const present = this.data.workbench.roster.filter((student: RosterItem) => student.status === "present").length;
      const absent = this.data.workbench.roster.length - present;
      wx.redirectTo({
        url: `/pages/coach/attendance-success/index?title=${encodeURIComponent(event.title)}&date=${encodeURIComponent(event.startsAt)}&venue=${encodeURIComponent(event.venue || "")}&present=${present}&absent=${absent}&correction=${this.data.correctionMode ? 1 : 0}`,
      });
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
      this.setData({ saving: false });
    }
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "点名名单读取失败。";
}

function withRosterUi(roster: RosterItem[]): RosterUiItem[] {
  return roster.map((student) => {
    const statusIndex = Math.max(0, statusOptions.findIndex((option) => option.value === student.status));
    const status = statusOptions[statusIndex] ?? statusOptions[0]!;
    const statusTone = status.value === "present" ? "success" : status.value === "late" ? "warning" : status.value === "absent" ? "error" : "pending";
    return { ...student, avatarLetter: student.name.slice(0, 1), status: status.value, statusLabel: status.label, statusTone, statusIndex };
  });
}

function summarizeRoster(roster: RosterItem[]) {
  const present = roster.filter((student) => student.status === "present").length;
  const absent = roster.filter((student) => student.status === "absent" || student.status === "leave_requested").length;
  return { total: roster.length, present, attention: roster.length - present, absent, pendingCount: roster.filter((student) => student.status === "pending").length };
}
