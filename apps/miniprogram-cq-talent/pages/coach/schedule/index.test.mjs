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
globalThis.wx = { reLaunch: vi.fn(), getStorageSync: vi.fn(), setStorageSync: vi.fn() };

const { buildMonthDays } = await import("./index.ts");

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
    globalThis.wx.getStorageSync.mockReset().mockReturnValue("");
  });

  it("shows the attendance capsule and weekly hero pills when the API provides them", async () => {
    mocks.getCoachHome.mockResolvedValue({
      ...home,
      summary: { total: 1, training: 1, matches: 0, pending: 1, attendance: { confirmed: 9, total: 10 } },
      weekStats: { sessions: 3, hours: 4.5, attendanceRate: 90 },
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.heroPills).toEqual([
      { value: "90%", label: "出席率", tone: "primary" },
      { value: "4.5h", label: "本周训练", tone: "neutral" },
      { value: "3节", label: "本周课次", tone: "neutral" },
    ]);
  });

  it("loads a Monday-to-Sunday range and presents only API-backed C1 summary, hero, and events", async () => {
    mocks.getCoachHome.mockResolvedValue(home);
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13", viewMode: "week" });

    await page.load();

    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-08-10", to: "2026-08-16" });
    expect(page.data).toMatchObject({
      state: "ready",
      coachName: "Coach Chen",
      selectedTeamName: "U11 Red",
      teamMetaLabel: "后台同步",
      hasHeroEvent: true,
      heroDateLabel: "2026年8月13日 周四",
      heroEvent: { id: "event-training-1", title: "Ball-control session", startTime: "09:00", hasDuration: true },
      hasVisibleEvents: true,
      visibleEvents: [{
        id: "event-training-1",
        coachName: "Coach Chen",
        typeLabel: "训练",
        typeTone: "training",
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

  it("builds a Monday-first month grid and returns to the selected day after collapsing", async () => {
    expect(buildMonthDays("2026-08", "2026-08-13", [])).toHaveLength(42);
    expect(buildMonthDays("2026-08", "2026-08-13", [home.events[0]]).find((day) => day.key === "2026-08-13")).toMatchObject({
      isSelected: true,
      hasTraining: true,
    });

    mocks.getCoachHome.mockResolvedValue(home);
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13" });
    await page.expandMonthPicker();
    expect(page.data).toMatchObject({ viewMode: "month", monthKey: "2026-08", monthLabel: "2026年8月" });
    await page.changeMonth({ currentTarget: { dataset: { offset: 1 } } });
    expect(page.data).toMatchObject({ viewMode: "month", date: "2026-09-01", selectedDate: "2026-09-01", monthKey: "2026-09" });
    await page.collapseMonthPicker();
    expect(page.data.viewMode).toBe("day");
  });

  it("keeps C1 week navigation visible and separately tappable", () => {
    expect(template).toContain('class="c1-dates__arrow c1-dates__arrow--previous" data-offset="-7" bindtap="changeWeek"');
    expect(template).toContain('class="c1-dates__arrow c1-dates__arrow--next" data-offset="7" bindtap="changeWeek"');
    expect(template).toContain('<image src="/assets/icons/chevron-left.svg" mode="aspectFit" />');
    expect(template).toContain('<image src="/assets/icons/chevron-right.svg" mode="aspectFit" />');
    expect(template).toContain('<block wx:if="{{viewMode === \'month\'}}">');
    expect(template).toContain('class="c1-month-calendar"');
    expect(template).toMatch(/(?:bindtap|catchtap)="expandMonthPicker"/);
    expect(template).toContain('<image class="c1-dates__expand-icon" src="/assets/icons/chevron-down-brand.svg" mode="aspectFit" />');
    expect(template).toContain('<image class="c1-month-calendar__collapse-icon" src="/assets/icons/chevron-down-brand.svg" mode="aspectFit" />');
    expect(template).toContain('class="c1-week-nav" bindtap="expandMonthPicker"');
    expect(stylesheet).toMatch(/\.c1-dates\s*\{[^}]*padding:\s*24rpx\s+0/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow\s*\{[^}]*flex:\s*0\s+0\s+44rpx/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow\s+image\s*\{[^}]*width:\s*28rpx[^}]*height:\s*28rpx/s);
    const expandMatches = [...stylesheet.matchAll(/\.c1-dates__expand\s*\{([^}]*)\}/g)];
    expect(expandMatches).toHaveLength(1);
    const expand = expandMatches[0]?.[1] ?? "";
    expect(expand).toContain("top: 50%");
    expect(expand).toContain("bottom: auto");
    expect(expand).toContain("transform: translateY(-50%)");
    expect(expand).not.toContain("bottom: -14rpx");
    expect(stylesheet).toMatch(/\.c1-dates__expand-icon\s*\{[^}]*width:\s*20rpx[^}]*height:\s*20rpx[^}]*transform:\s*none/s);
    expect(stylesheet).toContain(".c1-week-nav { padding-right: 68rpx; }");
  });

  it("renders the live C1 team selector before the hero and removes the legacy summary rail", async () => {
    mocks.getCoachHome.mockResolvedValue({ ...home, teams: ["U10精英队"] });
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      selectedTeamName: "U10精英队",
      hasTeams: true,
    });
    expect(template).toContain('class="c1-team-selector"');
    expect(template.indexOf("c1-team-selector")).toBeLessThan(template.indexOf("c1-hero"));
    expect(template).not.toContain('class="c1-summary"');
    expect(stylesheet).toMatch(/\.c1-team-selector\s*\{[^}]*height:\s*152rpx[^}]*border-radius:\s*24rpx/s);
  });

  it("restores a real selected team and limits C1 events to that team's API records", async () => {
    globalThis.wx.getStorageSync.mockReturnValue("U12 Blue");
    mocks.getCoachHome.mockResolvedValue({
      ...home,
      teams: ["U11 Red", "U12 Blue"],
      events: [
        home.events[0],
        { ...home.events[0], id: "event-training-2", teamName: "U12 Blue", title: "U12 session" },
      ],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.selectedTeamName).toBe("U12 Blue");
    expect(page.data.visibleEvents).toHaveLength(1);
    expect(page.data.visibleEvents[0]).toMatchObject({ id: "event-training-2", teamName: "U12 Blue" });
  });

  it("opens the dedicated full-screen selector instead of the team-detail page", () => {
    const page = createPageInstance({ hasTeams: true, selectedTeamName: "U11 Red" });

    page.openTeam();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/team-selector/index");
  });

  it("matches the C1 online hero and stats-row offsets without moving activity cards off their 22px rail", () => {
    expect(stylesheet).toMatch(/\.c1-nav\s*\{[^}]*padding:\s*0\s+32rpx/s);
    expect(stylesheet).toMatch(/\.c1-team-selector\s*\{[^}]*height:\s*152rpx[^}]*border-radius:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c1-body\s*\{[^}]*padding:\s*0\s+44rpx\s+calc\(148rpx\s*\+\s*env\(safe-area-inset-bottom\)\)/s);
    expect(stylesheet).toMatch(/\.c1-hero\s*\{[^}]*margin:\s*0\s+-12rpx/s);
    expect(stylesheet).toMatch(/\.c1-list\s*\{[^}]*margin-top:\s*24rpx/s);
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
    expect(stylesheet).toMatch(/\.c1-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(stylesheet).not.toMatch(/\.c1-nav\s*\{[^}]*height:\s*176rpx/s);
  });

  it("uses the live C1 root-page title typography", () => {
    expect(stylesheet).toMatch(/\.c1-nav__title\s*\{[^}]*font-size:\s*36rpx[^}]*line-height:\s*44rpx/s);
  });

  it("keeps the live hero title and cards inside the C1 Figma width budget", () => {
    expect(stylesheet).toMatch(/\.c1-hero__title\s*\{[^}]*flex:\s*1[^}]*min-width:\s*0/s);
    expect(stylesheet).toMatch(/\.c1-hero\s*\{[^}]*min-height:\s*360rpx[^}]*padding:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.acard\s*\{[^}]*min-height:\s*192rpx[^}]*padding:\s*24rpx/s);
  });

  it("keeps the hero time and activity title on one aligned row", () => {
    expect(stylesheet).toMatch(/\.c1-hero__main\s*\{(?=[^}]*display:\s*flex)(?=[^}]*flex-direction:\s*row)(?=[^}]*align-items:\s*baseline)/s);
    expect(stylesheet).toMatch(/\.c1-hero__title\s*\{[^}]*flex:\s*1[^}]*min-width:\s*0/s);
  });

  it("matches the live C1 stat-pill and hero scale", () => {
    expect(stylesheet).toMatch(/\.c1-hero\s*\{[^}]*gap:\s*24rpx[^}]*min-height:\s*360rpx/s);
    expect(stylesheet).toMatch(/\.c1-hero__time\s*\{[^}]*font-size:\s*108rpx[^}]*line-height:\s*108rpx/s);
    expect(stylesheet).toMatch(/\.c1-hero__pill\s*\{[^}]*padding:\s*16rpx\s+20rpx/s);
    expect(stylesheet).toMatch(/\.c1-hero__pill--primary\s*\{[^}]*background:\s*rgba\(168,15,27,\.1\)/s);
    expect(stylesheet).toMatch(/\.c1-hero__pill--primary\s*\{[^}]*border-color:\s*rgba\(168,15,27,\.2\)/s);
    expect(template).toContain('class="c1-hero__pill c1-hero__pill--{{item.tone}}"');
  });

  it("uses the project chevron asset for every activity card", () => {
    expect(template).toContain('<image class="acard__chevron" src="/assets/icons/chevron-right.svg" mode="aspectFit" />');
    expect(template).not.toContain('<view class="acard__chevron">›</view>');
    expect(stylesheet).toMatch(/\.acard__chevron\s*\{[^}]*width:\s*40rpx[^}]*height:\s*40rpx[^}]*flex:\s*0\s+0\s+40rpx/s);
  });

  it("keeps training and match previews distinguishable with precomputed Chinese type labels", async () => {
    mocks.getCoachHome.mockResolvedValue({
      ...home,
      events: [
        home.events[0],
        { ...home.events[0], id: "event-match-1", type: "match", title: "周末联赛" },
      ],
    });
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13", viewMode: "week" });

    await page.load();

    expect(page.data.visibleEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "event-training-1", typeLabel: "训练", typeTone: "training", typeColor: "#a80f1b" }),
      expect.objectContaining({ id: "event-match-1", typeLabel: "比赛", typeTone: "match", typeColor: "#1976d2" }),
    ]));
    expect(template).toContain('class="acard__type acard__type--{{item.typeTone}}"');
    expect(stylesheet).toContain(".acard__type--training");
    expect(stylesheet).toContain(".acard__type--match");
  });
});
