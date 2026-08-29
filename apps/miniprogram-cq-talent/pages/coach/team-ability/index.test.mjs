import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTeamAbilityOverview: vi.fn(),
  getCoachTeam: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  nextTick: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachTeamAbilityOverview: mocks.getCoachTeamAbilityOverview,
  getCoachTeam: mocks.getCoachTeam,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

globalThis.wx = { navigateBack: mocks.navigateBack, nextTick: mocks.nextTick };

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
const trendIcon = new URL("../../../assets/icons/c14-trending-up.svg", import.meta.url);

const overview = {
  studentCount: 3,
  overall: 74.4,
  trendDelta: 2,
  dimensions: [
    { metricId: "passing", label: "Passing", average: 74, top: 80, bottom: 45 },
    { metricId: "shooting", label: "Shooting", average: 135, top: 135, bottom: 42 },
    { metricId: "defending", label: "Defending", average: 70, top: 76, bottom: 58 },
  ],
};

const team = {
  team: { id: "team-1", name: "Actual team", season: "2026-2027" },
  stats: { memberCount: 3, trainingCount: 5, attendanceRate: 90 },
  members: [
    { id: "student-1", name: "Player One" },
    { id: "student-2", name: "Player Two" },
    { id: "student-3", name: "Player Three" },
  ],
};

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach team ability overview", () => {
  beforeEach(() => {
    mocks.getCoachTeamAbilityOverview.mockReset().mockResolvedValue(overview);
    mocks.getCoachTeam.mockReset().mockResolvedValue(team);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
    mocks.nextTick.mockReset().mockImplementation((callback) => callback());
  });

  it("reads overview and team once, then renders only real summary data", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getCoachTeamAbilityOverview).toHaveBeenCalledTimes(1);
    expect(mocks.getCoachTeam).toHaveBeenCalledTimes(1);
    expect(page.data).toMatchObject({
      state: "ready",
      teamContext: "2026-2027 · Actual team",
      assessmentPeriod: "评估时间待同步",
      studentCount: 3,
      overall: "74",
      showOverall: true,
      showTrend: true,
      hasRadar: true,
      radarMounted: true,
      radar: [
        { metricId: "passing", value: 74, maxValue: 100 },
        { metricId: "shooting", value: 100, maxValue: 100 },
        { metricId: "defending", value: 70, maxValue: 100 },
      ],
    });
    expect(controller).not.toContain("getCoachStudentRadar");
  });

  it("keeps the real overview when team metadata fails", async () => {
    mocks.getCoachTeam.mockRejectedValueOnce(new Error("raw team upstream details"));
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      overall: "74",
      teamContext: "团队信息待同步",
    });
    expect(page.data.message).not.toContain("raw team upstream details");
  });

  it("treats an overview failure as the primary error without exposing details", async () => {
    mocks.getCoachTeamAbilityOverview.mockRejectedValueOnce(new Error("raw overview upstream details"));
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "error",
      hasOverview: false,
      radar: [],
      dimensions: [],
      message: "团队能力读取失败，请稍后重试。",
    });
    expect(page.data.message).not.toContain("raw overview upstream details");
    expect(mocks.getCoachTeam).toHaveBeenCalledTimes(1);
  });

  it("does not read either endpoint for a non-coach and keeps insufficient data out of the radar", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.load();
    expect(mocks.getCoachTeamAbilityOverview).not.toHaveBeenCalled();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();

    mocks.getCoachTeamAbilityOverview.mockResolvedValueOnce({
      ...overview,
      dimensions: overview.dimensions.slice(0, 2),
    });
    const page = createPageInstance();
    await page.load();
    expect(page.data).toMatchObject({ state: "ready", hasOverview: true, hasRadar: false, showOverall: false, showTrend: false, radar: [] });
  });

  it("uses fixed Figma geometry and explicit unavailable states without sample data", () => {
    expect(existsSync(backArrow)).toBe(true);
    expect(existsSync(trendIcon)).toBe(true);
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="ability-nav"');
    expect(template).toContain('/assets/icons/c14-arrow-left.svg');
    expect(template).toContain('host-class="ability-hero__canvas"');
    expect(template).toContain('wx:if="{{radarMounted}}"');
    expect(template).not.toContain('class="ability-hero__radar-state"');
    expect(template).not.toContain('class="ability-hero__canvas-slot"');
    expect(template).toContain('class="ability-hero__empty"');
    expect(template).toMatch(/<radar-canvas[^>]*width="640rpx"[^>]*height="640rpx"/);
    expect(template).toContain("assessmentPeriod");
    expect(template).toContain("rankingMessage");
    expect(template).toContain('wx:if="{{showOverall}}"');
    expect(template).toContain('style="padding-top:{{navInset}}px;padding-right:{{menuInset}}px"');
    const exportControl = template.match(/<view[^>]*class="ability-nav__export"[^>]*>[\s\S]*?<\/view>/)?.[0] ?? "";
    expect(exportControl).not.toContain("bindtap");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toMatch(/2025|U10|李明辉|陈小宇|张伟|王浩|赵晨/);
    expect(controller).toContain("wx.nextTick");
    expect(stylesheet).toMatch(/\.ability-hero\s*\{[^}]*height:\s*1040rpx[^}]*overflow:\s*hidden/s);
    expect(stylesheet).toMatch(/\.ability-hero__plot\s*\{[^}]*height:\s*720rpx[^}]*justify-content:\s*center/s);
    expect(stylesheet).toMatch(/\.ability-hero__plot\s*\{(?=[^}]*flex-direction:\s*column)(?=[^}]*align-items:\s*center)/s);
    expect(stylesheet).toMatch(/\.ability-hero__canvas\s*\{[^}]*width:\s*640rpx[^}]*height:\s*640rpx[^}]*flex:\s*0\s+0\s+640rpx/s);
    expect(stylesheet).toMatch(/\.ability-hero__overall\s*\{[^}]*font-size:\s*96rpx[^}]*text-align:\s*center/s);
    expect(stylesheet).not.toMatch(/\.ability-hero__overall\s*\{[^}]*position:\s*absolute/s);
    expect(stylesheet).toMatch(/\.ability-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(stylesheet).toMatch(/\.ability-nav__title\s*\{[^}]*font-size:\s*36rpx[^}]*text-align:\s*left/s);
    expect(stylesheet).toMatch(/\.ability-nav__back\s*\{[^}]*width:\s*48rpx[^}]*height:\s*64rpx[^}]*flex:\s*0\s+0\s+48rpx/s);
    expect(stylesheet).toMatch(/\.ability-nav\s*\{[^}]*gap:\s*0/s);
    expect(stylesheet).toMatch(/\.ability-nav__export\s*\{[^}]*display:\s*flex[^}]*width:\s*104rpx[^}]*height:\s*58rpx/s);
  });

  it("uses the stacked progress-bar dimension rows from the live Figma board", () => {
    expect(template).toContain('class="dim-row__head"');
    expect(template).toContain('class="dim-row__track"');
    expect(template).toContain('style="width: {{item.progressStyle}}"');
    expect(template).toContain('class="dim-row__summary"');
    expect(template).not.toContain('class="dim-row__stats"');
    expect(stylesheet).toMatch(/\.dim-row\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*gap:\s*12rpx/s);
    expect(stylesheet).toMatch(/\.dim-row__track\s*\{[^}]*height:\s*12rpx[^}]*border-radius:\s*6rpx/s);
    expect(stylesheet).toMatch(/\.dim-row__fill\s*\{[^}]*background:\s*#a80f1b/s);
    expect(stylesheet).toMatch(/\.dim-row__summary\s*\{[^}]*font-size:\s*22rpx/s);
  });
});
