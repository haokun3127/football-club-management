import { getCoachTacticalBoard, saveCoachTacticalBoard } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { environmentStorageKey } from "../../../utils/config";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import type { LoadState, TacticalBoardPlayer, TacticalBoardState } from "../../../utils/types";

const timers = globalThis as unknown as {
  setTimeout(callback: () => void, milliseconds: number): number;
  clearTimeout(timer?: number): void;
};
const setTimeout = (callback: () => void, milliseconds: number) => timers.setTimeout(callback, milliseconds);
const clearTimeout = (timer?: number) => timers.clearTimeout(timer);

type Rect = { left: number; top: number; width: number; height: number };
type Touch = { clientX: number; clientY: number };
type Gesture = { currentTarget: { dataset: { id?: string } }; touches?: Touch[]; changedTouches?: Touch[] };
type PlayerView = TacticalBoardPlayer & { left: number; top: number };
interface BoardData {
  navInset: number; menuInset: number; state: LoadState; stateTitle: string; message: string;
  eventId: string; eventTitle: string; players: TacticalBoardPlayer[]; starters: PlayerView[];
  rosterPlayers: PlayerView[]; readOnly: boolean; dirty: boolean; saving: boolean;
  saveLabel: string; saveError: string; canUndo: boolean; dragId: string; dragName: string;
  dragAvatar: string; dragX: number; dragY: number; rosterTarget: boolean;
}
interface Runtime {
  epoch: number; revision: number; alive: boolean; hidden: boolean; saving?: boolean; pitch?: Rect; roster?: Rect;
  saveTimer?: ReturnType<typeof setTimeout>; undo?: TacticalBoardPlayer[];
  draftKey?: string;
  drag?: { id: string; x: number; y: number; renderedAt: number };
}
const runtimes = new WeakMap<object, Runtime>();
function runtime(page: object) {
  let value = runtimes.get(page);
  if (!value) { value = { epoch: 0, revision: 0, alive: true, hidden: false }; runtimes.set(page, value); }
  return value;
}
const copy = (players: TacticalBoardPlayer[]) => players.map((player) => ({ ...player }));
const inside = (rect: Rect | undefined, x: number, y: number) => Boolean(rect && x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height);

Page<BoardData>({
  data: {
    navInset: 20, menuInset: 16, state: "idle", stateTitle: "比赛战术板", message: "", eventId: "", eventTitle: "",
    players: [], starters: [], rosterPlayers: [], readOnly: false, dirty: false, saving: false,
    saveLabel: "已保存", saveError: "", canUndo: false, dragId: "", dragName: "", dragAvatar: "", dragX: 0, dragY: 0, rosterTarget: false,
  },
  onLoad(query?: Record<string, string | undefined>) {
    const session = requireRole("coach");
    if (!session) return;
    this.setData({ navInset: resolveNavInset(), menuInset: resolveMenuInset() });
    const eventId = (query?.eventId || "").trim();
    if (!eventId) { this.setData({ state: "empty", stateTitle: "未选择比赛", message: "请从比赛活动进入战术板。" }); return; }
    if (session.userId && session.clubId) runtime(this).draftKey = environmentStorageKey(`tactical-draft:${session.clubId}:${session.userId}:${eventId}`);
    return this.load(eventId);
  },
  onShow() { runtime(this).hidden = false; },
  onReady() { this.measureRegions(); },
  onResize() { this.cancelDrag(); this.measureRegions(); },
  onHide() { const state = runtime(this); state.hidden = true; clearTimeout(state.saveTimer); this.cancelDrag(); void this.saveBoard(); },
  onUnload() {
    const state = runtime(this); clearTimeout(state.saveTimer);
    void this.saveBoard(); state.alive = false;
  },
  goBack() { void this.saveBoard(); wx.navigateBack({ delta: 1 }); },
  async load(eventId?: string) {
    const id = eventId || this.data.eventId;
    if (!id) return;
    const state = runtime(this); const epoch = ++state.epoch;
    this.setData({ state: "loading", stateTitle: "正在载入战术板", message: "", eventId: id });
    try {
      const response = await getCoachTacticalBoard(id);
      if (!state.alive || epoch !== state.epoch) return;
      if (response.event.id !== id) throw new Error("Mismatched event");
      state.undo = undefined; state.revision = 0;
      let players = presentPlayers(response);
      const draft = !response.readOnly && state.draftKey ? readDraft(state.draftKey) : null;
      if (draft) players = players.map((player) => ({ ...player, ...draft.find((item) => item.studentId === player.studentId) }));
      this.setData({ state: "ready", eventTitle: response.event.title, players, readOnly: response.readOnly, dirty: Boolean(draft), saving: false, canUndo: false,
        saveError: draft ? "已恢复上次未保存的布置，请核对后重试保存。" : "", saveLabel: response.readOnly ? "只读" : draft ? "未保存" : "已保存" });
      this.refreshViews(); wx.nextTick(() => this.measureRegions());
    } catch {
      if (state.alive && epoch === state.epoch) this.setData({ state: "error", stateTitle: "读取失败", message: "战术板暂不可用，请稍后重试。" });
    }
  },
  measureRegions() {
    const state = runtime(this);
    if (!state.alive || this.data.state !== "ready") return;
    const selector = wx as unknown as { createSelectorQuery(): { select(selector: string): { boundingClientRect(callback: (rect?: Rect) => void): { exec(): void } } } };
    for (const [id, key] of [["#c7-pitch", "pitch"], ["#c7-roster", "roster"]] as const) {
      selector.createSelectorQuery().select(id).boundingClientRect((rect) => { if (state.alive && rect) state[key] = rect; }).exec();
    }
  },
  refreshViews() {
    const views = this.data.players.map((player: TacticalBoardPlayer) => ({ ...player, left: player.x * 100, top: player.y * 100 }));
    this.setData({ starters: views.filter((p: PlayerView) => p.role === "starter"), rosterPlayers: views.filter((p: PlayerView) => p.role !== "starter") });
  },
  startPlayerDrag(event: Gesture) { this.startDrag(event); },
  startRosterDrag(event: Gesture) { this.startDrag(event); },
  startDrag(event: Gesture) {
    if (this.data.readOnly || this.data.state !== "ready") return;
    const player = this.data.players.find((p: TacticalBoardPlayer) => p.studentId === event.currentTarget.dataset.id);
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (!player || !touch) return;
    runtime(this).drag = { id: player.studentId, x: touch.clientX, y: touch.clientY, renderedAt: 0 };
    this.setData({ dragId: player.studentId, dragName: player.displayName, dragAvatar: player.avatarUrl || "", dragX: touch.clientX, dragY: touch.clientY, rosterTarget: false });
  },
  movePlayer(event: Gesture) {
    const state = runtime(this); const drag = state.drag; const touch = event.touches?.[0];
    if (!drag || !touch || this.data.readOnly) return;
    drag.x = touch.clientX; drag.y = touch.clientY;
    const now = Date.now();
    if (now - drag.renderedAt < 32) return;
    drag.renderedAt = now;
    this.setData({ dragX: drag.x, dragY: drag.y, rosterTarget: inside(state.roster, drag.x, drag.y) });
  },
  finishDrag(event: Gesture) {
    const state = runtime(this); const drag = state.drag;
    if (!drag || this.data.readOnly) return;
    const point = event.changedTouches?.[0]; const x = point?.clientX ?? drag.x; const y = point?.clientY ?? drag.y;
    const pitch = state.pitch;
    const onPitch = inside(pitch, x, y); const onRoster = inside(state.roster, x, y);
    if (onPitch && pitch) {
      const paddingX = Math.min(0.2, 26 / pitch.width); const paddingY = Math.min(0.2, 30 / pitch.height);
      this.commitPlayers(this.data.players.map((p: TacticalBoardPlayer) => p.studentId === drag.id ? { ...p, role: "starter", positionLabel: undefined, x: Math.max(paddingX, Math.min(1 - paddingX, (x - pitch.left) / pitch.width)), y: Math.max(paddingY, Math.min(1 - paddingY, (y - pitch.top) / pitch.height)) } : p));
    } else if (onRoster) {
      this.commitPlayers(this.data.players.map((p: TacticalBoardPlayer) => p.studentId === drag.id ? { ...p, role: "substitute", positionLabel: undefined } : p));
    }
    this.cancelDrag();
  },
  cancelDrag() { runtime(this).drag = undefined; if (runtime(this).alive) this.setData({ dragId: "", rosterTarget: false }); },
  commitPlayers(players: TacticalBoardPlayer[], remember = true) {
    if (this.data.readOnly || JSON.stringify(players) === JSON.stringify(this.data.players)) return;
    const state = runtime(this);
    if (remember) state.undo = copy(this.data.players);
    state.revision += 1;
    this.setData({ players, dirty: true, canUndo: Boolean(state.undo), saveError: "", saveLabel: "等待保存" });
    // Persist only positions and roster identifiers, scoped to environment, club, coach and match.
    if (state.draftKey) { try { wx.setStorageSync(state.draftKey, draftPositions(players)); } catch { /* Remote save remains available when storage is full. */ } }
    this.refreshViews(); this.scheduleSave();
  },
  undoMove() {
    const state = runtime(this); const undo = state.undo;
    if (!undo || this.data.readOnly) return;
    state.undo = undefined; this.commitPlayers(copy(undo), false);
  },
  clearBoard() {
    if (this.data.readOnly) return;
    // Clearing is distinct from the reviewed single-drag undo action.
    runtime(this).undo = undefined;
    this.setData({ canUndo: false });
    this.commitPlayers(this.data.players.map((p: TacticalBoardPlayer) => ({ ...p, role: "substitute", positionLabel: undefined })), false);
  },
  scheduleSave() {
    const state = runtime(this); clearTimeout(state.saveTimer);
    if (!state.hidden && state.alive) state.saveTimer = setTimeout(() => { state.saveTimer = undefined; void this.saveBoard(); }, 400);
  },
  async saveBoard() {
    const state = runtime(this); clearTimeout(state.saveTimer);
    if (this.data.readOnly || state.saving || !this.data.dirty || !this.data.eventId) return;
    const revision = state.revision; const epoch = state.epoch; const eventId = this.data.eventId;
    const players = copy(this.data.players);
    state.saving = true;
    if (state.alive) this.setData({ saving: true, saveLabel: "保存中", saveError: "" });
    try {
      const response = await saveCoachTacticalBoard(eventId, "free", players);
      state.saving = false;
      if (epoch !== state.epoch) return;
      if (response.event.id !== eventId) throw new Error("Mismatched event");
      const pending = revision !== state.revision;
      if (!pending && state.draftKey) {
        try {
          if (JSON.stringify(readDraft(state.draftKey)) === JSON.stringify(draftPositions(players))) wx.removeStorageSync(state.draftKey);
        } catch { /* A retained draft is safer than losing an unsaved newer edit. */ }
      }
      if (state.alive) this.setData({ saving: false, dirty: pending, saveLabel: pending ? "等待保存" : "已保存" });
      if (pending) { if (state.hidden || !state.alive) return this.saveBoard(); else this.scheduleSave(); }
    } catch {
      state.saving = false;
      if (state.alive && epoch === state.epoch) this.setData({ saving: false, dirty: true, saveLabel: "未保存", saveError: "保存失败，当前布置已保留。点击重试。" });
    }
  },
  retry() { return this.load(this.data.eventId); },
});

function draftPositions(players: TacticalBoardPlayer[]) {
  return players.map(({ studentId, role, x, y }) => ({ studentId, role, x, y }));
}

function readDraft(key: string): ReturnType<typeof draftPositions> | null {
  try {
    const value: unknown = wx.getStorageSync(key);
    if (!Array.isArray(value) || !value.every((item) => item && typeof item.studentId === "string"
      && (item.role === "starter" || item.role === "substitute") && Number.isFinite(item.x) && item.x >= 0 && item.x <= 1
      && Number.isFinite(item.y) && item.y >= 0 && item.y <= 1)) return null;
    return value.map(({ studentId, role, x, y }) => ({ studentId, role, x, y }));
  } catch { return null; }
}

function presentPlayers(response: TacticalBoardState): TacticalBoardPlayer[] {
  const roster = new Map(response.roster.map((p) => [p.studentId, p]));
  const seen = new Set<string>();
  const players: TacticalBoardPlayer[] = [];
  for (const player of response.board.players) {
    const member = roster.get(player.studentId);
    if (!member || seen.has(player.studentId)) continue;
    seen.add(player.studentId); players.push({ ...player, displayName: member.displayName });
  }
  for (const member of response.roster) {
    if (seen.has(member.studentId)) continue;
    seen.add(member.studentId); players.push({ ...member, role: "substitute", x: 0.5, y: 0.5 });
  }
  return players;
}
