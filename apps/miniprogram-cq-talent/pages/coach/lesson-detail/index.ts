import { getCoachLessonConfirmation, getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { openPage } from "../../../utils/navigation";
import { formatCalendarDate, formatTimeRange } from "../../../utils/presentation";
import type { CoachLessonConfirmation, CoachWorkbench, LoadState, TrainingProject } from "../../../utils/types";

type DetailRow = {
  studentId: string;
  name: string;
  avatarLetter: string;
  lessonLabel: string;
};

interface PageData {
  state: LoadState;
  statusTitle: string;
  statusAction: string;
  message: string;
  eventId: string;
  eventTitle: string;
  eventPrimaryMeta: string;
  eventSecondaryMeta: string;
  rosterCount: number;
  rosterStatusLabel: string;
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
    eventPrimaryMeta: "",
    eventSecondaryMeta: "",
    rosterCount: 0,
    rosterStatusLabel: "",
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
        eventPrimaryMeta: "",
        eventSecondaryMeta: "",
        rosterCount: 0,
        rosterStatusLabel: "",
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
      eventPrimaryMeta: "",
      eventSecondaryMeta: "",
      rosterCount: 0,
      rosterStatusLabel: "",
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
      const eventTeam = workbench.event.teamName || "队伍待同步";
      const eventVenue = workbench.event.venue || "场地待同步";
      const eventDate = formatCalendarDate(workbench.event.startsAt);
      const eventTime = formatTimeRange(workbench.event.startsAt, workbench.event.endsAt);
      this.setData({
        state: rows.length ? "ready" : "empty",
        statusTitle: rows.length ? "" : "暂无销课学员",
        statusAction: "",
        message: rows.length ? "" : "当前活动没有可展示的销课学员。",
        eventId,
        eventTitle: `${eventTypeLabel(workbench.event.type)}课 · 销课详情`,
        eventPrimaryMeta: `${eventTeam} · ${eventDate}`,
        eventSecondaryMeta: `${eventTime} · ${eventVenue}`,
        rosterCount: rows.length,
        rosterStatusLabel: `${rows.length} 名学员 · 已完成`,
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
        eventPrimaryMeta: "",
        eventSecondaryMeta: "",
        rosterCount: 0,
        rosterStatusLabel: "",
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

  openTrainingContent() {
    if (this.data.eventId) openPage(`/pages/coach/content-select/index?eventId=${encodeURIComponent(this.data.eventId)}`);
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
      lessonLabel: typeof balance === "number" ? `${balance}课时 · 已确认` : "课时余额待核对",
    });
  }
  return rows;
}

function eventTypeLabel(type: CoachWorkbench["event"]["type"]) {
  if (type === "match") return "比赛";
  if (type === "other") return "活动";
  return "训练";
}
