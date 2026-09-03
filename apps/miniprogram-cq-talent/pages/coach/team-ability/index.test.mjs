import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTeam: vi.fn(),
  getCoachStudentRadar: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
  nextTick: vi.fn(),
  getStorageSync: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachTeam: mocks.getCoachTeam,
  getCoachStudentRadar: mocks.getCoachStudentRadar,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

globalThis.wx = {
  navigateBack: mocks.navigateBack,
  navigateTo: mocks.navigateTo,
  nextTick: mocks.nextTick,
  getStorageSync: mocks.getStorageSync,
};

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");
const backArrow = new URL("../../../assets/icons/c14-arrow-left.svg", import.meta.url);

const team = {
  team: { id: "team-weekend-select", name: "周末精英队", season: "2026-2027赛季" },
  stats: { memberCount: 3, trainingCount: 5, completedTrainingCount: 2, attendanceRate: 90 },
  members: [
    { id: "student-1", name: "罗志炫" },
    { id: "student-2", name: "骆啸宇" },
    { id: "student-3", name: "四字姓名测试" },
  ],
};

const validRadar = [
  { metricId: "passing", label: "传球", value: 82, maxValue: 100, occurredAt: "2026-09-01T09:00:00.000Z" },
  { metricId: "shooting", label: "射门", value: 74, maxValue: 100, occurredAt: "2026-09-01T09:00:00.000Z" },
  { metricId: "defending", label: "防守", value: 78, maxValue: 100, occurredAt: "2026-09-01T09:00:00.000Z" },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach ability assessment", () => {
  beforeEach(() => {
    mocks.getCoachTeam.mockReset().mockResolvedValue(team);
    mocks.getCoachStudentRadar.mockReset().mockResolvedValue(validRadar);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
    mocks.navigateTo.mockReset();
    mocks.nextTick.mockReset().mockImplementation((callback) => callback());
    mocks.getStorageSync.mockReset().mockReturnValue("team-weekend-select");
  });

  it("uses the training-management team context and renders the V7 team overview roster", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getCoachTeam).toHaveBeenCalledWith("team-weekend-select");
    expect(mocks.getCoachStudentRadar).toHaveBeenCalledTimes(3);
    expect(page.data).toMatchObject({
      state: "ready",
      teamContext: "周末精英队",
      summaryOverall: "78",
      summaryBestDimension: "传球",
      summaryNeedDimension: "射门",
      students: [
        expect.objectContaining({ id: "student-1", name: "罗志炫", scoreLabel: "78" }),
        expect.objectContaining({ id: "student-2", name: "骆啸宇", scoreLabel: "78" }),
        expect.objectContaining({ id: "student-3", name: "四字姓名", scoreLabel: "78" }),
      ],
    });

    await page.selectStudent({ currentTarget: { dataset: { id: "student-2" } } });

    expect(mocks.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining("student=student-2") }));
  });

  it("navigates from the team roster to a selected player's radar", async () => {
    const page = createPageInstance();
    await page.load();
    await page.selectStudent({ currentTarget: { dataset: { id: "student-2" } } });
    expect(mocks.navigateTo).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining("student=student-2") }));
  });

  it("preserves the selected team roster while reporting invalid radar data honestly", async () => {
    mocks.getCoachStudentRadar.mockResolvedValueOnce([
      { metricId: "one", label: "维度一", value: 70, maxValue: 0 },
      { metricId: "two", label: "维度二", value: Number.NaN, maxValue: 100 },
    ]);
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      hasTeam: true,
      hasStudents: true,
      hasRadar: false,
      radar: [],
      dimensions: [],
      message: "",
    });
  });

  it("does not call a team or radar endpoint for an ineligible coach and handles an empty selected team", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.load();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();
    expect(mocks.getCoachStudentRadar).not.toHaveBeenCalled();

    mocks.getCoachTeam.mockResolvedValueOnce({
      team: { id: "team-weekend-select", name: "周末精英队", season: "2026-2027赛季" },
      stats: { memberCount: 0, trainingCount: 0, completedTrainingCount: 0, attendanceRate: null },
      members: [],
    });
    const empty = createPageInstance();
    await empty.load();
    expect(mocks.getCoachStudentRadar).not.toHaveBeenCalled();
    expect(empty.data).toMatchObject({ state: "empty", hasTeam: true, hasStudents: false });
  });

  it("uses the C14 V3 team context, direct avatar grid, and WXML-safe bindings", () => {
    expect(existsSync(backArrow)).toBe(true);
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).not.toContain('"role-tabbar"');
    expect(pageConfig).toContain('"navigationBarTitleText": "能力评估"');
    expect(template).toContain('class="ability-context"');
    expect(template).toContain("当前训练球队");
    expect(template).toContain('class="ability-roster__grid"');
    expect(template).toContain('class="ability-summary"');
    expect(template).toContain('class="ability-player"');
    expect(template).toContain('bindtap="selectStudent"');
    expect(template).toContain('class="ability-player__name"');
    expect(template).not.toContain('radar-canvas');
    expect(template).not.toContain('ability-nav__export');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toMatch(/U10|2025|Player One|李明辉/);
    expect(controller).toContain('COACH_TRAINING_TEAM_KEY');
    expect(controller).toContain('getCoachStudentRadar');
    expect(controller).not.toContain('getCoachTeamAbilityOverview');
    expect(stylesheet).toMatch(/\.ability-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(stylesheet).toMatch(/\.ability-summary\s*\{(?=[^}]*height:\s*284rpx)(?=[^}]*background:\s*#07111f)/s);
    expect(stylesheet).toMatch(/\.ability-roster__grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    expect(stylesheet).toMatch(/\.ability-player__avatar\s*\{(?=[^}]*width:\s*80rpx)(?=[^}]*height:\s*80rpx)(?=[^}]*border-radius:\s*50%)/s);
    expect(stylesheet).toMatch(/\.ability-page\s*\{[^}]*padding-bottom:\s*48rpx/s);
  });
});
