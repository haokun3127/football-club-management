import { getCoachWorkbench } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

type RosterItem = CoachWorkbench["roster"][number];

interface EventTypeChip {
  label: string;
  value: string;
}

const EVENT_TYPES: EventTypeChip[] = [
  { label: "进球", value: "goal" },
  { label: "助攻", value: "assist" },
  { label: "黄牌", value: "yellow_card" },
  { label: "红牌", value: "red_card" },
  { label: "换人", value: "substitution" },
  { label: "扑救", value: "save" },
];

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取名单",
    eventTypes: EVENT_TYPES,
    activeType: "goal",
    roster: [] as Array<{ studentId: string; name: string }>,
    playerNames: [] as string[],
    playerIndex: 0,
    minute: "",
    note: "",
    eventId: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    requireRole("coach");
    this.setData({ eventId: query?.eventId || "" });
    this.load(query?.eventId || "");
  },
  async load(eventId: string) {
    try {
      const workbench = await getCoachWorkbench(eventId);
      const roster = workbench.roster.map((student: RosterItem) => ({ studentId: student.studentId, name: student.name }));
      this.setData({
        state: roster.length ? "ready" : "empty",
        message: roster.length ? "" : "当前活动没有可选择球员。",
        roster,
        playerNames: roster.map((student) => student.name),
      });
    } catch (error) {
      this.setData({ state: "error", message: error instanceof Error ? error.message : "名单读取失败。" });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
  selectType(event: { currentTarget: { dataset: { value: string } } }) {
    this.setData({ activeType: event.currentTarget.dataset.value });
  },
  onPlayerChange(event: { detail: { value: string | number } }) {
    this.setData({ playerIndex: Number(event.detail.value) });
  },
  onMinuteInput(event: { detail: { value: string } }) {
    this.setData({ minute: event.detail.value });
  },
  onNoteInput(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value });
  },
  saveEvent() {
    const student = this.data.roster[this.data.playerIndex];
    const type = EVENT_TYPES.find((item) => item.value === this.data.activeType) ?? EVENT_TYPES[0]!;
    if (!student) {
      wx.showToast({ title: "请选择球员", icon: "none" });
      return;
    }
    const minute = Number(this.data.minute);
    const eventPayload = {
      type: type.value,
      studentId: student.studentId,
      studentName: student.name,
      minute: Number.isFinite(minute) && this.data.minute.trim() ? minute : undefined,
      note: this.data.note.trim() || undefined,
      label: `${type.label}｜${student.name}${this.data.minute.trim() ? `｜${this.data.minute.trim()}'` : ""}`,
    };
    const channel = this.getOpenerEventChannel?.();
    if (channel && typeof channel.emit === "function") {
      channel.emit("acceptMatchEvent", eventPayload);
      wx.navigateBack({ delta: 1 });
      return;
    }
    wx.showToast({ title: "请从比赛页进入添加事件", icon: "none" });
  },
});
