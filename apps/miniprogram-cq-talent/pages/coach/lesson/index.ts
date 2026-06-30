import { confirmCoachLesson, correctCoachLesson, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取销课名单",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
    correctingStudentId: "",
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
  async confirmLesson() {
    if (!this.data.workbench || !this.data.eventId || this.data.saving) return;
    const studentIds = this.data.workbench.roster.map((student: RosterItem) => student.studentId).filter(Boolean);
    this.setData({ saving: true });
    try {
      await confirmCoachLesson(this.data.eventId, studentIds);
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
