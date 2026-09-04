import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTeam: vi.fn(),
  getCoachStudentRadar: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachTeam: mocks.getCoachTeam,
  getCoachStudentRadar: mocks.getCoachStudentRadar,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

globalThis.wx = { navigateBack: mocks.navigateBack };

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
const apiSource = readFileSync(new URL("../../../utils/api.ts", import.meta.url), "utf8");
const typesSource = readFileSync(new URL("../../../utils/types.ts", import.meta.url), "utf8");
const backArrow = new URL("../../../assets/icons/c13-arrow-left.svg", import.meta.url);

const team = {
  team: { id: "team-1", name: "Actual team", season: "2026-2027" },
  stats: { memberCount: 2, trainingCount: 5, attendanceRate: 90 },
  members: [
    { id: "student-1", name: "Player One" },
    { id: "student-2", name: "Player Two" },
  ],
};

const validRadar = [
  { metricId: "passing", label: "Passing", value: 74, maxValue: 100, occurredAt: "2026-08-01T09:00:00.000Z" },
  { metricId: "shooting", label: "Shooting", value: 65, maxValue: 100, occurredAt: "2026-08-03T09:00:00.000Z" },
  { metricId: "speed", label: "Speed", value: 78, maxValue: 100, occurredAt: "2026-08-05T09:00:00.000Z" },
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

describe("coach student radar", () => {
  beforeEach(() => {
    mocks.getCoachTeam.mockReset().mockResolvedValue(team);
    mocks.getCoachStudentRadar.mockReset().mockResolvedValue(validRadar);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
    mocks.openPage.mockReset();
  });

  it("uses only a real team member, projects real dimensions, and preserves the assessment period", async () => {
    const page = createPageInstance();

    await page.load("student-not-in-team");

    expect(mocks.getCoachStudentRadar).toHaveBeenCalledWith("student-1");
    expect(page.data).toMatchObject({
      state: "ready",
      activeStudentId: "student-1",
      activeStudentName: "Play",
      assessmentPeriod: "2026-08-01 至 2026-08-05 评估",
      dimensions: [
        { metricId: "passing", value: "74", width: "74%" },
        { metricId: "shooting", value: "65", width: "65%" },
        { metricId: "speed", value: "78", width: "78%" },
      ],
    });
  });

  it("projects the real eight-metric response into the six Figma display axes without inventing values", async () => {
    mocks.getCoachStudentRadar.mockResolvedValueOnce([
      { metricId: "metric-cq-talent-core-03", label: "运控球", value: 66, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-10", label: "1v1", value: 70, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-18", label: "传接球", value: 74, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-27", label: "射门", value: 78, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-32", label: "小组配合", value: 82, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-48", label: "体能", value: 90, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-38", label: "整体战术", value: 86, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
      { metricId: "metric-cq-talent-core-56", label: "精神", value: 63, maxValue: 100, occurredAt: "2026-08-25T13:39:34.423Z" },
    ]);
    const page = createPageInstance();

    await page.load("student-1");

    expect(page.data.radar).toHaveLength(6);
    expect(page.data.dimensions.map((dimension) => dimension.label)).toEqual(["协作", "速度", "射门", "体能", "防守", "传球"]);
    expect(page.data.radar.map((metric) => metric.value)).toEqual([82, 66, 78, 90, 70, 74]);
  });

  it("does not request a radar when the scoped team has no members", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: null,
      stats: { memberCount: 0, trainingCount: 0, attendanceRate: null },
      members: [],
    });
    const page = createPageInstance();

    await page.load("");

    expect(mocks.getCoachStudentRadar).not.toHaveBeenCalled();
    expect(page.data).toMatchObject({ state: "empty", students: [], radar: [] });
  });

  it("navigates to another real team member's radar", async () => {
    const page = createPageInstance();
    await page.load("student-1");
    page.selectStudent({ currentTarget: { dataset: { id: "student-2" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/student-radar/index?student=student-2");
  });

  it("does not navigate when the active student is selected again", async () => {
    const page = createPageInstance();
    await page.load("student-1");
    page.selectStudent({ currentTarget: { dataset: { id: "student-1" } } });
    expect(mocks.openPage).not.toHaveBeenCalled();
  });

  it("shows an honest empty state instead of drawing invalid radar dimensions", async () => {
    mocks.getCoachStudentRadar.mockResolvedValueOnce([
      { metricId: "one", label: "One", value: 70, maxValue: 0 },
      { metricId: "two", label: "Two", value: Number.NaN, maxValue: 100 },
      { metricId: "three", label: "Three", value: Number.POSITIVE_INFINITY, maxValue: 100 },
    ]);
    const page = createPageInstance();

    await page.load("student-1");

    expect(page.data).toMatchObject({
      state: "empty",
      hasRadar: false,
      radar: [],
      dimensions: [],
      assessmentPeriod: "评估时间待同步",
    });
  });

  it("keeps one or two real dimensions visible without drawing a radar geometry", async () => {
    mocks.getCoachStudentRadar.mockResolvedValueOnce(validRadar.slice(0, 2));
    const page = createPageInstance();

    await page.load("student-1");

    expect(page.data).toMatchObject({
      state: "empty",
      hasRadar: false,
      radar: [],
      assessmentPeriod: "2026-08-01 至 2026-08-03 评估",
      dimensions: [
        { metricId: "passing", value: "74", width: "74%" },
        { metricId: "shooting", value: "65", width: "65%" },
      ],
    });
  });

  it("shows the pending assessment-time label when valid radar data has no occurredAt", async () => {
    mocks.getCoachStudentRadar.mockResolvedValueOnce(validRadar.map(({ occurredAt, ...point }) => point));
    const page = createPageInstance();

    await page.load("student-1");

    expect(page.data).toMatchObject({
      state: "ready",
      hasRadar: true,
      assessmentPeriod: "评估时间待同步",
    });
  });

  it("keeps a current radar failure safe and does not expose the upstream message", async () => {
    mocks.getCoachStudentRadar.mockRejectedValueOnce(new Error("raw radar upstream details"));
    const page = createPageInstance();

    await page.load("student-1");

    expect(page.data).toMatchObject({
      state: "error",
      hasRadar: false,
      radar: [],
      dimensions: [],
      message: "能力雷达读取失败，请稍后重试。",
    });
    expect(page.data.message).not.toContain("raw radar upstream details");
  });

  it("uses the V7 full-screen white header, large radar card, roster grid, and a template without method calls", () => {
    expect(existsSync(backArrow)).toBe(true);
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).not.toContain('"role-tabbar"');
    expect(template).toContain('class="radar-nav"');
    expect(template).toContain('padding-top:{{navInset}}px');
    expect(template).toContain('/assets/icons/c13-arrow-left.svg');
    expect(template).toContain('class="radar-context"');
    expect(template).toContain('class="radar-roster__grid"');
    expect(template).not.toContain('feedbackMessage');
    expect(template).not.toContain('student-strip');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).toContain('class="radar-hero"');
    expect(template).not.toContain('radarHeroClass');
    expect(controller).not.toContain('radarHeroClass');
    expect(stylesheet).toMatch(/\.radar-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)(?=[^}]*background:\s*#ffffff)/s);
    expect(stylesheet).toMatch(/\.radar-nav__back,\s*\.radar-nav__placeholder\s*\{(?=[^}]*width:\s*48rpx)(?=[^}]*height:\s*64rpx)/s);
    expect(stylesheet).toMatch(/\.radar-nav__title\s*\{(?=[^}]*text-align:\s*left)(?=[^}]*font-size:\s*36rpx)(?=[^}]*line-height:\s*44rpx)/s);
    expect(template).toMatch(/<radar-canvas[^>]*width="528rpx"[^>]*height="528rpx"/);
    expect(stylesheet).toMatch(/\.radar-hero\s*\{[^}]*position:\s*relative[^}]*height:\s*688rpx[^}]*overflow:\s*hidden/s);
    expect(stylesheet).toMatch(/\.radar-hero__plot\s*\{[^}]*justify-content:\s*center/s);
    expect(stylesheet).toMatch(/\.radar-hero__period\s*\{[^}]*color:\s*#a80f1b/s);
    expect(stylesheet).toMatch(/\.radar-roster__grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s);
    expect(stylesheet).not.toMatch(/width:\s*200%/);
    expect(stylesheet).not.toMatch(/transform:\s*scale\s*\(/);
    expect(controller).not.toContain("app-header");
  });

  it("keeps the Figma context line above the radar card", () => {
    expect(stylesheet).toMatch(/\.radar-context\s*\{[^}]*margin-bottom:\s*16rpx/s);
    expect(stylesheet).toMatch(/\.radar-page__body\s*\{[^}]*padding:[^}]*180rpx/s);
  });

  it("preserves only the source occurredAt field at the API boundary", () => {
    const normalizer = apiSource.slice(apiSource.indexOf("function normalizeRadarMetric"), apiSource.indexOf("function normalizeStudentHome"));

    expect(typesSource).toMatch(/interface RadarMetricPoint\s*\{[\s\S]*occurredAt\?: string;/);
    expect(normalizer).toMatch(/occurredAt:\s*stringOrUndefined\(record\?\.occurredAt\)/);
    expect(normalizer).not.toContain("updatedAt");
  });
});
