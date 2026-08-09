import { getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type AttendanceSummary = { total: number; present: number; absent: number; pending: number };

interface AttendanceSuccessPageData {
  state: LoadState;
  message: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  hasVenue: boolean;
  summary: AttendanceSummary;
}

Page<AttendanceSuccessPageData>({
  data: {
    state: "loading",
    message: "正在读取出勤记录",
    eventId: "",
    eventTitle: "",
    eventDate: "",
    eventTime: "",
    venue: "",
    hasVenue: false,
    summary: emptySummary(),
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.load(query?.eventId || "");
  },
  async load(eventId: string) {
    if (!eventId) {
      this.setData({
        state: "empty",
        message: "缺少活动 ID",
        eventId: "",
        eventTitle: "",
        eventDate: "",
        eventTime: "",
        venue: "",
        hasVenue: false,
        summary: emptySummary(),
      });
      return;
    }

    this.setData({
      state: "loading",
      message: "正在读取出勤记录",
      eventId,
      eventTitle: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      hasVenue: false,
      summary: emptySummary(),
    });

    try {
      const workbench = await getCoachWorkbench(eventId);
      this.setData({
        state: "ready",
        message: "",
        eventId,
        eventTitle: workbench.event.title,
        eventDate: formatCalendarDate(workbench.event.startsAt),
        eventTime: formatTimeRange(workbench.event.startsAt, workbench.event.endsAt),
        venue: workbench.event.venue || "",
        hasVenue: Boolean(workbench.event.venue),
        summary: summarizeAttendance(workbench),
      });
    } catch {
      this.setData({
        state: "error",
        message: "出勤记录读取失败，请稍后重试。",
        eventId,
        eventTitle: "",
        eventDate: "",
        eventTime: "",
        venue: "",
        hasVenue: false,
        summary: emptySummary(),
      });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  openWorkbench() {
    if (this.data.eventId) openPage(`/pages/coach/event/index?id=${encodeURIComponent(this.data.eventId)}`);
  },
  openSchedule() {
    openPage("/pages/coach/schedule/index");
  },
});

function summarizeAttendance(workbench: CoachWorkbench): AttendanceSummary {
  const total = workbench.roster.length;
  const present = workbench.roster.filter((student) => student.status === "present" || student.status === "late").length;
  const absent = workbench.roster.filter((student) => student.status === "absent" || student.status === "leave_requested" || student.status === "excused").length;
  const pending = workbench.roster.filter((student) => student.status === "pending").length;
  return { total, present, absent, pending };
}

function emptySummary(): AttendanceSummary {
  return { total: 0, present: 0, absent: 0, pending: 0 };
}
