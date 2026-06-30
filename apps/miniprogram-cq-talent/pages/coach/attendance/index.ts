import { getCoachWorkbench, saveCoachAttendance } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取点名名单",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
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
