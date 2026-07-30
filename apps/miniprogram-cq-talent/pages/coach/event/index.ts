import { getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { activityStatus, activityTypeLabel, formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterPreview = CoachWorkbench["roster"][number] & { statusLabel: string };

type RosterDot = { studentId: string; initial: string; present: boolean };

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取活动工作台",
    workbench: null as CoachWorkbench | null,
    rosterPreview: [] as RosterPreview[],
    rosterDots: [] as RosterDot[],
    eventId: "",
    eventTypeLabel: "活动",
    statusLabel: "安排中",
    statusTone: "neutral",
    timeLabel: "时间待确认",
    completionCount: 0,
    rosterSummary: "",
    presentCount: 0,
    elapsedText: "00:00:00",
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
      const status = activityStatus(workbench.event.status);
      const completionCount = workbench.workflow.filter((item) => item.status === "ready").length;
      const presentCount = workbench.roster.filter((item) => ["confirmed", "present", "attended"].includes(item.status)).length;
      const exceptionCount = workbench.roster.length - presentCount;
      this.setData({
        state: "ready",
        message: "",
        workbench,
        eventId: id,
        rosterPreview: workbench.roster.slice(0, 5).map((item) => ({ ...item, statusLabel: rosterStatusLabel(item.status) })),
        rosterDots: workbench.roster.slice(0, 10).map((item) => ({
          studentId: item.studentId,
          initial: item.name.slice(0, 1),
          present: ["confirmed", "present", "attended"].includes(item.status),
        })),
        eventTypeLabel: activityTypeLabel(workbench.event.type),
        statusLabel: status.label,
        statusTone: status.tone,
        timeLabel: `${formatCalendarDate(workbench.event.startsAt)} · ${formatTimeRange(workbench.event.startsAt, workbench.event.endsAt)}`,
        completionCount,
        presentCount,
        elapsedText: elapsedLabel(workbench.event.startsAt),
        rosterSummary: exceptionCount ? `${workbench.roster.length} 人 · ${exceptionCount} 人待确认` : `${workbench.roster.length} 人 · 名单状态正常`,
      });
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
  openTacticalBoard() {
    openPage(`/pages/coach/tactical-board/index?eventId=${this.data.eventId}`);
  },
  openTraining() {
    openPage(`/pages/coach/training/index?eventId=${this.data.eventId}`);
  },
  openChange() {
    openPage(`/pages/coach/event-change/index?id=${this.data.eventId}`);
  },
  openTestEntry() {
    const templateId = this.data.workbench?.assessmentTemplateId || "";
    openPage(`/pages/coach/test-entry/index?eventId=${this.data.eventId}&templateId=${templateId}`);
  },
  retry() {
    this.load(this.data.eventId);
  },
  goBack() {
    wx.navigateBack();
  },
  finishSession() {
    const id = this.data.eventId;
    if (!id) return;
    if (this.data.workbench?.event.type === "training") {
      openPage(`/pages/coach/lesson/index?id=${id}`);
    } else if (this.data.workbench?.event.type === "match") {
      openPage(`/pages/coach/match/index?id=${id}`);
    } else {
      openPage(`/pages/coach/lesson/index?id=${id}`);
    }
  },
});

function elapsedLabel(startsAt?: string) {
  const start = Date.parse(startsAt ?? "");
  if (!Number.isFinite(start)) return "00:00:00";
  const elapsed = Math.max(0, Date.now() - start);
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  const seconds = Math.floor((elapsed % 60_000) / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function readableError(error: unknown) {
  const record = error as { message?: string; code?: string };
  return record?.message || record?.code || "活动工作台读取失败。";
}

function rosterStatusLabel(value: string) {
  const labels: Record<string, string> = {
    pending: "待确认",
    invited: "待确认",
    confirmed: "已确认",
    present: "已到课",
    attended: "已到课",
    absent: "缺席",
    leave: "请假",
  };
  return labels[value.toLowerCase()] ?? "待确认";
}
