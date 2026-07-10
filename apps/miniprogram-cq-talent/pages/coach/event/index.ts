import { getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取活动工作台",
    workbench: null as CoachWorkbench | null,
    rosterPreview: [] as CoachWorkbench["roster"],
    eventId: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.load(query?.id || "");
  },
  async load(id: string) {
    if (!id) {
      this.setData({ state: "error", message: "缺少活动 ID" });
      return;
    }
    try {
      const workbench = await getCoachWorkbench(id);
      this.setData({ state: "ready", message: "", workbench, eventId: id, rosterPreview: workbench.roster.slice(0, 5) });
    } catch (error) {
      this.setData({ state: "error", message: readableError(error), eventId: id });
    }
  },
  openAttendance() {
    openPage(`/pages/coach/attendance/index?id=${this.data.eventId}`);
  },
  openLesson() {
    openPage(`/pages/coach/lesson/index?id=${this.data.eventId}`);
  },
  openMatch() {
    openPage(`/pages/coach/match/index?id=${this.data.eventId}`);
  },
  openTraining() {
    openPage(`/pages/coach/training/index?eventId=${this.data.eventId}`);
  },
  openTestEntry() {
    const templateId = this.data.workbench?.assessmentTemplateId || "";
    openPage(`/pages/coach/test-entry/index?eventId=${this.data.eventId}&templateId=${templateId}`);
  },
});

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动工作台读取失败。";
}
