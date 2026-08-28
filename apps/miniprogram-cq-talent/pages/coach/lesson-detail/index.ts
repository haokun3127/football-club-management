import { getCoachLessonConfirmation, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachLessonConfirmation, CoachWorkbench, LoadState, TrainingProject } from "../../../utils/types";

type DetailRow = {
  studentId: string;
  name: string;
  avatarLetter: string;
  statusLabel: string;
  lessonLabel: string;
};

interface PageData {
  state: LoadState;
  statusTitle: string;
  statusAction: string;
  message: string;
  eventId: string;
  eventTitle: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventTeam: string;
  hasEventTeam: boolean;
  eventVenue: string;
  hasVenue: boolean;
  rosterCount: number;
  rows: DetailRow[];
  hasRows: boolean;
  trainingProjects: TrainingProject[];
  trainingProjectCount: number;
  hasTrainingProjects: boolean;
}

Page<PageData>({
  data: {
    state: "idle",
    statusTitle: "",
    statusAction: "",
    message: "",
    eventId: "",
    eventTitle: "",
    eventName: "",
    eventDate: "",
    eventTime: "",
    eventTeam: "",
    hasEventTeam: false,
    eventVenue: "",
    hasVenue: false,
    rosterCount: 0,
    rows: [],
    hasRows: false,
    trainingProjects: [],
    trainingProjectCount: 0,
    hasTrainingProjects: false,
  },

  onLoad(query?: Record<string, string | undefined>) {
    return this.load(query?.id || "");
  },

  async load(eventId: string): Promise<boolean> {
    if (!requireRole("coach")) return false;
    if (!eventId) {
      this.setData({
        state: "empty",
        statusTitle: "缺少活动",
        statusAction: "",
        message: "缺少活动 ID，暂时无法读取销课详情。",
        eventId: "",
        eventTitle: "",
        eventName: "",
        eventDate: "",
        eventTime: "",
        eventTeam: "",
        hasEventTeam: false,
        eventVenue: "",
        hasVenue: false,
        rosterCount: 0,
        rows: [],
        hasRows: false,
        trainingProjects: [],
        trainingProjectCount: 0,
        hasTrainingProjects: false,
      });
      return false;
    }

    this.setData({
      state: "loading",
      statusTitle: "正在读取销课详情",
      statusAction: "",
      message: "",
      eventId,
      eventTitle: "",
      eventName: "",
      eventDate: "",
      eventTime: "",
      eventTeam: "",
      hasEventTeam: false,
      eventVenue: "",
      hasVenue: false,
      rosterCount: 0,
      rows: [],
      hasRows: false,
      trainingProjects: [],
      trainingProjectCount: 0,
      hasTrainingProjects: false,
    });

    try {
      const [workbench, confirmation] = await Promise.all([
        getCoachWorkbench(eventId),
        getCoachLessonConfirmation(eventId),
      ]);
      const rows = mergeDetailRows(workbench, confirmation);
      const eventTeam = workbench.event.teamName || "";
      const eventVenue = workbench.event.venue || "";
      this.setData({
        state: rows.length ? "ready" : "empty",
        statusTitle: rows.length ? "" : "暂无销课学员",
        statusAction: "",
        message: rows.length ? "" : "当前活动没有可展示的销课学员。",
        eventId,
        eventTitle: `${eventTypeLabel(workbench.event.type)}课 · 销课详情`,
        eventName: workbench.event.title && workbench.event.title !== "活动" ? workbench.event.title : "活动信息待同步",
        eventDate: formatCalendarDate(workbench.event.startsAt),
        eventTime: formatTimeRange(workbench.event.startsAt, workbench.event.endsAt),
        eventTeam,
        hasEventTeam: Boolean(eventTeam),
        eventVenue,
        hasVenue: Boolean(eventVenue),
        rosterCount: rows.length,
        rows,
        hasRows: rows.length > 0,
        trainingProjects: workbench.selectedTrainingProjects,
        trainingProjectCount: workbench.selectedTrainingProjects.length,
        hasTrainingProjects: workbench.selectedTrainingProjects.length > 0,
      });
      return true;
    } catch {
      this.setData({
        state: "error",
        statusTitle: "销课详情读取失败",
        statusAction: "重试",
        message: "销课详情读取失败，请稍后重试。",
        eventId,
        eventTitle: "",
        eventName: "",
        eventDate: "",
        eventTime: "",
        eventTeam: "",
        hasEventTeam: false,
        eventVenue: "",
        hasVenue: false,
        rosterCount: 0,
        rows: [],
        hasRows: false,
        trainingProjects: [],
        trainingProjectCount: 0,
        hasTrainingProjects: false,
      });
      return false;
    }
  },

  retry() {
    return this.load(this.data.eventId);
  },

  openCorrection() {
    if (this.data.eventId) openPage(`/pages/coach/lesson-correction/index?id=${encodeURIComponent(this.data.eventId)}`);
  },
});

function mergeDetailRows(workbench: CoachWorkbench, confirmation: CoachLessonConfirmation): DetailRow[] {
  const confirmationById = new Map(confirmation.participants.map((participant) => [participant.studentId, participant]));
  const ledgerById = new Map(confirmation.ledgers.map((ledger) => [ledger.studentId, ledger]));
  const seen = new Set<string>();
  const rows: DetailRow[] = [];
  for (const student of workbench.roster) {
    if (!student.studentId || !confirmationById.has(student.studentId) || seen.has(student.studentId)) continue;
    seen.add(student.studentId);
    const name = student.name && student.name !== "学员" ? student.name : "姓名待同步";
    const ledger = ledgerById.get(student.studentId);
    const balance = ledger?.remainingLessons ?? ledger?.balance;
    rows.push({
      studentId: student.studentId,
      name,
      avatarLetter: name === "姓名待同步" ? "?" : name.slice(0, 1),
      statusLabel: participantStatusLabel(confirmationById.get(student.studentId)?.status || student.status),
      lessonLabel: typeof balance === "number" ? `${balance}课时 · 已确认` : "课时余额待核对",
    });
  }
  return rows;
}

function participantStatusLabel(status: string) {
  if (status === "present" || status === "已到" || status === "出勤") return "已出勤";
  if (status === "late" || status === "迟到") return "迟到";
  if (status === "absent" || status === "缺勤") return "缺勤";
  if (status === "excused" || status === "请假") return "已请假";
  return "已核对";
}

function eventTypeLabel(type: CoachWorkbench["event"]["type"]) {
  if (type === "match") return "比赛";
  if (type === "other") return "活动";
  return "训练";
}
