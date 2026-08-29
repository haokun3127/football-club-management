import { getCoachTacticalBoard, getTacticalBoardFormations, saveCoachTacticalBoard } from "../../../utils/api";
import { requireRole } from "../../../utils/auth";
import { resolveMenuInset, resolveNavInset } from "../../../utils/presentation";
import { normalizedToPixel, pixelToNormalized } from "../../../utils/tactical-board";
import type { FormationTemplate, LoadState, TacticalBoardPlayer, TacticalBoardState } from "../../../utils/types";

type PlayerView = TacticalBoardPlayer & {
  initials: string;
  px: number;
  py: number;
  className: string;
};

interface BoardPageData {
  navInset: number;
  menuInset: number;
  state: LoadState;
  stateTitle: string;
  message: string;
  eventId: string;
  eventTitle: string;
  formations: FormationTemplate[];
  formationIndex: number;
  formationLabel: string;
  hasFormation: boolean;
  players: TacticalBoardPlayer[];
  roster: TacticalBoardState["roster"];
  rosterPlayers: PlayerView[];
  starters: PlayerView[];
  substitutes: PlayerView[];
  pitchWidth: number;
  pitchHeight: number;
  readOnly: boolean;
  dirty: boolean;
  saving: boolean;
  saveLabel: string;
  saveToneClass: string;
  saveError: string;
  selectedStarterId: string;
}

let latestLoadToken = 0;

Page<BoardPageData>({
  data: {
    navInset: 20,
    menuInset: 16,
    state: "idle",
    stateTitle: "比赛战术板",
    message: "",
    eventId: "",
    eventTitle: "",
    formations: [],
    formationIndex: -1,
    formationLabel: "",
    hasFormation: false,
    players: [],
    roster: [],
    rosterPlayers: [],
    starters: [],
    substitutes: [],
    pitchWidth: 351,
    pitchHeight: 430,
    readOnly: false,
    dirty: false,
    saving: false,
    saveLabel: "",
    saveToneClass: "",
    saveError: "",
    selectedStarterId: "",
  },
  onLoad(query?: Record<string, string | undefined>) {
    if (!requireRole("coach")) return;
    this.setData({ navInset: resolveNavInset(), menuInset: resolveMenuInset() });
    const eventId = (query?.eventId || "").trim();
    if (!eventId) {
      this.setData({
        state: "empty",
        stateTitle: "未选择比赛",
        message: "请从比赛活动进入战术板。",
        eventId: "",
      });
      return;
    }
    return this.load(eventId);
  },
  goBack() {
    wx.navigateBack({ delta: 1 });
  },
  async load(eventId?: string) {
    const currentEventId = eventId ?? this.data.eventId;
    if (!currentEventId) {
      this.setData({ state: "empty", stateTitle: "未选择比赛", message: "请从比赛活动进入战术板。" });
      return;
    }

    const loadToken = ++latestLoadToken;
    this.setData({
      state: "loading",
      stateTitle: "正在载入战术板",
      message: "正在读取本场比赛的真实阵型与名单。",
      eventId: currentEventId,
      saveError: "",
      saving: false,
      selectedStarterId: "",
    });
    try {
      const [formations, response] = await Promise.all([
        getTacticalBoardFormations(),
        getCoachTacticalBoard(currentEventId),
      ]);
      if (loadToken !== latestLoadToken) return;
      if (response.event.id !== currentEventId) {
        this.setData({ state: "error", stateTitle: "读取失败", message: "当前比赛的战术板信息暂不可用。" });
        return;
      }

      const formationIndex = formations.findIndex((formation) => formation.name === response.board.formationName);
      const formation = formationIndex >= 0 ? formations[formationIndex] : undefined;
      const players = presentBoardPlayers(response);
      if (!players.length) {
        this.setData({
          state: "empty",
          stateTitle: "暂无战术安排",
          message: "当前比赛尚无可展示的真实名单与位置。",
          formations,
          formationIndex,
          formationLabel: formation?.label || "阵型待同步",
          hasFormation: Boolean(formation),
          players: [],
          roster: response.roster,
          starters: [],
          substitutes: [],
          eventTitle: response.event.title,
          readOnly: response.readOnly,
          dirty: false,
          saveLabel: "已保存",
          saveToneClass: "c7-status c7-status--loaded",
        });
        return;
      }

      this.setData({
        state: "ready",
        stateTitle: "比赛战术板",
        message: "",
        formations,
        formationIndex,
        formationLabel: formation?.label || "阵型待同步",
        hasFormation: Boolean(formation),
        players,
        roster: response.roster,
        eventTitle: response.event.title,
        readOnly: response.readOnly,
        dirty: false,
        saveLabel: "已保存",
        saveToneClass: "c7-status c7-status--loaded",
        saveError: "",
        selectedStarterId: "",
        rosterPlayers: [],
        starters: [],
        substitutes: [],
      });
      this.refreshViews(players, "");
      void Promise.resolve().then(() => this.measurePitch(loadToken));
    } catch {
      if (loadToken !== latestLoadToken) return;
      this.setData({
        state: "error",
        stateTitle: "读取失败",
        message: "当前比赛的战术板信息暂不可用，请稍后重试。",
        rosterPlayers: [],
        starters: [],
        substitutes: [],
      });
    }
  },
  measurePitch(loadToken: number) {
    const selectorQuery = wx as unknown as {
      createSelectorQuery: () => {
        select: (selector: string) => {
          boundingClientRect: (callback: (rect?: { width: number; height: number }) => void) => { exec: () => void };
        };
      };
    };
    selectorQuery.createSelectorQuery().select("#c7-pitch").boundingClientRect((rect) => {
      if (loadToken !== latestLoadToken || !rect) return;
      this.setData({ pitchWidth: rect.width, pitchHeight: rect.height });
      this.refreshViews();
    }).exec();
  },
  refreshViews(players?: TacticalBoardPlayer[], selectedStarterId?: string) {
    const currentPlayers = players ?? this.data.players;
    const currentSelectedStarterId = selectedStarterId ?? this.data.selectedStarterId;
    const toView = (player: TacticalBoardPlayer): PlayerView => ({
      ...player,
      px: normalizedToPixel(player.x, this.data.pitchWidth, 20),
      py: normalizedToPixel(player.y, this.data.pitchHeight, 20),
      initials: player.displayName.slice(0, 2),
      className: player.studentId === currentSelectedStarterId ? "c7-player c7-player--selected" : "c7-player",
    });
    this.setData({
      rosterPlayers: currentPlayers.map(toView),
      starters: currentPlayers.filter((player: TacticalBoardPlayer) => player.role === "starter").map(toView),
      substitutes: currentPlayers.filter((player: TacticalBoardPlayer) => player.role !== "starter").map(toView),
    });
  },
  onFormationChange(event: { detail: { value: string | number } }) {
    if (this.data.readOnly) return;
    this.applyFormation(Number(event.detail.value));
  },
  applyFormation(formationIndex: number) {
    const formation = this.data.formations[formationIndex];
    if (this.data.readOnly || !formation || !formation.positions.length) return;

    let starterIndex = 0;
    const players = this.data.players.map((player: TacticalBoardPlayer) => {
      if (player.role !== "starter") return player;
      const position = formation.positions[starterIndex++];
      return position
        ? { ...player, positionLabel: position.positionLabel, x: position.x, y: position.y }
        : player;
    });
    this.setData({
      formationIndex,
      formationLabel: formation.label,
      hasFormation: true,
      players,
      dirty: true,
      saveLabel: "未保存",
      saveToneClass: "c7-status c7-status--dirty",
      saveError: "",
      selectedStarterId: "",
    });
    this.refreshViews(players, "");
  },
  selectStarter(event: { currentTarget: { dataset: { id?: string } } }) {
    if (this.data.readOnly) return;
    const studentId = event.currentTarget.dataset.id || "";
    if (!this.data.starters.some((player: PlayerView) => player.studentId === studentId)) return;
    const selectedStarterId = studentId === this.data.selectedStarterId ? "" : studentId;
    this.setData({ selectedStarterId });
    this.refreshViews(this.data.players, selectedStarterId);
  },
  swapSubstitute(event: { currentTarget: { dataset: { id?: string } } }) {
    if (this.data.readOnly) return;
    const substituteId = event.currentTarget.dataset.id || "";
    const starterId = this.data.selectedStarterId;
    const starter = this.data.players.find((player: TacticalBoardPlayer) => player.studentId === starterId && player.role === "starter");
    const substitute = this.data.players.find((player: TacticalBoardPlayer) => player.studentId === substituteId && player.role !== "starter");
    if (!starter || !substitute) {
      wx.showToast({ title: "请先选择场上球员再换位", icon: "none" });
      return;
    }
    const players = this.data.players.map((player: TacticalBoardPlayer) => {
      if (player.studentId === starter.studentId) return { ...player, role: "substitute" as const, positionLabel: undefined };
      if (player.studentId === substitute.studentId) {
        return { ...player, role: "starter" as const, positionLabel: starter.positionLabel, x: starter.x, y: starter.y };
      }
      return player;
    });
    this.setData({
      players,
      dirty: true,
      saveLabel: "未保存",
      saveToneClass: "c7-status c7-status--dirty",
      saveError: "",
      selectedStarterId: "",
    });
    this.refreshViews(players, "");
  },
  onPlayerMove(event: { currentTarget: { dataset: { id?: string } }; detail: { x: number; y: number; source?: string } }) {
    if (this.data.readOnly || event.detail.source !== "touch") return;
    const studentId = event.currentTarget.dataset.id || "";
    if (!this.data.starters.some((player: PlayerView) => player.studentId === studentId)) return;
    const x = pixelToNormalized(event.detail.x, this.data.pitchWidth, 20);
    const y = pixelToNormalized(event.detail.y, this.data.pitchHeight, 20);
    const players = this.data.players.map((player: TacticalBoardPlayer) => player.studentId === studentId ? { ...player, x, y } : player);
    this.setData({
      players,
      dirty: true,
      saveLabel: "未保存",
      saveToneClass: "c7-status c7-status--dirty",
      saveError: "",
    });
    this.refreshViews(players);
  },
  resetBoard() {
    if (this.data.readOnly) return;
    this.applyFormation(this.data.formationIndex);
  },
  async saveBoard() {
    if (this.data.readOnly || this.data.saving || !this.data.dirty || !this.data.eventId) return;
    const formation = this.data.formations[this.data.formationIndex];
    if (!formation) return;

    this.setData({ saving: true, saveError: "" });
    try {
      const response = await saveCoachTacticalBoard(this.data.eventId, formation.name, this.data.players);
      if (response.event.id !== this.data.eventId) throw new Error("mismatched event");
      const players = presentBoardPlayers(response);
      this.setData({
        players,
        roster: response.roster,
        dirty: false,
        saving: false,
        saveLabel: "已保存",
        saveToneClass: "c7-status c7-status--saved",
        saveError: "",
        selectedStarterId: "",
      });
      this.refreshViews(players, "");
    } catch {
      this.setData({ saving: false, saveError: "保存失败，未保存的调整已保留" });
      wx.showToast({ title: "保存失败，未保存的调整已保留", icon: "none" });
    }
  },
  retry() {
    this.load(this.data.eventId);
  },
});

function presentBoardPlayers(response: TacticalBoardState) {
  const boardPlayersByStudentId = new Map(response.board.players.map((player) => [player.studentId, player]));
  return response.roster.flatMap((member) => {
    if (!member.studentId || !member.displayName) return [];
    const boardPlayer = boardPlayersByStudentId.get(member.studentId);
    return [{
      studentId: member.studentId,
      displayName: member.displayName,
      role: boardPlayer?.role ?? "substitute",
      positionLabel: boardPlayer?.positionLabel,
      x: boardPlayer?.x ?? 0.5,
      y: boardPlayer?.y ?? 0.8,
    }];
  });
}
