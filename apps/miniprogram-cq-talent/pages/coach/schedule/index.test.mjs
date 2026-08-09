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

  it("loads a Monday-to-Sunday range and presents only API-backed summary, teams, events, and tasks", async () => {
    mocks.getCoachHome.mockResolvedValue(home);
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13", viewMode: "week" });

    await page.load();

    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-08-10", to: "2026-08-16" });
    expect(page.data).toMatchObject({
      state: "ready",
      coachName: "Coach Chen",
      hasTeams: true,
      teamChips: [{ name: "U11 Red" }],
      hasTaskCards: true,
      taskCards: [{ eventId: "event-training-1", action: "attendance", label: "Record attendance" }],
      summaryItems: [
        { key: "training", value: "1" },
        { key: "match", value: "0" },
        { key: "pending", value: "1" },
      ],
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
      hasTeams: false,
      hasTaskCards: false,
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
      training: "/pages/coach/training/index?eventId=event-1",
      view: "/pages/coach/event/index?id=event-1",
    };

    Object.entries(routes).forEach(([action, route]) => {
      page.openTask({ currentTarget: { dataset: { id: "event-1", action } } });
      expect(mocks.openPage).toHaveBeenLastCalledWith(route);
    });
  });

  it("uses precomputed template fields and excludes Figma sample facts", () => {
    expect(template).toContain("hasTeams");
    expect(template).toContain('wx:if="{{hasTaskCards}}"');
    expect(template).toContain('wx:if="{{hasVisibleEvents}}"');
    expect(template).toContain('catchtap="openTask"');
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("出席");
    expect(template).not.toContain("林教练");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toContain("17:30");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
