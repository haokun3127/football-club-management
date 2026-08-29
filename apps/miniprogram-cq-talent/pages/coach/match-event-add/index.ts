import { createCoachMatchEvent, getCoachMatchDetail } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { createIdempotencyKey } from "../../../utils/idempotency";
import { clearMatchEventDraft, isMatchEventDraftType, loadMatchEventDraft, saveMatchEventDraft } from "../../../utils/match-event-draft";
import type { CoachMatchEventCreateInput, CoachMatchPlayerEvent, LoadState } from "../../../utils/types";

type EventTypeOption = { value: CoachMatchPlayerEvent["type"]; label: string };
type RosterOption = { studentId: string; name: string };

interface MatchEventAddPageData {
  state: LoadState;
  message: string;
  retryLabel: string;
  eventId: string;
  eventTypes: EventTypeOption[];
  activeType: CoachMatchPlayerEvent["type"] | "";
  roster: RosterOption[];
  playerNames: string[];
  playerIndex: number;
  selectedPlayerName: string;
  minute: string;
  note: string;
  submitting: boolean;
  hasSubmitError: boolean;
  submitError: string;
  operationKey: string;
}

let loadToken = 0;

Page<MatchEventAddPageData>({
  data: {
    state: "loading",
    message: "正在读取比赛信息",
    retryLabel: "",
    eventId: "",
    eventTypes: [],
    activeType: "",
    roster: [],
    playerNames: [],
    playerIndex: 0,
    selectedPlayerName: "",
    minute: "",
    note: "",
    submitting: false,
    hasSubmitError: false,
    submitError: "",
    operationKey: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    const session = requireRole("coach");
    if (!session) return;
    return this.load(query?.eventId || "", session.capabilities?.match?.eventTypes);
  },
  async load(eventId: string, capabilityTypes?: string[]) {
    if (!eventId) {
      this.setData(emptyState("缺少活动 ID"));
      return;
    }

    const requestToken = ++loadToken;
    const eventTypes = toEventTypeOptions(capabilityTypes);
    this.setData({
      ...emptyState("正在读取比赛信息"),
      state: "loading",
      eventId,
      eventTypes,
    });

    try {
      const detail = await getCoachMatchDetail(eventId);
      if (requestToken !== loadToken) return;
      const roster = toRosterOptions(detail.roster);
      if (!detail.match || detail.event.id !== eventId) {
        this.setData({ ...emptyState("当前活动没有可记录的比赛信息"), eventId, eventTypes });
        return;
      }
      if (!roster.length) {
        this.setData({ ...emptyState("当前比赛没有可记录的名单"), eventId, eventTypes });
        return;
      }
      if (!eventTypes.length) {
        this.setData({ ...emptyState("当前客户端未配置可记录的比赛事件类型"), eventId, roster, playerNames: roster.map((student) => student.name), selectedPlayerName: roster[0]!.name });
        return;
      }

      this.setData({
        state: "ready",
        message: "",
        retryLabel: "",
        eventId,
        eventTypes,
        activeType: eventTypes[0]!.value,
        roster,
        playerNames: roster.map((student) => student.name),
        playerIndex: 0,
        selectedPlayerName: roster[0]!.name,
        hasSubmitError: false,
        submitError: "",
        operationKey: "",
      });
      this.restoreLocalDraft(eventId);
    } catch {
      if (requestToken !== loadToken) return;
      this.setData({
        ...emptyState("比赛信息读取失败，请稍后重试"),
        state: "error",
        retryLabel: "重新读取",
        eventId,
        eventTypes,
      });
    }
  },
  retry() {
    const session = requireRole("coach");
    if (!session) return;
    return this.load(this.data.eventId, session.capabilities?.match?.eventTypes);
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  selectType(event: { currentTarget: { dataset: { value?: string } } }) {
    const next = this.data.eventTypes.find((item: EventTypeOption) => item.value === event.currentTarget.dataset.value);
    if (!next || next.value === this.data.activeType) return;
    this.setData({ activeType: next.value, operationKey: "", hasSubmitError: false, submitError: "" });
    this.syncLocalDraft();
  },
  onPlayerChange(event: { detail: { value: string | number } }) {
    const playerIndex = Number(event.detail.value);
    const player = this.data.roster[playerIndex];
    if (!Number.isInteger(playerIndex) || !player) return;
    this.setData({ playerIndex, selectedPlayerName: player.name, operationKey: "", hasSubmitError: false, submitError: "" });
    this.syncLocalDraft();
  },
  onMinuteInput(event: { detail: { value: string } }) {
    this.setData({ minute: event.detail.value, operationKey: "", hasSubmitError: false, submitError: "" });
    this.syncLocalDraft();
  },
  onNoteInput(event: { detail: { value: string } }) {
    this.setData({ note: event.detail.value, operationKey: "", hasSubmitError: false, submitError: "" });
    this.syncLocalDraft();
  },
  restoreLocalDraft(eventId: string) {
    const draft = loadMatchEventDraft(eventId);
    if (!draft) return;
    const playerIndex = this.data.roster.findIndex((player: RosterOption) => player.studentId === draft.studentId);
    const eventType = this.data.eventTypes.find((item: EventTypeOption) => item.value === draft.type);
    if (playerIndex < 0 || !eventType) return;

    this.setData({
      activeType: eventType.value,
      playerIndex,
      selectedPlayerName: this.data.roster[playerIndex]!.name,
      minute: draft.minute === undefined ? "" : String(draft.minute),
      note: draft.note || "",
      operationKey: "",
      hasSubmitError: false,
      submitError: "",
    });
  },
  syncLocalDraft() {
    if (this.data.state !== "ready") return;
    const input = toCreateInput(this.data);
    if (!input.ok) return;
    if (!isMateriallyModified(this.data, input.value)) {
      clearMatchEventDraft(this.data.eventId);
      return;
    }

    saveMatchEventDraft({
      eventId: this.data.eventId,
      ...input.value,
      updatedAt: new Date().toISOString(),
    });
  },
  async saveEvent() {
    if (this.data.submitting) return;
    const input = toCreateInput(this.data);
    if (!input.ok) {
      this.setData({ hasSubmitError: true, submitError: input.message, submitting: false });
      return;
    }

    const operationKey = this.data.operationKey || createIdempotencyKey("match-event");
    this.setData({ submitting: true, hasSubmitError: false, submitError: "", operationKey });
    try {
      const result = await createCoachMatchEvent(this.data.eventId, input.value, operationKey);
      if (!result.event?.id || result.event.studentId !== input.value.studentId || result.event.type !== input.value.type) {
        throw new Error("Match event response was incomplete");
      }
      clearMatchEventDraft(this.data.eventId);
      wx.navigateBack({ delta: 1 });
    } catch {
      this.setData({
        submitting: false,
        hasSubmitError: true,
        submitError: "比赛事件暂未保存，请确认后手动重试",
      });
    }
  },
});

function emptyState(message: string): Omit<MatchEventAddPageData, "state" | "eventId" | "eventTypes"> {
  return {
    message,
    retryLabel: "",
    activeType: "",
    roster: [],
    playerNames: [],
    playerIndex: 0,
    selectedPlayerName: "",
    minute: "",
    note: "",
    submitting: false,
    hasSubmitError: false,
    submitError: "",
    operationKey: "",
  };
}

function toEventTypeOptions(values: string[] | undefined): EventTypeOption[] {
  const seen = new Set<CoachMatchPlayerEvent["type"]>();
  const options: EventTypeOption[] = [];
  for (const value of values ?? []) {
    if (!isMatchEventType(value) || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: eventTypeLabel(value) });
  }
  return options;
}

function toRosterOptions(roster: Array<{ studentId: string; name?: string }>): RosterOption[] {
  const seen = new Set<string>();
  const options: RosterOption[] = [];
  for (const student of roster) {
    if (!student.studentId || seen.has(student.studentId)) continue;
    seen.add(student.studentId);
    options.push({ studentId: student.studentId, name: student.name || "学员信息待同步" });
  }
  return options;
}

function toCreateInput(data: MatchEventAddPageData): { ok: true; value: CoachMatchEventCreateInput } | { ok: false; message: string } {
  const student = data.roster[data.playerIndex];
  if (!data.eventId || !student || !data.activeType) {
    return { ok: false, message: "请先选择可记录的球员和事件类型" };
  }
  const minute = parseMinute(data.minute);
  if (minute === null) {
    return { ok: false, message: "分钟必须是 0 到 300 的整数" };
  }
  const note = data.note.trim();
  if (note.length > 500) {
    return { ok: false, message: "备注不能超过 500 个字符" };
  }
  return {
    ok: true,
    value: {
      studentId: student.studentId,
      type: data.activeType,
      ...(minute === undefined ? {} : { minute }),
      ...(note ? { note } : {}),
    },
  };
}

function parseMinute(value: string): number | undefined | null {
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (!/^(0|[1-9]\d*)$/.test(normalized)) return null;
  const minute = Number(normalized);
  return minute >= 0 && minute <= 300 ? minute : null;
}

function isMatchEventType(value: string): value is CoachMatchPlayerEvent["type"] {
  return isMatchEventDraftType(value);
}

function isMateriallyModified(data: MatchEventAddPageData, input: CoachMatchEventCreateInput) {
  return input.studentId !== data.roster[0]?.studentId
    || input.type !== data.eventTypes[0]?.value
    || input.minute !== undefined
    || input.note !== undefined;
}

function eventTypeLabel(value: CoachMatchPlayerEvent["type"]) {
  const labels: Record<CoachMatchPlayerEvent["type"], string> = {
    goal: "进球",
    assist: "助攻",
    save: "扑救",
    tackle: "抢断",
    foul: "犯规",
    yellow_card: "黄牌",
    red_card: "红牌",
    penalty: "点球",
    own_goal: "乌龙球",
  };
  return labels[value];
}
