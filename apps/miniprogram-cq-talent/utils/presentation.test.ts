import { describe, expect, it } from "vitest";

import { activityStatus, formatCalendarDate, formatDateTime, formatTimeRange } from "./presentation";

describe("parent presentation helpers", () => {
  it("maps backend and localized activity states to safe labels", () => {
    expect(activityStatus("scheduled")).toEqual({ label: "待开始", tone: "brand" });
    expect(activityStatus("rescheduled")).toEqual({ label: "有变更", tone: "warning" });
    expect(activityStatus("已取消")).toEqual({ label: "已取消", tone: "error" });
    expect(activityStatus("unexpected_internal_state")).toEqual({ label: "安排中", tone: "neutral" });
  });

  it("formats API dates without exposing ISO timestamps", () => {
    expect(formatCalendarDate("2026-06-28T11:00:00.000Z")).toBe("6月28日 周日");
    expect(formatDateTime("2026-06-28T11:00:00.000Z")).toBe("6月28日 11:00");
    expect(formatTimeRange("2026-06-28T11:00:00.000Z", "2026-06-28T12:30:00.000Z")).toBe("11:00–12:30");
  });

  it("uses business-friendly fallbacks for incomplete dates", () => {
    expect(formatCalendarDate()).toBe("时间待确认");
    expect(formatDateTime("invalid")).toBe("时间待确认");
    expect(formatTimeRange()).toBe("时间待确认");
  });
});
