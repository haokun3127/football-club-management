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
  formatTimeOnly: (value) => new Date(Date.parse(value)+8*3600000).toISOString().slice(11,16),
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
  resolveTopBarHeight: () => 44,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { reLaunch: vi.fn(), getStorageSync: vi.fn(), setStorageSync: vi.fn(), showToast: vi.fn(), pageScrollTo: vi.fn() };

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
  dateRange: { from: "2026-08-09", to: "2026-08-16" },
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

  it("keeps team selection within this account and club and accepts server permission corrections", async () => {
    mocks.requireRole.mockReturnValue({role:"coach", userId:"coach-a", clubId:"club-a"});
    globalThis.wx.getStorageSync.mockReturnValue(["revoked", "team-a"]);
    mocks.getCoachHome.mockResolvedValue({...home, teamOptions:[{id:"team-a",name:"甲队"},{id:"team-b",name:"乙队"}], selectedTeamIds:["team-a"]});
    const page=createPageInstance({date:"2026-08-13"}); await page.load();
    expect(mocks.getCoachHome).toHaveBeenLastCalledWith({from:"2026-08-09",to:"2026-08-16",teamIds:["revoked","team-a"]});
    expect(globalThis.wx.setStorageSync).toHaveBeenLastCalledWith(expect.stringContaining("coach-team-selection:club-a:coach-a"),["team-a"]);
    mocks.getCoachHome.mockClear(); globalThis.wx.showToast.mockClear();
    await page.selectTeam({currentTarget:{dataset:{id:"team-a"}}});
    expect(mocks.getCoachHome).not.toHaveBeenCalled(); expect(globalThis.wx.showToast).toHaveBeenCalled();
    await page.selectTeam({currentTarget:{dataset:{id:"team-b"}}});
    expect(mocks.getCoachHome).toHaveBeenLastCalledWith(expect.objectContaining({teamIds:["team-a","team-b"]}));
    mocks.requireRole.mockReturnValue({role:"coach",userId:"coach-b",clubId:"club-b"}); globalThis.wx.getStorageSync.mockReturnValue([]);
    await page.load(); expect(mocks.getCoachHome).toHaveBeenLastCalledWith({from:"2026-08-09",to:"2026-08-16"});
  });

  it("keeps a cross-day assessment reachable without creating a fake deadline", async () => {
    const task={eventId:"assessment-a",taskId:"assessment-a",templateId:"template-a",title:"月度测评",action:"assessment",periodLabel:"8月",eventType:"training",label:"继续录入"};
    mocks.getCoachHome.mockResolvedValue({...home,events:[],tasks:[task]});
    const page=createPageInstance({date:"2026-09-01"}); await page.load();
    expect(page.data.hasTaskCards).toBe(true);expect(page.data.taskCards[0].hasDueAt).toBe(false);
    page.openAssessmentTask({currentTarget:{dataset:{id:"assessment-a"}}});
    expect(mocks.openPage).toHaveBeenCalledWith(expect.stringContaining("taskId=assessment-a&templateId=template-a"));
    page.setData({date:"2026-10-01"}); await page.load(); expect(page.data.taskCards[0].taskId).toBe("assessment-a");
  });

  it("ignores stale schedule responses", async () => {
    let resolve; mocks.getCoachHome.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue({...home,clubName:"新俱乐部"});
    const page=createPageInstance(); const first=page.load();await page.load();resolve({...home,clubName:"旧俱乐部"});await first;
    expect(page.data.clubName).toBe("新俱乐部");
  });

  it("uses selected-day weekly facts while keeping the full month for markers", async () => {
    mocks.getCoachHome.mockImplementation(async range => ({...home,
      events: range.from === range.to ? [home.events[0]] : [home.events[0],{...home.events[0],id:"later",startsAt:"2026-08-20T01:00:00Z"}],
      weekStats:range.from === range.to ? {sessions:3,hours:4.5} : {sessions:0,hours:0},
    }));
    const page=createPageInstance({date:"2026-08-13"}); await page.load();
    expect(page.data.eventViews).toHaveLength(2);
    expect(page.data.visibleEvents).toHaveLength(1);
    expect(page.data.heroPills).toEqual([{value:"4.5h",label:"本周安排时长",tone:"neutral"},{value:"3节",label:"本周安排",tone:"neutral"}]);
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
      { value: "4.5h", label: "本周安排时长", tone: "neutral" },
      { value: "3节", label: "本周安排", tone: "neutral" },
    ]);
  });

  it("loads the marker month and presents the selected day from API facts", async () => {
    mocks.getCoachHome.mockResolvedValue(home);
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13", viewMode: "day" });

    await page.load();

    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-08-09", to: "2026-08-16" });
    expect(page.data).toMatchObject({
      state: "ready",
      coachName: "Coach Chen",
      hasHeroEvent: true,
      heroDateLabel: "2026年8月13日 周四",
      heroEvent: { id: "event-training-1", title: "Ball-control session", startTime: "17:00", hasDuration: true },
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
    const page = createPageInstance({date:"2026-08-13"});

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

  it("keeps the authorized-team card, margined calendar card, and selected-team entry visible", () => {
    expect(template).toContain('class="c1-team-card"');
    expect(template).toContain("日程范围");

    expect(template).toContain('catchtap="toggleTeamPicker"');
    expect(template).toContain('class="c1-team-entry"');
    expect(template).toContain("查看所选队伍");
    expect(template).not.toContain(">全部球队课程<");
    expect(stylesheet).toMatch(/\.c1-team-strip\s*\{[^}]*margin:\s*16rpx\s+24rpx\s+0/s);
  });

  it("matches the C01 card layout: nav rail, margined calendar, and 24rpx body rail", () => {
    expect(template).toContain('<app-header title="日程"');
    expect(stylesheet).toMatch(/\.c1-body\s*\{[^}]*padding:\s*0\s+24rpx\s+24rpx/s);
    expect(stylesheet).toMatch(/\.c1-list\s*\{[^}]*margin-top:\s*24rpx/s);
  });

  it("uses precomputed template fields and excludes Figma sample facts", () => {
    expect(template).not.toContain('class="c1-hero"');

    expect(template).toContain('wx:if="{{hasVisibleEvents}}"');
    expect(template).not.toContain('<picker mode="date"');
    expect(template).not.toContain('data-mode="week"');
    expect(template).not.toContain("c1-task-section");
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





  it("derives the C1 spacer from the shared device-width-aware top-bar helper", () => {
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(controller).toContain("resolveTopBarHeight");
    expect(controller).not.toContain("resolveNavInset() + 44");
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
    const page = createPageInstance({ date: "2026-08-13", selectedDate: "2026-08-13", viewMode: "day" });

    await page.load();

    expect(page.data.visibleEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "event-training-1", typeLabel: "训练", typeTone: "training", cardTone: "training", typeColor: "#397ac7" }),
      expect.objectContaining({ id: "event-match-1", typeLabel: "比赛", typeTone: "match", cardTone: "match", typeColor: "#a80f1b" }),
    ]));
    expect(template).toContain('class="acard acard--{{item.cardTone}}"');
    expect(stylesheet).toContain(".acard--match");
    expect(template).toContain('class="acard__type acard__type--{{item.typeTone}}"');
    expect(stylesheet).toContain(".acard__type--training");
    expect(stylesheet).toContain(".acard__type--match");
  });
});
