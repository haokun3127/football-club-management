import { describe, it, expect } from "vitest";
import { formatCalendarDate, formatShortDate, formatTimeOnly, formatTimeRange } from "./presentation";
describe("club-local schedule presentation", () => {
 it("uses UTC+8 consistently across midnight regardless of device timezone", () => {
  expect(formatTimeOnly("2026-09-28T09:00:00Z")).toBe("17:00");
  expect(formatTimeOnly("2026-09-28T17:00:00+08:00")).toBe("17:00");
  expect(formatCalendarDate("2026-09-28T18:30:00Z")).toBe("9月29日 周二");
  expect(formatTimeRange("2026-09-28T09:00:00Z","2026-09-28T10:00:00Z")).toBe("17:00–18:00");
  expect(formatShortDate("2026-09-28")).toBe("9月28日");
  expect(formatTimeOnly("2026-09-28T09:00:00")).toBe("09:00");
  expect(formatTimeOnly("not-a-date")).toBe("时间待确认");
 });
});
