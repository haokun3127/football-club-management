import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachHome: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachHome: mocks.getCoachHome }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  activityStatus: (status) => ({ label: status, tone: "info" }),
  formatCalendarDate: (value) => String(value).slice(0, 10),
  formatTimeRange: () => "",
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { reLaunch: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data, ...data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

const home = {
  date: "2026-08-13",
  dateRange: { from: "2026-08-10", to: "2026-08-16" },
  coachName: "Coach Chen",
  teams: ["U11 Red"],
  events: [
    {
      id: "event-training-1",
      type: "training",
      title: "Ball-control session",
      startsAt: "2026-08-13T09:00:00.000Z",
      endsAt: "2026-08-13T10:00:00.000Z",
      venue: "North field",
      teamName: "U11 Red",
      status: "scheduled",
      nextAction: "attendance",
      nextActionLabel: "Record attendance",
    },
  ],
  tasks: [
    {
      eventId: "event-training-1",
      eventType: "training",
      action: "attendance",
      label: "Record attendance",
      dueAt: "2026-08-13T10:00:00.000Z",
    },
  ],
  summary: { total: 1, training: 1, matches: 0, pending: 1 },
  pendingItems: [],
};

describe("coach schedule home", () => {
  beforeEach(() => {
    mocks.getCoachHome.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
  });

  it("shows the attendance capsule and weekly hero pills when the API provides them", async () => {
    mocks.getCoachHome.mockResolvedValue({
      ...home,
      summary: { total: 1, training: 1, matches: 0, pending: 1, attendance: { confirmed: 9, total: 10 } },
      weekStats: { sessions: 3, hours: 4.5, attendanceRate: 90 },
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.summaryItems).toEqual([
      { key: "training", label: "今日1节训练课", value: "", tone: "brand" },
      { key: "attendance", label: "出席9/10人", value: "", tone: "green" },
      { key: "pending", label: "待处理1", value: "", tone: "amber" },
    ]);
    expect(page.data.heroPills).toEqual(["90% 出席率", "4.5h 本周训练", "3节 本周课次"]);
  });

  it("loads a Monday-to-Sunday range and presents only API-backed C1 summary, hero, and events", async () => {
    mocks.getCoachHome.mockResolvedValue(home);
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13", viewMode: "week" });

    await page.load();

    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-08-10", to: "2026-08-16" });
    expect(page.data).toMatchObject({
      state: "ready",
      coachName: "Coach Chen",
      summaryItems: [
        { key: "training", label: "今日1节训练课", value: "" },
        { key: "match", label: "比赛0场", value: "" },
        { key: "pending", label: "待处理1", value: "" },
      ],
      hasHeroEvent: true,
      heroDateLabel: "2026年8月13日 周四",
      heroEvent: { id: "event-training-1", title: "Ball-control session", startTime: "09:00", hasDuration: true },
      hasVisibleEvents: true,
      visibleEvents: [{
        id: "event-training-1",
        coachName: "Coach Chen",
        hasCoachName: true,
        hasTeamName: true,
        hasVenue: true,
        hasNextAction: true,
        nextAction: "attendance",
        nextActionLabel: "Record attendance",
      }],
    });
    expect(page.data.dayStrip.map((day) => day.weekLabel)).toEqual(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
  });

  it("keeps empty and failed coach-home loads honest", async () => {
    mocks.getCoachHome.mockResolvedValue({ ...home, events: [], tasks: [], teams: [], summary: { total: 0, training: 0, matches: 0, pending: 0 } });
    const emptyPage = createPageInstance();

    await emptyPage.load();

    expect(emptyPage.data).toMatchObject({
      state: "empty",
      hasHeroEvent: false,
      hasVisibleEvents: false,
    });

    mocks.getCoachHome.mockRejectedValue(Object.assign(new Error("server detail"), { status: 403 }));
    const failedPage = createPageInstance();

    await failedPage.load();

    expect(failedPage.data).toMatchObject({ state: "error", message: "日程读取失败，请稍后重试" });
  });

  it("routes each supported next action without inventing an attendance summary", () => {
    const page = createPageInstance();
    const routes = {
      attendance: "/pages/coach/attendance/index?id=event-1",
      lesson: "/pages/coach/lesson/index?id=event-1",
      match: "/pages/coach/match/index?id=event-1",
      assessment: "/pages/coach/test-entry/index?eventId=event-1",
      training: "/pages/coach/content-select/index?eventId=event-1",
      view: "/pages/coach/event/index?id=event-1",
    };

    Object.entries(routes).forEach(([action, route]) => {
      page.openTask({ currentTarget: { dataset: { id: "event-1", action } } });
      expect(mocks.openPage).toHaveBeenLastCalledWith(route);
    });
  });

  it("moves the coach date strip forward and backward by a full week", () => {
    const page = createPageInstance({ date: "2026-08-13" });

    page.changeWeek({ currentTarget: { dataset: { offset: 7 } } });
    expect(page.data.date).toBe("2026-08-20");
    page.changeWeek({ currentTarget: { dataset: { offset: -7 } } });
    expect(page.data.date).toBe("2026-08-13");
  });

  it("uses precomputed template fields and excludes Figma sample facts", () => {
    expect(template).toContain('wx:if="{{hasHeroEvent}}"');
    expect(template).toContain("c1-hero");
    expect(template).toContain('wx:if="{{hasVisibleEvents}}"');
    expect(template).not.toContain('<picker mode="date"');
    expect(template).not.toContain('data-mode="week"');
    expect(template).not.toContain("c1-task-section");
    expect(template).toContain('data-offset="-7"');
    expect(template).toContain('data-offset="7"');
    expect(template).toContain('bindtap="changeWeek"');
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("出席");
    expect(template).not.toContain("林教练");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toContain("17:30");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("uses the real local date rather than a fixed development date", () => {
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(controller).toContain("currentLocalDate");
    expect(controller).not.toContain("DEV_TEST_DATE");
  });

  it("keeps the coach avatar clear of the system menu capsule", () => {
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(controller).toContain("resolveMenuInset");
    expect(template).toContain('padding-right:{{menuInset}}px');
    expect(stylesheet).toMatch(/\.c1-nav\s*\{(?=[^}]*height:\s*176rpx)(?=[^}]*box-sizing:\s*content-box)/s);
  });

  it("keeps the live hero title and cards inside the C1 Figma width budget", () => {
    expect(stylesheet).toMatch(/\.c1-hero__title\s*\{[^}]*flex:\s*1[^}]*min-width:\s*0/s);
    expect(stylesheet).toMatch(/\.c1-hero\s*\{[^}]*min-height:\s*360rpx[^}]*padding:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.acard\s*\{[^}]*min-height:\s*192rpx[^}]*padding:\s*24rpx/s);
  });
});
