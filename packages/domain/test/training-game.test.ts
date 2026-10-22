import { describe, expect, it } from "vitest";
import {
  validateTrainingGame,
  type TrainingGameContent,
} from "../src/training-game.js";
const game = (): TrainingGameContent => ({
  sideAName: "红队",
  sideBName: "蓝队",
  scoreA: null,
  scoreB: null,
  state: "draft",
  participants: [{ studentId: "one", side: "A", nameSnapshot: "一" }],
  events: [],
});
describe("training friendly game content", () => {
  it("keeps unknown scores, a real 0:0 and partial personal events distinct", () => {
    expect(() => validateTrainingGame(game())).not.toThrow();
    const partial = {
      ...game(),
      scoreA: 0,
      scoreB: 0,
      state: "completed" as const,
      events: [
        {
          id: "goal",
          type: "goal" as const,
          side: "A" as const,
          studentId: "one",
          minute: null,
          note: "只记录部分事件",
        },
      ],
    };
    expect(() => validateTrainingGame(partial)).not.toThrow();
    expect(partial.scoreA).toBe(0);
  });
  it.each([
    { scoreA: 1 },
    { scoreA: -1, scoreB: 0 },
    { scoreA: 1.2, scoreB: 0 },
    { sideAName: " " },
    {
      participants: [
        { studentId: "one", side: "A", nameSnapshot: "一" },
        { studentId: "one", side: "B", nameSnapshot: "一" },
      ],
    },
    {
      events: [
        {
          id: "e",
          type: "goal",
          side: "B",
          studentId: "one",
          minute: 0,
          note: "",
        },
      ],
    },
    {
      events: [
        {
          id: "e",
          type: "save",
          side: "A",
          studentId: null,
          minute: -1,
          note: "",
        },
      ],
    },
  ])("rejects invalid content %j", (patch) => {
    expect(() =>
      validateTrainingGame({ ...game(), ...patch } as TrainingGameContent),
    ).toThrow();
  });
  it("requires reasons for published corrections and terminal voiding", () => {
    const complete = { ...game(), state: "completed" as const };
    expect(() => validateTrainingGame(complete, complete)).toThrow("原因");
    expect(() =>
      validateTrainingGame(complete, complete, "核对更正"),
    ).not.toThrow();
    expect(() => validateTrainingGame(game(), complete, "改回")).toThrow(
      "草稿",
    );
    const voided = { ...game(), state: "voided" as const };
    expect(() =>
      validateTrainingGame(voided, complete, "重复记录"),
    ).not.toThrow();
    expect(() => validateTrainingGame(complete, voided, "恢复")).toThrow(
      "不可再次修改",
    );
  });
});
