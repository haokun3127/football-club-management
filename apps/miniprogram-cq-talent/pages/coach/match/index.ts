import { getCoachWorkbench, recordCoachMatch } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachWorkbench, LoadState } from "../../../utils/types";

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

Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取比赛上下文",
    workbench: null as CoachWorkbench | null,
    eventId: "",
    saving: false,
    matchTypes,
    statuses,
    matchTypeIndex: 0,
    statusIndex: 0,
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
  onTextInput(event: { currentTarget: { dataset: Record<string, unknown> }; detail: { value: string | number } }) {
    const field = event.currentTarget.dataset.field as "opponentName" | "homeScore" | "awayScore" | undefined;
    if (!field) return;
    this.setData({ [field]: String(event.detail.value) });
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
