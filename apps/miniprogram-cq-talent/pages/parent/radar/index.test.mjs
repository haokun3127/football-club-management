import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatDateTime: () => "2026-08-10 10:00",
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.setCurrentStudentId }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn(), showToast: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

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

describe("parent ability radar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getParentChildren.mockReset().mockResolvedValue([
      { id: "student-1", name: "Student One", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.setCurrentStudentId.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("draws only three or more quantified dimensions and labels their real count", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "Speed", value: 8, maxValue: 10 },
        { metricId: "passing", label: "Passing", value: undefined, maxValue: 10 },
        { metricId: "control", label: "Control", value: 7, maxValue: 10 },
        { metricId: "defence", label: "Defence", value: 6, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "Overview", metricIds: ["speed", "passing", "control", "defence"] }],
    });
    const page = createPageInstance();

    const loading = page.load();
    await vi.runAllTimersAsync();
    await loading;

    expect(page.data).toMatchObject({
      state: "ready",
      canDrawRadar: true,
      radarDimensionLabel: "3维能力模型",
      compositeScore: "",
    });
    expect(page.data.radar.map((point) => point.metricId)).toEqual(["speed", "control", "defence"]);
  });

  it("shows the model-defined overall score only when the server returns a real number", async () => {
    const dimensions = [
      { metricId: "speed", label: "Speed", value: 8, maxValue: 10 },
      { metricId: "control", label: "Control", value: 7, maxValue: 10 },
      { metricId: "defence", label: "Defence", value: 6, maxValue: 10 },
    ];
    const views = [{ id: "overview", name: "Overview", metricIds: ["speed", "control", "defence"] }];

    for (const [overall, expected] of [[86, 86], [null, ""], [undefined, ""]]) {
      mocks.getParentGrowth.mockResolvedValueOnce({ radar: dimensions, metricItems: [], views, overall });
      const page = createPageInstance();

      const loading = page.load();
      await vi.runAllTimersAsync();
      await loading;

      expect(page.data.compositeScore).toBe(expected);
    }
  });

  it("keeps every dimension of an eight-metric model instead of truncating to six", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "teamwork", label: "Teamwork", value: 65, maxValue: 100 },
        { metricId: "speed", label: "Speed", value: 75, maxValue: 100 },
        { metricId: "fitness", label: "Fitness", value: 90, maxValue: 100 },
        { metricId: "passing", label: "Passing", value: 68, maxValue: 100 },
        { metricId: "defence", label: "Defence", value: 82, maxValue: 100 },
        { metricId: "shooting", label: "Shooting", value: 71, maxValue: 100 },
        { metricId: "control", label: "Control", value: 86, maxValue: 100 },
        { metricId: "balance", label: "Balance", value: 78, maxValue: 100 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "Overview", metricIds: ["teamwork", "speed", "fitness", "passing", "defence", "shooting", "control", "balance"] }],
    });
    const page = createPageInstance();

    const loading = page.load();
    await vi.runAllTimersAsync();
    await loading;

    expect(page.data).toMatchObject({
      state: "ready",
      radarDimensionLabel: "8维能力模型",
      compositeScore: "",
      radarGeometry: "default",
    });
    expect(page.data.radar.map((point) => point.metricId)).toEqual([
      "teamwork", "speed", "fitness", "passing", "defence", "shooting", "control", "balance",
    ]);
    expect(template).toContain('geometry="{{radarGeometry}}"');
  });

  it("renders the full dimension set for three, six, eight and twelve dimension models", async () => {
    for (const total of [3, 6, 8, 12]) {
      mocks.getParentGrowth.mockResolvedValue({
        radar: Array.from({ length: total }, (_, index) => ({
          metricId: `metric-${index + 1}`,
          label: `维度${index + 1}`,
          value: 60 + index,
          maxValue: 100,
        })),
        metricItems: [],
        views: [{ id: "overview", name: "Overview", metricIds: Array.from({ length: total }, (_, index) => `metric-${index + 1}`) }],
      });
      const page = createPageInstance();

      const loading = page.load();
      await vi.runAllTimersAsync();
      await loading;

      expect(page.data.state).toBe("ready");
      expect(page.data.canDrawRadar).toBe(true);
      expect(page.data.radarDimensionLabel).toBe(`${total}维能力模型`);
      expect(page.data.radar).toHaveLength(total);
      expect(page.data.radar.map((point) => point.metricId)).toEqual(
        Array.from({ length: total }, (_, index) => `metric-${index + 1}`),
      );
    }
  });

  it("keeps the radar empty when fewer than three real values are available", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "Speed", value: 8, maxValue: 10 },
        { metricId: "passing", label: "Passing", value: undefined, maxValue: 10 },
        { metricId: "control", label: "Control", value: 7, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "Overview", metricIds: ["speed", "passing", "control"] }],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({ state: "empty", canDrawRadar: false, radarDimensionLabel: "" });
    expect(page.data.radar).toHaveLength(2);
  });

  it("keeps the composite score limited to the model-defined overall and peer baselines contract-gated", () => {
    expect(template).toContain("{{radarDimensionLabel}}");
    expect(template).not.toContain('bindtap="openMetricHistory"');
    expect(template).not.toContain("p5-nav__compare");
    expect(template).not.toContain("历史对比");
    expect(template).toContain("{{compositeScore}}");
    expect(template).toContain('src="/assets/icons/chevron-left.svg"');
    expect(template).toContain('width="100%" height="560rpx"');
    expect(template).not.toContain("peerPercent");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("peerPercent");
    expect(controller).not.toContain("openCompare");
    expect(controller).not.toContain("openMetricHistory");
    // F-03 回归守卫：控制器不得按固定维度数截断输入
    expect(controller).not.toMatch(/\.slice\(/);
    // F-04 回归守卫：不得用维度百分比均值自造综合分
    expect(controller).not.toContain("compositeScoreOf");
  });

  it("keeps the refreshed P5 geometry tokens aligned with the 375px Figma frame", () => {
    const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(stylesheet).toMatch(/\.p5-nav__back\s*\{[^}]*width:\s*48rpx[^}]*height:\s*80rpx/s);
    expect(stylesheet).toContain("font-size: 36rpx");
    expect(stylesheet).toContain(".p5-players { width: 100%; white-space: nowrap; background: #f6f7f9; }");
    expect(stylesheet).toMatch(/\.p5-body\s*\{[^}]*padding:\s*32rpx\s+32rpx\s+calc\(200rpx/s);
    expect(stylesheet).toContain(".rhero { display: flex; flex-direction: column; gap: 40rpx;");
    expect(stylesheet).toContain(".rhero__canvas { border-radius: 32rpx; background: #1f1f24; height: 560rpx;");
  });

  it("keeps the top bar focused on the page action instead of repeating a long student and team label", () => {
    expect(template).toContain('<view class="p5-nav__title">能力雷达</view>');
    expect(template).not.toContain("p5-nav__title-group");
    expect(template).not.toContain("activeChildName");
    expect(template).not.toContain("activeChildTeam");
    expect(controller).not.toContain("activeChildTeam");
  });

  it("keeps longer Chinese dimension labels on one line", () => {
    const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(stylesheet).toMatch(/\.dim-row__label\s*\{[^}]*width:\s*120rpx[^}]*white-space:\s*nowrap/s);
  });

  it("keeps the player selector at the 52px Figma height", () => {
    const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(stylesheet).toMatch(/\.p5-chip\s*\{[^}]*line-height:\s*16px/s);
  });

  it("keeps the top bar focused on the radar title after removing history comparison", () => {
    const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(template).toContain('style="padding-top:{{navInset}}px"');
    expect(template).not.toContain("padding-right:{{menuInset}}px");
    expect(controller).not.toContain("resolveMenuInset");
    expect(stylesheet).not.toContain(".p5-nav__compare");
    expect(stylesheet).toMatch(/\.p5-nav\s*\{[^}]*padding:\s*0\s+200rpx\s+0\s+32rpx/s);
  });
});
