import { describe, expect, it } from "vitest";

const { currentLocalDate, resolveParentPageDate, shiftCalendarDate } = await import("./date.ts");

describe("parent page date defaults", () => {
  it("uses the real local date unless an explicit develop override is supplied", () => {
    const now = new Date(2026, 7, 10, 9, 30, 0);

    expect(currentLocalDate(now)).toBe("2026-08-10");
    expect(resolveParentPageDate(now, null)).toBe("2026-08-10");
    expect(resolveParentPageDate(now, "2026-06-28")).toBe("2026-06-28");
    expect(shiftCalendarDate("2026-08-10", -7)).toBe("2026-08-03");
    expect(shiftCalendarDate("2026-08-10", 7)).toBe("2026-08-17");
  });
});
