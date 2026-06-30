import { getCoachWorkbench, recordCoachMatch } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachMatchPlayerEvent, CoachWorkbench, LoadState } from "../../../utils/types";

const matchTypes = [
  { label: "友谊赛", value: "friendly" },
  { label: "联赛", value: "league" },
  { label: "杯赛", value: "cup" },
  { label: "队内赛", value: "internal" },
];

const statuses = [
  { label: "已完成", value: "completed" },
  { label: "待比赛", value: "scheduled" },
  { label: "已取消", value: "cancelled" },
];

const playerEventTypes: Array<{ label: string; value: CoachMatchPlayerEvent["type"] }> = [
  { label: "进球", value: "goal" },
  { label: "助攻", value: "assist" },
  { label: "扑救", value: "save" },
  { label: "抢断", value: "tackle" },
  { label: "黄牌", value: "yellow_card" },
  { label: "红牌", value: "red_card" },
  { label: "点球", value: "penalty" },
  { label: "乌龙", value: "own_goal" },
];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取比赛上下文",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
    matchTypes,
    statuses,
    playerEventTypes,
    matchTypeIndex: 0,
    statusIndex: 0,
    playerEventTypeIndex: 0,
    studentIndex: 0,
    assistStudentIndex: 0,
    eventMinute: "",
    eventNote: "",
    playerEvents: [] as Array<CoachMatchPlayerEvent & { studentName: string; assistStudentName?: string; label: string }>,
    opponentName: "",
    homeScore: "",
    awayScore: "",
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
  onMatchTypeChange(event: { detail: { value: string | number } }) {
    this.setData({ matchTypeIndex: Number(event.detail.value) });
  },
  onStatusChange(event: { detail: { value: string | number } }) {
    this.setData({ statusIndex: Number(event.detail.value) });
  },
  onPlayerEventTypeChange(event: { detail: { value: string | number } }) {
    this.setData({ playerEventTypeIndex: Number(event.detail.value) });
  },
  onStudentChange(event: { detail: { value: string | number } }) {
    this.setData({ studentIndex: Number(event.detail.value) });
  },
  onAssistStudentChange(event: { detail: { value: string | number } }) {
    this.setData({ assistStudentIndex: Number(event.detail.value) });
  },
  onTextInput(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string | number } }) {
    const field = event.currentTarget.dataset.field as "opponentName" | "homeScore" | "awayScore" | "eventMinute" | "eventNote" | undefined;
    if (!field) return;
    this.setData({ [field]: String(event.detail.value) });
  },
  addPlayerEvent() {
    const roster = this.data.workbench?.roster ?? [];
    const student = roster[this.data.studentIndex];
    const assistStudent = roster[this.data.assistStudentIndex];
    const eventType = playerEventTypes[this.data.playerEventTypeIndex] ?? playerEventTypes[0];
    if (!student?.studentId || !eventType) {
      wx.showToast({ title: "请选择球员", icon: "none" });
      return;
    }
    const minute = numberOrUndefined(this.data.eventMinute);
    const newEvent = {
      type: eventType.value,
      studentId: student.studentId,
      studentName: student.name,
      assistStudentId: eventType.value === "goal" ? assistStudent?.studentId : undefined,
      assistStudentName: eventType.value === "goal" ? assistStudent?.name : undefined,
      minute,
      note: emptyToUndefined(this.data.eventNote),
      label: `${eventType.label}｜${student.name}${minute === undefined ? "" : `｜${minute}'`}`,
    };
    this.setData({
      playerEvents: [...this.data.playerEvents, newEvent],
      eventMinute: "",
      eventNote: "",
    });
  },
  removePlayerEvent(event: { currentTarget: { dataset: Record<string, unknown> } }) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isFinite(index)) return;
    this.setData({ playerEvents: this.data.playerEvents.filter((_: unknown, itemIndex: number) => itemIndex !== index) });
  },
  async saveMatch() {
    if (!this.data.eventId || this.data.saving) return;
    this.setData({ saving: true });
    try {
      await recordCoachMatch({
        eventId: this.data.eventId,
        matchType: matchTypes[this.data.matchTypeIndex]?.value ?? "friendly",
        status: statuses[this.data.statusIndex]?.value ?? "completed",
        opponentName: emptyToUndefined(this.data.opponentName),
        homeScore: numberOrUndefined(this.data.homeScore),
        awayScore: numberOrUndefined(this.data.awayScore),
        events: expandMatchEvents(this.data.playerEvents),
      });
      wx.showToast({ title: "比赛摘要已保存", icon: "success" });
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
  return record?.message || record?.code || "比赛上下文读取失败。";
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberOrUndefined(value: string) {
  if (!value.trim()) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function expandMatchEvents(events: Array<CoachMatchPlayerEvent & { studentName: string; assistStudentName?: string; label: string }>): CoachMatchPlayerEvent[] {
  const result: CoachMatchPlayerEvent[] = [];
  events.forEach((event) => {
    result.push({
      type: event.type,
      studentId: event.studentId,
      minute: event.minute,
      note: event.note,
    });
    if (event.type === "goal" && event.assistStudentId && event.assistStudentId !== event.studentId) {
      result.push({
        type: "assist",
        studentId: event.assistStudentId,
        minute: event.minute,
        note: event.assistStudentName ? `助攻给 ${event.studentName}` : "进球助攻",
      });
    }
  });
  return result;
}
