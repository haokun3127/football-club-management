import { expect, it } from "vitest";
import { gameForm, gameScore, gameWrite } from "./training-games";
it("distinguishes incomplete scores from zero and rejects invalid values without rounding", () => {
  const empty = gameForm();
  expect(gameWrite(empty, "draft", 1, "a").scoreA).toBeNull();
  expect(gameScore({ scoreA: null, scoreB: null })).toBe("未记录比分");
  expect(gameScore({ scoreA: 0, scoreB: 0 })).toBe("0 : 0");
  for (const [a, b] of [
    ["1", ""],
    ["-1", "0"],
    ["1.2", "0"],
    ["1000", "0"],
  ])
    expect(() =>
      gameWrite({ ...empty, scoreA: a, scoreB: b }, "draft", 1, "a"),
    ).toThrow();
});
