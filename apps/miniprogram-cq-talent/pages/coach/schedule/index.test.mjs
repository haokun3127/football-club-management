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
  resolveTopBarHeight: () => 44,
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
      hasHeroEvent: true,
      heroDateLabel: "2026年8月13日 周四",
      heroEvent: { id: "event-training-1", title: "Ball-control session", startTime: "09:00", hasDuration: true },
      hasVisibleEvents: true,
      visibleEvents: [{
        id: "event-training-1",
        typeLabel: "训练",
        typeTone: "training",
        hasTeamName: true,
        hasVenue: true,
        hasNextAction: true,
        nextAction: "attendance",
        nextActionLabel: "Record attendance",
      }],
    });
    expect(page.data.dayStrip.map((day) => day.weekLabel)).toEqual(["一", "二", "三", "四", "五", "六", "日"]);
    expect(page.data.collapsedDayStrip.map((day) => day.weekLabel)).toEqual(["一", "二", "三", "四", "五", "六", "日"]);
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
      match: "/pages/coach/match/index?id=event-1",
      assessment: "/pages/coach/test-entry/index?eventId=event-1",
      training: "/pages/coach/content-select/index?eventId=event-1",
      view: "/pages/coach/event/index?id=event-1",
    };

    Object.entries(routes).forEach(([action, route]) => {
      page.openTask({ currentTarget: { dataset: { id: "event-1", action } } });
      expect(mocks.openPage).toHaveBeenLastCalledWith(route);
    });
    page.openTask({ currentTarget: { dataset: { id: "event-1", action: "lesson" } } });
    expect(mocks.openPage).toHaveBeenLastCalledWith("/pages/coach/attendance/index?id=event-1");
  });

  it("moves the coach date strip forward and backward by a full week", () => {
    const page = createPageInstance({ date: "2026-08-13" });

    page.changeWeek({ currentTarget: { dataset: { offset: 7 } } });
    expect(page.data.date).toBe("2026-08-20");
    page.changeWeek({ currentTarget: { dataset: { offset: -7 } } });
    expect(page.data.date).toBe("2026-08-13");
  });

  it("builds a Monday-first month grid and returns to the selected day after collapsing", async () => {
    const monthDays = buildMonthDays("2026-08", "2026-08-13", []);
    expect(monthDays).toHaveLength(42);
    expect(monthDays.filter((day) => day.isCurrentMonth)).toHaveLength(31);
    expect(monthDays.filter((day) => !day.isCurrentMonth).every((day) => day.dayNumber === "")).toBe(true);
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

  it("stacks weekday over date in the C1 strip and reserves month expansion for its chevron", () => {
    expect(template).toContain('class="c1-dates__arrow c1-dates__arrow--previous" data-offset="-7" bindtap="changeWeek"');
    expect(template).toContain('class="c1-dates__arrow c1-dates__arrow--next" data-offset="7" bindtap="changeWeek"');
    expect(template).toContain('<image src="/assets/icons/chevron-left.svg" mode="aspectFit" />');
    expect(template).toContain('<view class="c1-month-calendar__arrow" data-offset="1" bindtap="changeMonth" aria-label="下个月"><image src="/assets/icons/chevron-right.svg" mode="aspectFit" /></view>');
    expect(template).toContain('<block wx:if="{{viewMode === \'month\'}}">');
    expect(template).toContain('class="c1-month-calendar"');
    expect(template).toMatch(/(?:bindtap|catchtap)="expandMonthPicker"/);
    expect(template).toContain('<view class="c1-month-calendar__collapse" bindtap="collapseMonthPicker" aria-label="收起月历"><image class="c1-month-calendar__collapse-icon" src="/assets/icons/chevron-down-brand.svg" mode="aspectFit" /></view>');
    expect(template).toContain('class="c1-week-nav"');
    expect(template).not.toContain('class="c1-week-nav" bindtap="expandMonthPicker"');
    expect(template).toContain('<view class="c1-week-nav__expand" catchtap="expandMonthPicker" aria-label="展开月历"><image class="c1-week-nav__expand-icon" src="/assets/icons/chevron-down-brand.svg" mode="aspectFit" /></view>');
    expect(template).toContain('wx:for="{{collapsedDayStrip}}"');
    expect(template).not.toContain('wx:for="{{dayStrip}}"');
    expect(template).toContain('data-date="{{item.date}}" catchtap="selectDay"');
    expect(template).toContain('<view class="c1-day__week">{{item.weekLabel}}</view>');
    expect(template).toContain('<view class="c1-day__num">{{item.dayNum}}</view>');
    expect(template).not.toContain('class="c1-day__label"');
    expect(stylesheet).toMatch(/\.c1-dates\s*\{[^}]*display:\s*block[^}]*height:\s*128rpx[^}]*padding:\s*0[^}]*border-radius:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow\s*\{[^}]*flex:\s*0\s+0\s+48rpx[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow\s*\{[^}]*top:\s*50%[^}]*transform:\s*translateY\(-50%\)/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow--previous\s*\{[^}]*left:\s*0[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow--next\s*\{[^}]*right:\s*0[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow--previous\s+image\s*\{[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c1-dates__arrow--next\s+image\s*\{[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c1-week-nav\s*\{[^}]*position:\s*absolute[^}]*top:\s*24rpx[^}]*left:\s*44rpx[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(7,\s*minmax\(0,\s*1fr\)\)[^}]*column-gap:\s*8rpx[^}]*width:\s*664rpx[^}]*padding:\s*0\s+84rpx\s+0\s+0/s);
    expect(stylesheet).toMatch(/\.c1-day\s*\{[^}]*flex:\s*0\s+0\s+88rpx[^}]*flex-direction:\s*column[^}]*height:\s*80rpx[^}]*border-radius:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c1-day__week\s*\{[^}]*color:\s*#667085[^}]*font-size:\s*20rpx[^}]*line-height:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c1-day__num\s*\{[^}]*color:\s*#202124[^}]*font-size:\s*24rpx[^}]*line-height:\s*28rpx/s);
    expect(stylesheet).toMatch(/\.c1-day--selected\s*\{[^}]*background:\s*#a80f1b/s);
    expect(stylesheet).toMatch(/\.c1-week-nav__expand\s*\{[^}]*position:\s*absolute[^}]*top:\s*50%[^}]*right:\s*12rpx[^}]*width:\s*60rpx[^}]*height:\s*32rpx[^}]*transform:\s*translateY\(-50%\)/s);
    expect(stylesheet).toMatch(/\.c1-week-nav__expand-icon\s*\{[^}]*width:\s*16rpx[^}]*height:\s*16rpx/s);
    expect(stylesheet).toMatch(/\.c1-day--selected\s+\.c1-day__week,\s*\.c1-day--selected\s+\.c1-day__num\s*\{[^}]*color:\s*#ffffff/s);
    expect(template).not.toContain('class="c1-dates__expand"');
    expect(stylesheet).toMatch(/\.c1-month-calendar\s*\{[^}]*min-height:\s*840rpx[^}]*margin:\s*32rpx\s+32rpx\s+0/s);
    expect(stylesheet).toMatch(/\.c1-month-calendar__collapse\s*\{[^}]*width:\s*60rpx[^}]*height:\s*32rpx[^}]*border-radius:\s*16rpx/s);
    expect(stylesheet).toMatch(/\.c1-month-calendar__collapse-icon\s*\{[^}]*width:\s*16rpx[^}]*height:\s*16rpx[^}]*line-height:\s*0/s);
    expect(template).not.toContain('>收起<image');
    expect(stylesheet).toMatch(/\.c1-month-day__number\s*\{[^}]*width:\s*80rpx[^}]*height:\s*80rpx/s);
    expect(template).toContain('class="c1-month-calendar__legend"');
    expect(template).toContain('绿色=训练');
    expect(template).toContain('蓝色=比赛');
    expect(stylesheet).toMatch(/\.c1-month-day__marker--match\s*\{[^}]*background:\s*#1976d2/s);
    expect(stylesheet).toMatch(/\.c1-month-calendar__grid\s*\{[^}]*grid-auto-rows:\s*96rpx/s);
  });

  it("keeps the month date circle separate from markers and keeps the legend close to the grid", () => {
    const grid = stylesheet.match(/\.c1-month-calendar__grid\s*\{([^}]*)\}/)?.[1] ?? "";
    const markers = stylesheet.match(/\.c1-month-day__markers\s*\{([^}]*)\}/)?.[1] ?? "";
    const legend = stylesheet.match(/\.c1-month-calendar__legend\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(grid).toContain("grid-auto-rows: 96rpx");
    expect(markers).toContain("bottom: 0");
    expect(legend).toContain("margin-top: 8rpx");
  });

  it("keeps all assigned-team events in C1 and removes the obsolete team selector", async () => {
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

    expect(page.data.eventViews).toHaveLength(2);
    expect(page.data.visibleEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "event-training-1", teamName: "U11 Red" }),
      expect.objectContaining({ id: "event-training-2", teamName: "U12 Blue" }),
    ]));
    expect(page.data).not.toHaveProperty("selectedTeamName");
    expect(page.data).not.toHaveProperty("hasTeams");
    expect(template).not.toContain('class="c1-team-selector"');
    expect(stylesheet).not.toContain(".c1-team-selector");
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(controller).not.toContain("coach-selected-team");
    expect(controller).not.toContain("resolveSelectedTeam");
    expect(controller).not.toContain("openTeam()");
  });

  it("keeps the all-teams context visible when the selected date has no events", () => {
    expect(template).toContain('wx:if="{{state !== \'loading\' && state !== \'error\'}}" class="c1-all-teams-context"');
    expect(template).toContain("全部球队课程/比赛安排");
    expect(template).not.toContain(">全部球队课程<");
    expect(template).not.toContain('class="c1-all-teams-context__copy"');
    expect(stylesheet).toMatch(/\.c1-all-teams-context\s*\{(?=[^}]*flex-direction:\s*row)(?=[^}]*height:\s*98rpx)/s);
  });

  it("matches the C1 online hero and stats-row offsets without moving activity cards off their 22px rail", () => {
    expect(stylesheet).toMatch(/\.c1-nav\s*\{[^}]*padding:\s*0\s+32rpx/s);
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
    expect(template).toContain('bindtap="changeWeek"');
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("出席");
    expect(template).not.toContain("林教练");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toContain("17:30");
    expect(template).not.toContain("acard__coach");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("keeps coach schedule course titles and locations fully readable without coach-name chips", () => {
    expect(stylesheet).toMatch(/\.acard__title\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*overflow:\s*visible)(?=[^}]*text-overflow:\s*clip)[^}]*\}/s);
    expect(stylesheet).toMatch(/\.acard__meta\s*\{(?=[^}]*white-space:\s*normal)(?=[^}]*text-overflow:\s*clip)[^}]*\}/s);
    expect(stylesheet).not.toContain(".acard__coach");
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

  it("pins the C1 top bar and reserves exactly its safe-area height in document flow", () => {
    expect(template).toContain('class="c1-top-spacer" style="height:{{topBarHeight}}px"');
    expect(stylesheet).toMatch(/\.c1-nav\s*\{(?=[^}]*position:\s*fixed)(?=[^}]*top:\s*0)(?=[^}]*z-index:\s*100)/s);
  });

  it("derives the C1 spacer from the shared device-width-aware top-bar helper", () => {
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(controller).toContain("resolveTopBarHeight");
    expect(controller).not.toContain("resolveNavInset() + 44");
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
      expect.objectContaining({ id: "event-training-1", typeLabel: "训练", typeTone: "training", cardTone: "training", typeColor: "#a80f1b" }),
      expect.objectContaining({ id: "event-match-1", typeLabel: "比赛", typeTone: "match", cardTone: "match", typeColor: "#69a5ff" }),
    ]));
    expect(template).toContain('class="acard acard--{{item.cardTone}}"');
    expect(stylesheet).toContain(".acard--match");
    expect(template).toContain('class="acard__type acard__type--{{item.typeTone}}"');
    expect(stylesheet).toContain(".acard__type--training");
    expect(stylesheet).toContain(".acard__type--match");
  });
});
