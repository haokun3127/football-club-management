import { describe, expect, it } from "vitest";
import { formationTemplates, validateTacticalBoardPlayers } from "./tactical-board.js";

describe("tactical board", () => {
  it("allows an empty pitch and more than eleven roster members without fixed formation limits", () => {
    const players = Array.from({ length: 19 }, (_, index) => ({ studentId: `s${index}`, displayName: `Player ${index}`, role: "starter" as const, x: 0.5, y: 0.5 }));
    expect(validateTacticalBoardPlayers(players, players.map((player) => player.studentId))).toEqual([]);
    expect(validateTacticalBoardPlayers([], [])).toEqual([]);
  });
  it("provides three normalized eleven-player formations", () => {
    expect(formationTemplates.map((item) => item.name)).toEqual(["4-3-3", "4-4-2", "3-5-2"]);
    expect(formationTemplates.every((item) => item.positions.length === 11 && item.positions.every((position) => position.x >= 0 && position.x <= 1 && position.y >= 0 && position.y <= 1))).toBe(true);
  });

  it("rejects duplicate, out-of-roster and out-of-range players", () => {
    const errors = validateTacticalBoardPlayers([
      { studentId: "s1", displayName: "A", role: "starter", x: 0.5, y: 0.5 },
      { studentId: "s1", displayName: "A", role: "starter", x: 2, y: 0.5 },
      { studentId: "s2", displayName: "B", role: "reserve", x: 0.5, y: 0.5 },
    ], ["s1"]);
    expect(errors).toEqual(expect.arrayContaining(["duplicate_student:s1", "invalid_position:s1", "student_not_in_roster:s2"]));
  });
});
