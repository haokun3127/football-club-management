/** A recorded friendly game remains part of its training event. */
export type TrainingGameSide = "A" | "B";
export type TrainingGameState = "draft" | "completed" | "voided";
export interface TrainingGameParticipant {
  studentId: string;
  side: TrainingGameSide;
  nameSnapshot: string;
}
export interface TrainingGameEvent {
  id: string;
  type: "goal" | "assist" | "save";
  side: TrainingGameSide;
  studentId: string | null;
  minute: number | null;
  note: string;
}
export interface TrainingGameContent {
  sideAName: string;
  sideBName: string;
  scoreA: number | null;
  scoreB: number | null;
  state: TrainingGameState;
  participants: TrainingGameParticipant[];
  events: TrainingGameEvent[];
}
export interface TrainingGame extends TrainingGameContent {
  id: string;
  clubId: string;
  eventId: string;
  contentBlockId: string;
  contentSnapshot: {
    planId: string;
    drillId: string;
    name: string;
    revision: string;
  };
  revision: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
export interface TrainingGameRevision {
  gameId: string;
  revision: number;
  actorId: string;
  changedAt: string;
  reason: string;
  requestId: string;
  requestHash: string;
  /** The confirmed result doubles as the immutable revision and retry response. */
  snapshot: TrainingGame;
}

/** Score is an independent match fact; a partially recorded event list never changes it. */
export function validateTrainingGame(
  content: TrainingGameContent,
  previous?: TrainingGameContent,
  reason = "",
): void {
  if (
    ![content.sideAName, content.sideBName].every(
      (name) => name.trim().length > 0 && name.length <= 80,
    )
  )
    throw new Error("双方名称须为1至80字");
  if ((content.scoreA === null) !== (content.scoreB === null))
    throw new Error("请同时填写双方比分，或同时留空");
  if (
    [content.scoreA, content.scoreB].some(
      (score) =>
        score !== null &&
        (!Number.isInteger(score) || score < 0 || score > 999),
    )
  )
    throw new Error("比分须为0至999的整数");
  if (!["draft", "completed", "voided"].includes(content.state))
    throw new Error("记录状态无效");
  if (previous?.state === "voided") throw new Error("已作废记录不可再次修改");
  if (previous?.state === "completed" && content.state === "draft")
    throw new Error("完成的记录不可改回草稿");
  if (
    (previous?.state === "completed" || content.state === "voided") &&
    !reason.trim()
  )
    throw new Error("请填写修订或作废原因");
  if (reason.length > 500) throw new Error("原因不能超过500字");
  if (content.participants.length > 100 || content.events.length > 500)
    throw new Error("最多记录100名参赛学员和500条事件");
  const participants = new Map(
    content.participants.map((item) => [item.studentId, item]),
  );
  if (participants.size !== content.participants.length)
    throw new Error("同一学员不能重复参赛");
  if (
    content.participants.some(
      (item) =>
        !item.studentId ||
        !["A", "B"].includes(item.side) ||
        !item.nameSnapshot.trim(),
    )
  )
    throw new Error("参赛名单无效");
  if (
    new Set(content.events.map((item) => item.id)).size !==
    content.events.length
  )
    throw new Error("比赛事件标识不能重复");
  for (const event of content.events) {
    if (
      !event.id ||
      !["goal", "assist", "save"].includes(event.type) ||
      !["A", "B"].includes(event.side)
    )
      throw new Error("比赛事件无效");
    if (
      event.studentId !== null &&
      participants.get(event.studentId)?.side !== event.side
    )
      throw new Error("事件学员必须属于对应一方参赛名单");
    if (
      event.minute !== null &&
      (!Number.isInteger(event.minute) ||
        event.minute < 0 ||
        event.minute > 300)
    )
      throw new Error("分钟须为0至300的整数或留空");
    if (event.note.length > 500) throw new Error("事件备注不能超过500字");
  }
}
