import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getWindowInfo: () => ({ statusBarHeight: 20, windowWidth: 375 }),
  getMenuButtonBoundingClientRect: () => ({ top: 24, left: 300, width: 64, height: 32 }),
  getStorageSync: () => "",
  setStorageSync: () => {},
  removeStorageSync: () => {},
  navigateTo: () => {},
  reLaunch: () => {},
};
globalThis.Page = () => {};

const { buildMonthDays } = await import("./index.ts");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function event(overrides = {}) {
  return {
    id: "training-1",
    type: "training",
    title: "技术专项训练",
    startsAt: "2026-08-13T09:30:00.000Z",
    endsAt: "2026-08-13T11:00:00.000Z",
    venue: "凤凰山球场",
    status: "scheduled",
    childIds: ["student-1"],
    ...overrides,
  };
}

describe("P1 weekly schedule with expandable month picker", () => {
  it("builds a Monday-first August 2026 grid with leading and trailing days", () => {
    const days = buildMonthDays("2026-08", "2026-08-13", []);

    expect(days[0]).toMatchObject({ key: "2026-07-27", dayNumber: "27", isCurrentMonth: false });
    expect(days.at(-1)).toMatchObject({ key: "2026-09-06", dayNumber: "6", isCurrentMonth: false });
    expect(days).toHaveLength(42);
    expect(days.filter((day) => day.isCurrentMonth)).toHaveLength(31);
  });

  it("precomputes selected state and separate training/match markers from real events", () => {
    const days = buildMonthDays("2026-08", "2026-08-13", [
      event(),
      event({ id: "match-1", type: "match", startsAt: "2026-08-14T09:30:00.000Z" }),
    ]);

    expect(days.find((day) => day.key === "2026-08-13")).toMatchObject({
      isSelected: true,
      hasTraining: true,
      hasMatch: false,
      hasMultiple: false,
    });
    expect(days.find((day) => day.key === "2026-08-14")).toMatchObject({
      hasTraining: false,
      hasMatch: true,
      hasMultiple: false,
    });
  });

  it("keeps the week strip as the default and only renders the month grid while expanded", () => {
    expect(template).toContain('wx:if="{{!isMonthPickerExpanded}}" class="week-switcher"');
    expect(template).toContain('bindtap="expandMonthPicker"');
    expect(template).toContain('wx:if="{{isMonthPickerExpanded}}" class="month-calendar"');
    expect(template).toContain('data-offset="-1" bindtap="changeMonth"');
    expect(template).toContain('data-offset="1" bindtap="changeMonth"');
    expect(template).toContain('bindtap="collapseMonthPicker"');
    expect(template).toContain('bindtap="selectDate"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
