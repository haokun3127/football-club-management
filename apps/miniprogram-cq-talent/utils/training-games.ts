export type GameSide = "A" | "B";
export type GameState = "draft" | "completed" | "voided";
export interface GameEvent {
  id: string;
  type: "goal" | "assist" | "save";
  side: GameSide;
  studentId: string | null;
  minute: number | null;
  note: string;
}
export interface TrainingGame {
  id: string;
  eventId: string;
  contentBlockId: string;
  contentSnapshot: {
    planId: string;
    drillId: string;
    name: string;
    revision: string;
  };
  sideAName: string;
  sideBName: string;
  scoreA: number | null;
  scoreB: number | null;
  state: GameState;
  revision: number;
  updatedAt: string;
  sourceAdjusted?: boolean;
  participants: Array<{
    studentId: string;
    side: GameSide;
    nameSnapshot: string;
  }>;
  events: GameEvent[];
}
export interface GameContext {
  enabled: boolean;
  canEdit: boolean;
  event: {
    id: string;
    title: string;
    startsAt: string;
    status: string;
    teamId: string | null;
  };
  sources: Array<{
    contentBlockId: string;
    contentSnapshot: TrainingGame["contentSnapshot"];
  }>;
  participants: Array<{ studentId: string; name: string }>;
  games: TrainingGame[];
}
export interface GameHistory {
  revision: number;
  changedAt: string;
  reason: string;
  state: GameState;
  scoreA: number | null;
  scoreB: number | null;
  participantCount: number;
  eventCount: number;
}
export interface GameWrite {
  sideAName: string;
  sideBName: string;
  scoreA: number | null;
  scoreB: number | null;
  state: GameState;
  participants: Array<{ studentId: string; side: GameSide }>;
  events: GameEvent[];
  expectedRevision: number;
  requestId: string;
  reason: string;
}
export interface ParentGame {
  id: string;
  eventId: string;
  contentName: string;
  sideAName: string;
  sideBName: string;
  scoreA: number | null;
  scoreB: number | null;
  revision: number;
  updatedAt: string;
  events: Array<Pick<GameEvent, "id" | "type" | "side" | "minute">>;
}
export interface GameForm {
  sideAName: string;
  sideBName: string;
  scoreA: string;
  scoreB: string;
  reason: string;
  participants: GameWrite["participants"];
  events: GameEvent[];
}
export const GAME_EVENT_LABELS = { goal: "进球", assist: "助攻", save: "扑救" };
export const GAME_STATE_LABELS = {
  draft: "草稿",
  completed: "已完成",
  voided: "已作废",
};
export function gameScore(game: {
  scoreA: number | null;
  scoreB: number | null;
}) {
  return game.scoreA === null || game.scoreB === null
    ? "未记录比分"
    : `${game.scoreA} : ${game.scoreB}`;
}
export function gameForm(game?: TrainingGame): GameForm {
  return {
    sideAName: game?.sideAName ?? "红队",
    sideBName: game?.sideBName ?? "蓝队",
    scoreA: game?.scoreA == null ? "" : String(game.scoreA),
    scoreB: game?.scoreB == null ? "" : String(game.scoreB),
    reason: "",
    participants:
      game?.participants.map(({ studentId, side }) => ({ studentId, side })) ??
      [],
    events: game?.events.map((item) => ({ ...item })) ?? [],
  };
}
export function gameWrite(
  form: GameForm,
  state: GameState,
  expectedRevision: number,
  requestId: string,
): GameWrite {
  if (!form.sideAName.trim() || !form.sideBName.trim())
    throw new Error("请填写双方名称");
  const a = form.scoreA.trim(),
    b = form.scoreB.trim();
  if (Boolean(a) !== Boolean(b))
    throw new Error("请同时填写双方比分，或同时留空");
  const valid = (text: string) =>
    !text || (/^\d+$/.test(text) && Number(text) <= 999);
  if (!valid(a) || !valid(b)) throw new Error("比分须为0至999的整数");
  return {
    sideAName: form.sideAName.trim(),
    sideBName: form.sideBName.trim(),
    scoreA: a ? Number(a) : null,
    scoreB: b ? Number(b) : null,
    state,
    participants: form.participants.map((item) => ({ ...item })),
    events: form.events.map((item) => ({ ...item })),
    expectedRevision,
    requestId,
    reason: form.reason.trim(),
  };
}
export function gameReadMessage(error: unknown) {
  return error &&
    typeof error === "object" &&
    "statusCode" in error &&
    error.statusCode === 404
    ? "训练内友谊赛记录尚未启用"
    : "友谊赛记录读取失败，请重试";
}
