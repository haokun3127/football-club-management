import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentMetricDetail: vi.fn(),
  getParentGrowth: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentMetricDetail: mocks.getParentMetricDetail,
  getParentGrowth: mocks.getParentGrowth,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  activityTypeLabel: (type) => type,
  formatDateTime: (value) => value,
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn(), showToast: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
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

describe("parent metric detail", () => {
  beforeEach(() => {
    mocks.getParentMetricDetail.mockReset();
    mocks.getParentGrowth.mockReset().mockResolvedValue({ radar: [] });
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  });

  it("renders a trend only from at least two real metric records", async () => {
    mocks.getParentMetricDetail.mockResolvedValue({
      metricId: "speed",
      label: "Speed",
      unit: "pts",
      maxValue: 100,
      latest: { value: 80 },
      records: [
        { id: "record-2", value: 80, occurredAt: "2026-08-10T09:00:00.000Z", source: "assessment" },
        { id: "record-1", value: 75, occurredAt: "2026-07-10T09:00:00.000Z", source: "assessment" },
      ],
      sourceEvents: [{ recordId: "record-2", eventId: "event-1", title: "Assessment", type: "assessment", startsAt: "2026-08-10T09:00:00.000Z" }],
    });
    const page = createPageInstance({ metricId: "speed", studentId: "student-1" });

    await page.load();

    expect(page.data).toMatchObject({ state: "ready", heroValue: "80", heroMaxLabel: "/ 100" });
    expect(page.data.chartPoints).toHaveLength(2);
    expect(page.data.chartSegments).toHaveLength(1);
    expect(page.data.chartAreaPath).toContain("polygon(");
    expect(page.data.yTicks).toEqual(["100", "75", "50", "25", "0"]);
    expect(page.data.chartPoints.map((point) => point.monthLabel)).toEqual(["7月", "8月"]);
    expect(page.data.records).toHaveLength(2);
  });

  it("does not draw a trend chart from a single real metric record", async () => {
    mocks.getParentMetricDetail.mockResolvedValue({
      metricId: "speed",
      label: "Speed",
      unit: "pts",
      latest: { value: 80 },
      records: [{ id: "record-1", value: 80, occurredAt: "2026-08-10T09:00:00.000Z", source: "assessment" }],
      sourceEvents: [],
    });
    const page = createPageInstance({ metricId: "speed", studentId: "student-1" });

    await page.load();

    expect(page.data.chartPoints).toEqual([]);
  });

  it("shows only personal history when an unapproved peer average is returned", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      radar: [{ metricId: "speed", label: "Speed", value: 80, maxValue: 100, peerAverage: 70 }],
    });
    mocks.getParentMetricDetail.mockResolvedValue({
      metricId: "speed",
      label: "Speed",
      unit: "分",
      maxValue: 100,
      latest: { value: 80 },
      records: [
        { id: "record-2", value: 80, occurredAt: "2026-08-10T09:00:00.000Z", source: "assessment", note: "传球视野开阔，继续保持。" },
        { id: "record-1", value: 75, occurredAt: "2026-07-10T09:00:00.000Z", source: "assessment" },
      ],
      sourceEvents: [],
    });
    const page = createPageInstance({ metricId: "speed", studentId: "student-1" });

    await page.load();

    expect(page.data).toMatchObject({
      coachCommentText: "传球视野开阔，继续保持。",
    });
    // REQ-PAR-004：不得基于统计均值生成高/低/达标徽标
    expect(page.data.peerBadgeLabel).toBeUndefined();
    expect(page.data.peerBadgeTone).toBeUndefined();
  });

  it("hides the statistical reference and coach comment when no real data backs them", async () => {
    mocks.getParentMetricDetail.mockResolvedValue({
      metricId: "speed",
      label: "Speed",
      unit: "pts",
      latest: { value: 80 },
      records: [{ id: "record-1", value: 80, occurredAt: "2026-08-10T09:00:00.000Z", source: "assessment" }],
      sourceEvents: [],
    });
    const page = createPageInstance({ metricId: "speed", studentId: "student-1" });

    await page.load();

    expect(page.data.peerAverageLabel).toBeUndefined();
    expect(page.data.coachCommentText).toBe("");
  });

  it("keeps WXML free of array helpers and gates optional cards on real fields", () => {
    expect(template).not.toContain("peerAverageLabel");
    expect(template).toContain('wx:if="{{detail && coachCommentText}}"');
    expect(template).toContain("p6-nav__range");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("switchRange");
  });

  it("never presents the statistical average as an age standard (F-05 / REQ-PAR-004)", () => {
    // 不得出现「同龄标准/应达标准」类措辞与基于均值的高/低徽标
    expect(template).not.toContain("同龄");
    expect(controller).not.toContain("同龄");
    expect(template).not.toContain("应达");
    expect(controller).not.toContain("应达");
    expect(controller).not.toContain("peerBadge");
    expect(controller).not.toContain("buildPeerView");
    expect(stylesheet).not.toMatch(/\.mhero__badge--(success|warning|info)/);
    expect(template).not.toContain("同队参考值");
    expect(template).not.toContain("统计均值");
    expect(template).toContain("变化记录");
  });

  it("anchors the title at the live Figma left origin", () => {
    expect(stylesheet).toMatch(/\.p6-nav__title\s*\{[^}]*position:\s*absolute[^}]*left:\s*84rpx/s);
  });
});
