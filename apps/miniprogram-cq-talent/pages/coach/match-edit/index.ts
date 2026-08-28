import { getCoachMatchDetail, recordCoachMatch } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { CoachMatchDetail, LoadState } from "../../../utils/types";

type Option = { value: string; label: string };

interface MatchEditPageData {
  state: LoadState;
  message: string;
  retryLabel: string;
  eventId: string;
  matchId: string;
  eventTitle: string;
  teamName: string;
  matchType: string;
  matchTypeIndex: number;
  matchTypes: Option[];
  status: string;
  statusIndex: number;
  statuses: Option[];
  opponentName: string;
  homeScore: string;
  awayScore: string;
  submitting: boolean;
  hasSaveError: boolean;
  saveError: string;
}

const MATCH_TYPES: Option[] = [
  { value: "friendly", label: "友谊赛" },
  { value: "league", label: "联赛" },
  { value: "cup", label: "杯赛" },
  { value: "internal", label: "队内赛" },
];

const STATUSES: Option[] = [
  { value: "scheduled", label: "待比赛" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

Page<MatchEditPageData>({
  data: {
    state: "idle",
    message: "",
    retryLabel: "",
    eventId: "",
    matchId: "",
    eventTitle: "",
    teamName: "",
    matchType: "friendly",
    matchTypeIndex: 0,
    matchTypes: MATCH_TYPES,
    status: "scheduled",
    statusIndex: 0,
    statuses: STATUSES,
    opponentName: "",
    homeScore: "",
    awayScore: "",
    submitting: false,
    hasSaveError: false,
    saveError: "",
  },

  onLoad(query?: Record<string, string | undefined>) {
    if (!requireRole("coach")) return;
    return this.load(query?.eventId || "");
  },

  async load(eventId: string) {
    if (!eventId) {
      this.setData(errorState("缺少活动 ID", ""));
      return false;
    }

    this.setData({
      state: "loading",
      message: "正在读取比赛信息",
      retryLabel: "",
      eventId,
      hasSaveError: false,
      saveError: "",
    });

    try {
      const detail = await getCoachMatchDetail(eventId);
      if (detail.event.id !== eventId) throw new Error("Match event mismatch");
      const match = detail.match;
      const matchType = optionValue(MATCH_TYPES, match?.matchType, "friendly");
      const status = optionValue(STATUSES, match?.status || detail.event.status, "scheduled");
      this.setData({
        state: "ready",
        message: "",
        retryLabel: "",
        eventId,
        matchId: match?.id || "",
        eventTitle: detail.event.title,
        teamName: detail.event.teamName || "",
        matchType,
        matchTypeIndex: optionIndex(MATCH_TYPES, matchType),
        status,
        statusIndex: optionIndex(STATUSES, status),
        opponentName: match?.opponentName || "",
        homeScore: numberInput(match?.homeScore),
        awayScore: numberInput(match?.awayScore),
        submitting: false,
        hasSaveError: false,
        saveError: "",
      });
      return true;
    } catch {
      this.setData(errorState("比赛信息读取失败，请稍后重试。", eventId));
      return false;
    }
  },

  retry() {
    return this.load(this.data.eventId);
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },

  onOpponentInput(event: { detail: { value: string } }) {
    this.setData({ opponentName: event.detail.value, hasSaveError: false, saveError: "" });
  },

  onHomeScoreInput(event: { detail: { value: string } }) {
    this.setData({ homeScore: event.detail.value, hasSaveError: false, saveError: "" });
  },

  onAwayScoreInput(event: { detail: { value: string } }) {
    this.setData({ awayScore: event.detail.value, hasSaveError: false, saveError: "" });
  },

  onMatchTypeChange(event: { detail: { value: string | number } }) {
    const index = optionPickerIndex(MATCH_TYPES, event.detail.value);
    const option = MATCH_TYPES[index];
    if (!option) return;
    this.setData({ matchTypeIndex: index, matchType: option.value, hasSaveError: false, saveError: "" });
  },

  onStatusChange(event: { detail: { value: string | number } }) {
    const index = optionPickerIndex(STATUSES, event.detail.value);
    const option = STATUSES[index];
    if (!option) return;
    this.setData({ statusIndex: index, status: option.value, hasSaveError: false, saveError: "" });
  },

  async save() {
    if (this.data.submitting) return;
    const input = buildInput(this.data);
    if (!input.ok) {
      this.setData({ hasSaveError: true, saveError: input.message });
      return;
    }

    this.setData({ submitting: true, hasSaveError: false, saveError: "" });
    try {
      await recordCoachMatch(input.value);
      const readback = await getCoachMatchDetail(this.data.eventId);
      if (!matchesInput(readback, input.value)) throw new Error("Match readback mismatch");
      wx.showToast({ title: "比赛记录已保存", icon: "success" });
      wx.navigateBack({ delta: 1 });
    } catch {
      this.setData({ submitting: false, hasSaveError: true, saveError: "比赛记录尚未确认保存，请重试。" });
    }
  },
});

function buildInput(data: MatchEditPageData): { ok: true; value: Parameters<typeof recordCoachMatch>[0] } | { ok: false; message: string } {
  const home = parseScore(data.homeScore);
  const away = parseScore(data.awayScore);
  if (home === null || away === null) return { ok: false, message: "比分必须是 0 到 99 的整数。" };
  if ((home === undefined) !== (away === undefined)) return { ok: false, message: "请同时填写主队和对手比分。" };
  if (data.status === "completed" && (home === undefined || away === undefined)) return { ok: false, message: "已完成比赛必须填写完整比分。" };
  if (data.status === "cancelled" && (home !== undefined || away !== undefined)) return { ok: false, message: "已取消比赛不能填写比分。" };
  const opponentName = data.opponentName.trim();
  return {
    ok: true,
    value: {
      eventId: data.eventId,
      ...(data.matchId ? { matchId: data.matchId } : {}),
      matchType: data.matchType,
      status: data.status,
      ...(opponentName ? { opponentName } : {}),
      ...(home === undefined ? {} : { homeScore: home, awayScore: away }),
    },
  };
}

function matchesInput(detail: CoachMatchDetail, input: Parameters<typeof recordCoachMatch>[0]) {
  const match = detail.match;
  if (!match || match.eventId && match.eventId !== input.eventId) return false;
  return match.matchType === input.matchType
    && match.status === input.status
    && (match.opponentName || "") === (input.opponentName || "")
    && match.homeScore === input.homeScore
    && match.awayScore === input.awayScore;
}

function parseScore(value: string): number | undefined | null {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!/^(0|[1-9]\d*)$/.test(normalized)) return null;
  const score = Number(normalized);
  return score >= 0 && score <= 99 ? score : null;
}

function optionValue(options: Option[], value: string | undefined, fallback: string) {
  return options.some((option) => option.value === value) ? value! : fallback;
}

function optionIndex(options: Option[], value: string) {
  const index = options.findIndex((option) => option.value === value);
  return index >= 0 ? index : 0;
}

function optionPickerIndex(options: Option[], value: string | number) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  const index = options.findIndex((option) => option.value === String(value));
  return index >= 0 ? index : -1;
}

function numberInput(value: number | undefined) {
  return typeof value === "number" ? String(value) : "";
}

function errorState(message: string, eventId: string): Partial<MatchEditPageData> {
  return {
    state: "error",
    message,
    retryLabel: eventId ? "重新读取" : "",
    eventId,
    matchId: "",
    eventTitle: "",
    teamName: "",
    opponentName: "",
    homeScore: "",
    awayScore: "",
    submitting: false,
    hasSaveError: false,
    saveError: "",
  };
}
