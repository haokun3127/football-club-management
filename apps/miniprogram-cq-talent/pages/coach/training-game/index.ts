import {
  createTrainingGame,
  getTrainingGame,
  getTrainingGames,
  saveTrainingGame,
} from "../../../utils/api";
import { formatDateTime } from "../../../utils/presentation";
import { requireRole } from "../../../utils/auth";
import { environmentStorageKey } from "../../../utils/config";
import { createRequestId } from "../../../utils/idempotency";
import {
  gameForm,
  gameReadMessage,
  gameScore,
  gameWrite,
  GAME_EVENT_LABELS,
  GAME_STATE_LABELS,
  type GameContext,
  type GameForm,
  type GameHistory,
  type GameSide,
  type GameState,
  type GameWrite,
  type TrainingGame,
} from "../../../utils/training-games";
import type { LoadState } from "../../../utils/types";

type InputEvent = {
  currentTarget: { dataset: { field?: string; id?: string } };
  detail: { value: string };
};
type Draft = {
  gameId: string;
  sourceId: string;
  revision: number;
  form: GameForm;
  createRequestId: string;
  pending: GameWrite | null;
  uncertain: boolean;
  conflict: boolean;
};
const eventTypes = ["goal", "assist", "save"] as const;
Page({
  data: {
    state: "loading" as LoadState,
    message: "正在读取课内友谊赛",
    error: "",
    eventId: "",
    gameId: "",
    sourceId: "",
    context: null as GameContext | null,
    game: null as TrainingGame | null,
    form: gameForm(),
    history: [] as Array<GameHistory & { label: string }>,
    readOnly: true,
    busy: false,
    conflict: false,
    uncertain: false,
    changed: false,
    sourceName: "",
    stateLabel: "草稿",
    primaryText: "完成记录",
    participantsExpanded: false,
    eventsExpanded: false,
    completionHint: "完成后家长可见自己孩子的记录",
    participantSearch: "",
    selectedParticipantsLabel: "尚未选择参赛学员",
    visibleRows: [] as Array<{
      studentId: string;
      name: string;
      sideIndex: number;
    }>,
    sideOptions: ["未参赛", "红队", "蓝队"],
    rows: [] as Array<{ studentId: string; name: string; sideIndex: number }>,
    eventRows: [] as Array<{ id: string; label: string; note: string }>,
    eventTypes: ["进球", "助攻", "扑救"],
    eventTypeIndex: 0,
    eventSideIndex: 0,
    eventStudentIndex: 0,
    eventMinute: "",
    eventNote: "",
    eventPlayers: [] as Array<{ studentId: string | null; name: string }>,
  },
  generation: 0,
  storageKey: "",
  createRequestId: "",
  pending: null as GameWrite | null,
  onLoad(query: {
    eventId?: string;
    gameId?: string;
    contentBlockId?: string;
  }) {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({
      eventId: query.eventId || "",
      gameId: query.gameId || "",
      sourceId: query.contentBlockId || "",
    });
    this.storageKey = session.userId
      ? `${environmentStorageKey("training-game-draft")}:${session.clubId}:${session.userId}:${query.eventId}:${query.gameId || query.contentBlockId}`
      : "";
    this.createRequestId = createRequestId();
    return this.load(true);
  },
  onUnload() {
    this.generation++;
  },
  async load(restore = false) {
    const generation = ++this.generation;
    this.setData({ state: "loading", error: "" });
    try {
      if (!this.data.eventId)
        throw new Error("缺少训练课，请从课堂或球队比赛记录进入");
      const context = await getTrainingGames(this.data.eventId);
      const stored =
        restore && this.storageKey
          ? wx.getStorageSync<Draft | "">(this.storageKey)
          : null;
      const draft = stored || null;
      const gameId = draft?.gameId || this.data.gameId;
      const detail = gameId
        ? await getTrainingGame(this.data.eventId, gameId)
        : null;
      if (generation !== this.generation) return;
      const game = detail?.game || null;
      const sourceId = game?.contentBlockId || this.data.sourceId;
      const source = context.sources.find(
        (item) => item.contentBlockId === sourceId,
      );
      if (!game && !source && !draft?.pending)
        throw new Error("来源内容已调整，请返回课程重新选择");
      const conflict = Boolean(
        draft &&
        (draft.conflict ||
          (game && draft.revision !== game.revision && !draft.uncertain)),
      );
      this.pending = draft?.pending || null;
      if (draft?.createRequestId) this.createRequestId = draft.createRequestId;
      const canEdit = context.canEdit && game?.state !== "voided";
      this.setData({
        state: "ready",
        context,
        gameId: game?.id || "",
        game,
        sourceId,
        sourceName:
          game?.contentSnapshot.name ||
          source?.contentSnapshot.name ||
          "原内容已调整",
        form: draft?.form || gameForm(game || undefined),
        readOnly: !canEdit,
        conflict,
        uncertain: !!draft?.uncertain,
        changed: !!draft,
        stateLabel: game ? GAME_STATE_LABELS[game.state] : "新建草稿",
        primaryText: game?.state === "completed" ? "保存修订" : "完成记录",
        completionHint: game?.state === "completed" ? "保存修订会更新已有可见记录；不改变训练计次" : "完成后家长可见自己孩子的记录",
        history: (detail?.history || []).map((item) => ({
          ...item,
          changedAt: formatDateTime(item.changedAt),
          label: `修订 ${item.revision} · ${GAME_STATE_LABELS[item.state]} · ${gameScore(item)} · ${item.eventCount} 条事件`,
        })),
        error: conflict
          ? "服务器记录已更新。本机修改已保留，请先核对最新版本。"
          : draft?.uncertain
            ? "上次提交结果尚未确认，请重试原提交或重新读取服务器记录。"
            : "",
      });
      this.refreshViews();
      return true;
    } catch (error) {
      if (generation === this.generation)
        this.setData({
          state: "error",
          message:
            error instanceof Error ? error.message : gameReadMessage(error),
        });
    }
  },
  refreshViews() {
    const { form, context, game } = this.data as {
      form: GameForm;
      context: GameContext | null;
      game: TrainingGame | null;
    };
    const available = [...(context?.participants || [])];
    for (const old of game?.participants || [])
      if (!available.some((item) => item.studentId === old.studentId))
        available.push({
          studentId: old.studentId,
          name: `${old.nameSnapshot}（已移出课程）`,
        });
    const names = new Map(available.map((item) => [item.studentId, item.name]));
    const side = this.data.eventSideIndex === 0 ? "A" : "B";
    const eventPlayers = [
      { studentId: null as string | null, name: "未关联学员" },
      ...form.participants
        .filter((item) => item.side === side)
        .map((item) => ({
          studentId: item.studentId,
          name: names.get(item.studentId) || "学员已不可用",
        })),
    ];
    const rows = available.map((item) => ({
      ...item,
      sideIndex:
        form.participants.find((player) => player.studentId === item.studentId)
          ?.side === "A"
          ? 1
          : form.participants.some(
                (player) => player.studentId === item.studentId,
              )
            ? 2
            : 0,
    }));
    this.setData({
      rows,
      visibleRows: rows.filter((item) =>
        item.name.includes(this.data.participantSearch),
      ),
      selectedParticipantsLabel:
        form.participants
          .map(
            (item) =>
              `${names.get(item.studentId) || "原学员"}（${item.side === "A" ? form.sideAName : form.sideBName}）`,
          )
          .join("、") || "尚未选择参赛学员",
      sideOptions: ["未参赛", form.sideAName || "A方", form.sideBName || "B方"],
      eventPlayers,
      eventStudentIndex: Math.min(
        this.data.eventStudentIndex,
        eventPlayers.length - 1,
      ),
      eventRows: form.events.map((item) => ({
        id: item.id,
        note: item.note,
        label: `${item.minute === null ? "时间未记" : `${item.minute}′`} · ${item.side === "A" ? form.sideAName : form.sideBName} · ${item.studentId ? names.get(item.studentId) || "原学员" : "未关联学员"} · ${GAME_EVENT_LABELS[item.type]}`,
      })),
    });
  },
  toggleEvents() { this.setData({eventsExpanded: !this.data.eventsExpanded}); },
  toggleParticipants() {
    this.setData({ participantsExpanded: !this.data.participantsExpanded });
  },
  searchParticipants(event: InputEvent) {
    this.setData({ participantSearch: event.detail.value.trim() });
    this.refreshViews();
  },
  editable() {
    return (
      !this.data.readOnly &&
      !this.data.busy &&
      !this.data.uncertain &&
      !this.data.conflict
    );
  },
  remember() {
    this.setData({ changed: true });
    if (!this.storageKey) return;
    const draft: Draft = {
      gameId: this.data.gameId,
      sourceId: this.data.sourceId,
      revision: this.data.game?.revision || 0,
      form: this.data.form,
      createRequestId: this.createRequestId,
      pending: this.pending,
      uncertain: this.data.uncertain,
      conflict: this.data.conflict,
    };
    try {
      wx.setStorageSync(this.storageKey, draft);
    } catch {
      this.setData({
        error: "本机空间不足，修改仅保留在当前页，请完成保存后再离开。",
      });
    }
  },
  editField(event: InputEvent) {
    const field = event.currentTarget.dataset.field;
    if (
      !this.editable() ||
      !field ||
      !["sideAName", "sideBName", "scoreA", "scoreB", "reason"].includes(field)
    )
      return;
    this.pending = null;
    this.setData({
      form: { ...this.data.form, [field]: event.detail.value },
      error: "",
    });
    this.refreshViews();
    this.remember();
  },
  selectParticipant(event: InputEvent) {
    if (!this.editable()) return;
    const id = event.currentTarget.dataset.id,
      index = Number(event.detail.value);
    if (
      !id ||
      !this.data.rows.some(
        (row: { studentId: string }) => row.studentId === id,
      ) ||
      ![0, 1, 2].includes(index)
    )
      return;
    if (
      this.data.form.events.some(
        (item: GameForm["events"][number]) => item.studentId === id,
      )
    ) {
      this.setData({ error: "请先移除该学员的已录事件，再调整参赛方。" });
      return;
    }
    const participants = this.data.form.participants.filter(
      (item: GameForm["participants"][number]) => item.studentId !== id,
    );
    if (index)
      participants.push({ studentId: id, side: index === 1 ? "A" : "B" });
    this.pending = null;
    this.setData({ form: { ...this.data.form, participants }, error: "" });
    this.refreshViews();
    this.remember();
  },
  editEvent(event: InputEvent) {
    if (!this.editable()) return;
    const field = event.currentTarget.dataset.field;
    if (field === "eventMinute" || field === "eventNote")
      this.setData({ [field]: event.detail.value });
    else if (
      field === "eventTypeIndex" ||
      field === "eventSideIndex" ||
      field === "eventStudentIndex"
    ) {
      const value = Number(event.detail.value);
      if (!Number.isInteger(value) || value < 0) return;
      if (
        (field === "eventTypeIndex" && value >= 3) ||
        (field === "eventSideIndex" && value >= 2) ||
        (field === "eventStudentIndex" &&
          value >= this.data.eventPlayers.length)
      )
        return;
      this.setData({
        [field]: value,
        ...(field === "eventSideIndex" ? { eventStudentIndex: 0 } : {}),
      });
      this.refreshViews();
    }
  },
  addEvent() {
    if (!this.editable()) return;
    const minute = this.data.eventMinute.trim();
    if (minute && (!/^\d+$/.test(minute) || Number(minute) > 300)) {
      this.setData({ error: "分钟须为0至300的整数或留空" });
      return;
    }
    const item = {
      id: createRequestId(),
      type: eventTypes[this.data.eventTypeIndex]!,
      side: (this.data.eventSideIndex === 0 ? "A" : "B") as GameSide,
      studentId:
        this.data.eventPlayers[this.data.eventStudentIndex]?.studentId || null,
      minute: minute ? Number(minute) : null,
      note: this.data.eventNote.trim(),
    };
    this.pending = null;
    this.setData({
      form: { ...this.data.form, events: [...this.data.form.events, item] },
      eventMinute: "",
      eventNote: "",
      error: "",
    });
    this.refreshViews();
    this.remember();
  },
  removeEvent(event: InputEvent) {
    if (!this.editable()) return;
    this.pending = null;
    this.setData({
      form: {
        ...this.data.form,
        events: this.data.form.events.filter(
          (item: GameForm["events"][number]) =>
            item.id !== event.currentTarget.dataset.id,
        ),
      },
    });
    this.refreshViews();
    this.remember();
  },
  async saveDraft() {
    return this.save("draft");
  },
  async complete() {
    return this.save("completed");
  },
  async voidGame() {
    return this.save("voided");
  },
  async save(state: GameState) {
    if (this.data.readOnly || this.data.busy || this.data.conflict) return;
    if (!this.data.uncertain && this.data.game?.state === "completed" && state === "draft") {
      this.setData({error:"已完成记录请使用保存修订，不能改回草稿。"}); return;
    }
    if (this.data.uncertain && this.pending) state = this.pending.state;
    this.setData({ busy: true });
    try {
      const payload =
        this.pending ||
        gameWrite(
          this.data.form,
          state,
          this.data.game?.revision || 1,
          createRequestId(),
        );
      if (
        !this.data.uncertain &&
        (this.data.game?.state === "completed" || state === "voided") &&
        !payload.reason
      )
        throw new Error("请填写修订或作废原因");
      if (!this.data.uncertain && state !== "draft") {
        const answer = await new Promise<{ confirm: boolean }>((resolve) =>
          wx.showModal({
            title: state === "voided" ? "作废记录" : this.data.game?.state === "completed" ? "确认保存修订" : "确认比赛记录",
            content:
              state === "voided"
                ? "记录将保留历史，并从家长结果中移除。"
                : this.data.game?.state === "completed"
                  ? "保存修订会更新已有可见记录，家长可查看修订后的比分和自己孩子的已记录事件；不会改变训练计次。"
                  : "完成后，家长可查看比分和自己孩子的已记录事件；不会改变训练计次。",
            success: resolve,
          }),
        );
        if (!answer.confirm) return;
      }
      this.setData({ busy: true, error: "" });
      this.pending = payload;
      this.remember();
      let game = this.data.game;
      if (!game) {
        const result = await createTrainingGame(this.data.eventId, {
          contentBlockId: this.data.sourceId,
          sideAName: payload.sideAName,
          sideBName: payload.sideBName,
          requestId: this.createRequestId,
        });
        game = result.game;
        this.setData({ game, gameId: game.id });
        this.pending = { ...payload, expectedRevision: game.revision };
        this.remember();
      }
      const result = await saveTrainingGame(
        this.data.eventId,
        game.id,
        this.pending!,
      );
      this.pending = null;
      this.setData({
        game: result.game,
        gameId: result.game.id,
        uncertain: false,
        conflict: false,
        changed: false,
      });
      if (this.storageKey) wx.removeStorageSync(this.storageKey);
      await this.load(false);
      wx.showToast({ title: "记录已保存", icon: "success" });
    } catch (error) {
      const status =
        error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
      const conflict = status === 409;
      const uncertain = !!this.pending && (status === 0 || status >= 500);
      if (!uncertain && !conflict) this.pending = null;
      this.setData({
        conflict,
        uncertain,
        error: conflict
          ? "服务器记录发生变化，本机修改已保留，请重新读取并核对。"
          : uncertain
            ? "提交结果尚未确认。修改已保留，请重试原提交，或重新读取服务器记录。"
            : error && typeof error === "object" && "message" in error
              ? String(error.message)
              : "保存失败，修改已保留",
      });
      this.remember();
    } finally {
      this.setData({ busy: false });
    }
  },
  async reloadServer() {
    if (this.data.busy) return;
    if (this.data.uncertain && !this.data.gameId) {
      this.setData({
        error: "创建结果尚未确认，请先重试原提交以核对同一场记录。",
      });
      return;
    }
    const answer = await new Promise<{ confirm: boolean }>((resolve) =>
      wx.showModal({
        title: "重新读取服务器记录",
        content: "将放弃本机未保存修改，并读取最新版本。是否继续？",
        success: resolve,
      }),
    );
    if (!answer.confirm) return;
    const loaded = await this.load(false);
    if (loaded && this.storageKey) wx.removeStorageSync(this.storageKey);
  },
  retry() {
    return this.load(true);
  },
});
