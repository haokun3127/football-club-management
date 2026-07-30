import { getCoachTacticalBoard, getTacticalBoardFormations, saveCoachTacticalBoard } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import type { FormationTemplate, LoadState, TacticalBoardPlayer, TacticalBoardState } from "../../../utils/types";
import { normalizedToPixel, pixelToNormalized } from "../../../utils/tactical-board";

type PlayerView = TacticalBoardPlayer & { px: number; py: number; initials: string; selected: boolean };

interface BoardPageData {
  state: LoadState; message: string; eventId: string; eventTitle: string; formations: FormationTemplate[]; formationIndex: number;
  players: TacticalBoardPlayer[]; starters: PlayerView[]; substitutes: PlayerView[]; pitchWidth: number; pitchHeight: number;
  readOnly: boolean; dirty: boolean; saving: boolean; selectedStarterId: string;
}

Page<BoardPageData>({
  data: {
    state: "loading" as LoadState,
    message: "正在读取战术板",
    eventId: "",
    eventTitle: "比赛战术板",
    formations: [] as FormationTemplate[],
    formationIndex: 0,
    players: [] as TacticalBoardPlayer[],
    starters: [] as PlayerView[],
    substitutes: [] as PlayerView[],
    pitchWidth: 320,
    pitchHeight: 500,
    readOnly: false,
    dirty: false,
    saving: false,
    selectedStarterId: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    if (!requireRole("coach")) return;
    const eventId = query?.eventId || query?.id || "";
    this.setData({ eventId });
    this.load();
  },
  goBack() {
    wx.navigateBack();
  },
  async load() {
    if (!this.data.eventId) return this.setData({ state: "error", message: "请选择一场比赛后再打开战术板" });
    try {
      const [formations, response] = await Promise.all([
        getTacticalBoardFormations(),
        getCoachTacticalBoard(this.data.eventId),
      ]);
      const formationIndex = Math.max(0, formations.findIndex((item) => item.name === response.board.formationName));
      this.setData({
        state: "ready",
        message: "",
        formations,
        formationIndex,
        players: response.board.players,
        eventTitle: response.event.title,
        readOnly: response.readOnly,
        dirty: false,
      });
      void Promise.resolve().then(() => this.measurePitch());
    } catch (error) {
      this.setData({ state: "error", message: readableError(error) });
    }
  },
  measurePitch() {
    const query = (wx as unknown as { createSelectorQuery: () => { select: (selector: string) => { boundingClientRect: (callback: (rect?: { width: number; height: number }) => void) => { exec: () => void } } } }).createSelectorQuery();
    query.select("#pitch").boundingClientRect((rect) => {
      if (!rect) return;
      this.setData({ pitchWidth: rect.width, pitchHeight: rect.height });
      this.refreshViews();
    }).exec();
  },
  refreshViews() {
    const toView = (player: TacticalBoardPlayer): PlayerView => ({
      ...player,
      px: normalizedToPixel(player.x, this.data.pitchWidth, 24),
      py: normalizedToPixel(player.y, this.data.pitchHeight, 24),
      initials: player.displayName.slice(-2),
      selected: player.studentId === this.data.selectedStarterId,
    });
    this.setData({
      starters: this.data.players.filter((item: TacticalBoardPlayer) => item.role === "starter").map(toView),
      substitutes: this.data.players.filter((item: TacticalBoardPlayer) => item.role !== "starter").map(toView),
    });
  },
  onFormationChange(event: { detail: { value: string | number } }) {
    if (this.data.readOnly) return;
    const formationIndex = Number(event.detail.value);
    this.applyFormation(formationIndex);
  },
  applyFormation(formationIndex: number) {
    const formation = this.data.formations[formationIndex];
    if (!formation) return;
    let starterIndex = 0;
    const players = this.data.players.map((player: TacticalBoardPlayer) => {
      if (player.role !== "starter") return player;
      const position = formation.positions[starterIndex++] ?? formation.positions[0]!;
      return { ...player, positionLabel: position.positionLabel, x: position.x, y: position.y };
    });
    this.setData({ formationIndex, players, dirty: true });
    this.refreshViews();
  },
  selectStarter(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event.currentTarget.dataset.id || "";
    this.setData({ selectedStarterId: id === this.data.selectedStarterId ? "" : id });
    this.refreshViews();
  },
  swapSubstitute(event: { currentTarget: { dataset: { id?: string } } }) {
    if (this.data.readOnly) return;
    const substituteId = event.currentTarget.dataset.id;
    const starterId = this.data.selectedStarterId;
    if (!substituteId || !starterId) {
      wx.showToast({ title: "请先点选一名场上球员", icon: "none" });
      return;
    }
    const starter = this.data.players.find((item: TacticalBoardPlayer) => item.studentId === starterId);
    const players = this.data.players.map((player: TacticalBoardPlayer) => {
      if (player.studentId === starterId) return { ...player, role: "substitute" as const, positionLabel: undefined };
      if (player.studentId === substituteId && starter) return { ...player, role: "starter" as const, positionLabel: starter.positionLabel, x: starter.x, y: starter.y };
      return player;
    });
    this.setData({ players, dirty: true, selectedStarterId: substituteId });
    this.refreshViews();
  },
  onPlayerMove(event: { currentTarget: { dataset: { id?: string } }; detail: { x: number; y: number; source?: string } }) {
    if (this.data.readOnly || event.detail.source !== "touch") return;
    const id = event.currentTarget.dataset.id;
    const x = pixelToNormalized(event.detail.x, this.data.pitchWidth, 24);
    const y = pixelToNormalized(event.detail.y, this.data.pitchHeight, 24);
    this.setData({ players: this.data.players.map((player: TacticalBoardPlayer) => player.studentId === id ? { ...player, x, y } : player), dirty: true });
    this.refreshViews();
  },
  resetBoard() {
    if (!this.data.readOnly) this.applyFormation(this.data.formationIndex);
  },
  async saveBoard() {
    if (this.data.readOnly || this.data.saving) return;
    const formation = this.data.formations[this.data.formationIndex];
    if (!formation) return;
    this.setData({ saving: true });
    try {
      const response: TacticalBoardState = await saveCoachTacticalBoard(this.data.eventId, formation.name, this.data.players);
      this.setData({ players: response.board.players, dirty: false });
      this.refreshViews();
      wx.showToast({ title: "战术板已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: readableError(error), icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  retry() { this.load(); },
});

function readableError(error: unknown) { return (error as { message?: string })?.message || "战术板读取失败"; }
