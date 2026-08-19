import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachHome: vi.fn(),
  getCoachTeam: vi.fn(),
  getCoachTrainingProjectTree: vi.fn(),
  getCoachWorkbench: vi.fn(),
  saveCoachTrainingProjects: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachHome: mocks.getCoachHome,
  getCoachTeam: mocks.getCoachTeam,
  getCoachTrainingProjectTree: mocks.getCoachTrainingProjectTree,
  getCoachWorkbench: mocks.getCoachWorkbench,
  saveCoachTrainingProjects: mocks.saveCoachTrainingProjects,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatCalendarDate: (value) => value.slice(0, 10),
  formatTimeRange: () => "17:30",
  resolveMenuInset: () => 88,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

const home = {
  date: "2026-08-01",
  dateRange: { from: "2026-08-01", to: "2026-08-31" },
  teams: ["Real team"],
  summary: { total: 3, training: 2, matches: 1, pending: 0 },
  tasks: [],
  pendingItems: [],
  events: [
    {
      id: "training-1",
      type: "training",
      title: "Real training title",
      startsAt: "2026-08-11T09:00:00.000Z",
      endsAt: "2026-08-11T10:30:00.000Z",
      venue: "Real venue",
      teamName: "Real team",
      status: "scheduled",
      participantCount: 12,
    },
    {
      id: "match-1",
      type: "match",
      title: "Real match title",
      startsAt: "2026-08-12T09:00:00.000Z",
      venue: "Match venue",
      status: "scheduled",
    },
    {
      id: "training-2",
      type: "training",
      title: "Normalized safe training title",
      startsAt: "2026-08-14T09:00:00.000Z",
      venue: "地点待确认",
      status: "completed",
    },
  ],
};

const team = {
  team: { id: "team-1", name: "Real team", season: "2026-2027" },
  stats: { trainingCount: 5, completedTrainingCount: 46, attendanceRate: null, memberCount: 9 },
  members: [],
};

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach training management", () => {
  beforeEach(() => {
    mocks.getCoachHome.mockReset().mockResolvedValue(home);
    mocks.getCoachTeam.mockReset().mockResolvedValue(team);
    mocks.getCoachTrainingProjectTree.mockReset();
    mocks.getCoachWorkbench.mockReset();
    mocks.saveCoachTrainingProjects.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T08:00:00.000Z"));
  });

  it("reads the explicit current month and maps only truthful coach metrics and training cards", async () => {
    const page = createPageInstance();
    await page.onLoad();

    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-08-01", to: "2026-08-31" });
    expect(mocks.getCoachTeam).toHaveBeenCalledTimes(1);
    expect(page.data).toMatchObject({
      state: "ready",
      heroMetrics: [
        { label: "累计课时", value: "46" },
        { label: "平均出勤", value: "--" },
        { label: "在队人数", value: "9" },
        { label: "本月比赛", value: "1" },
      ],
    });
    expect(page.data.trainingCards.map((item) => item.id)).toEqual(["training-1", "training-2"]);
    expect(page.data.trainingCards[0]).toMatchObject({
      title: "Real training title",
      venue: "Real venue",
      hasVenue: true,
      statusLabel: "已排定",
      statusTone: "scheduled",
      participantLabel: "12 人",
      hasParticipantCount: true,
    });
    expect(page.data.trainingCards[1]).toMatchObject({
      venue: "地点待确认",
      hasParticipantCount: false,
      statusLabel: "已结束",
      statusTone: "completed",
      hasStatus: true,
    });
  });

  it("makes no request for a non-coach and clears prior values after either read fails", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.onLoad();
    expect(mocks.getCoachHome).not.toHaveBeenCalled();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();

    const page = createPageInstance();
    await page.onLoad();
    mocks.getCoachTeam.mockRejectedValueOnce(new Error("raw upstream error"));
    await page.load();
    expect(page.data).toMatchObject({ state: "error", trainingCards: [] });
    expect(page.data.heroMetrics.map((item) => item.value)).toEqual(["--", "--", "--", "--"]);
    expect(page.data.message).not.toContain("raw upstream error");
  });

  it("navigates only with a real event ID or one of the fixed team pages", () => {
    const page = createPageInstance();
    page.openTrainingEvent({ currentTarget: { dataset: { id: "training-1" } } });
    page.openTeamAbility();
    page.openTeam();
    page.openTrainingEvent({ currentTarget: { dataset: {} } });

    expect(mocks.openPage).toHaveBeenNthCalledWith(1, "/pages/coach/event/index?id=training-1");
    expect(mocks.openPage).toHaveBeenNthCalledWith(2, "/pages/coach/team-ability/index");
    expect(mocks.openPage).toHaveBeenNthCalledWith(3, "/pages/coach/team/index");
    expect(mocks.openPage).toHaveBeenCalledTimes(3);
  });

  it("removes C10 writes and Figma samples while keeping the template declarative", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).toContain('"status-view"');
    expect(pageConfig).not.toContain('"submit-bar"');
    expect(pageConfig).not.toContain('"radar-canvas"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(controller).not.toContain("getCoachTrainingProjectTree");
    expect(controller).not.toContain("getCoachWorkbench");
    expect(controller).not.toContain("saveCoachTrainingProjects");
    expect(controller).not.toContain("openTestEntry");
    expect(controller).not.toContain("openContentSelect");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("keeps the training title clear of the system capsule", () => {
    expect(template).toContain('padding-right:{{menuInset}}px');
    expect(styles).toMatch(/\.c8-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(styles).toMatch(/\.c8-nav__title\s*\{[^}]*font-size:\s*36rpx[^}]*line-height:\s*44rpx/s);
  });

  it("uses the node 93:896 hero, tabs, and session-card geometry", () => {
    expect(styles).toContain("height: 360rpx");
    expect(styles).toContain("padding: 40rpx");
    expect(styles).toContain("border-radius: 32rpx");
    expect(styles).toContain("gap: 24rpx");
    expect(styles).toContain("min-height: 128rpx");
    expect(styles).toContain("height: 80rpx");
    expect(styles).toContain("padding: 32rpx 44rpx");
    expect(styles).toContain("min-height: 228rpx");
  });

  it("uses the refreshed C8 training-plan copy and localized status chips", () => {
    expect(template).toContain('<view class="c8-tab c8-tab--active">训练计划</view>');
    expect(template).toContain('session-card__status--{{item.statusTone}}');
  });
});
