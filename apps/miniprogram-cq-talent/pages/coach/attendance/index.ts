import { getCoachWorkbench, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];

const statusOptions = [
  { label: "到课", value: "present" },
  { label: "迟到", value: "late" },
  { label: "缺席", value: "absent" },
  { label: "请假", value: "leave_requested" },
  { label: "免扣", value: "excused" },
];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取点名名单",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
    statusOptions,
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.load(query?.id || "");
  },
  async load(id: string) {
    try {
      const workbench = await getCoachWorkbench(id);
      this.setData({ state: "ready", workbench, message: "", eventId: id });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  markAllPresent() {
    const workbench = this.data.workbench;
    if (!workbench) return;
    this.setData({
      workbench: {
        ...workbench,
        roster: workbench.roster.map((student: RosterItem) => ({ ...student, status: "present" })),
      },
    });
  },
  onStatusChange(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string | number } }) {
    const index = Number(event.currentTarget.dataset.index);
    const status = statusOptions[Number(event.detail.value)]?.value;
    if (!this.data.workbench || !Number.isFinite(index) || !status) return;
    const roster = this.data.workbench.roster.map((student: RosterItem, rosterIndex: number) => (
      rosterIndex === index ? { ...student, status } : student
    ));
    this.setData({ workbench: { ...this.data.workbench, roster } });
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
    this.setData({ saving: true });
    try {
      await saveCoachAttendance(this.data.eventId, this.data.workbench.roster);
      wx.showToast({ title: "点名已保存", icon: "success" });
      await this.load(this.data.eventId);
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "点名名单读取失败。";
}
