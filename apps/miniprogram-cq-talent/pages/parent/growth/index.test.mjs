import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openPage: vi.fn(),
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  getParentMetricDetail: vi.fn(),
  requireRole: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
  getParentMetricDetail: mocks.getParentMetricDetail,
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

describe("parent growth training history", () => {
  beforeEach(() => {
    mocks.openPage.mockReset();
    mocks.getParentChildren.mockReset();
    mocks.getParentGrowth.mockReset();
    mocks.getParentMetricDetail.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.setCurrentStudentId.mockReset();
  });

  it("binds the training-history view action to its handler", () => {
    expect(template).toContain('<view class="p4-card__title">训练历程 📊</view><view class="p4-card__link" bindtap="openTrainingHistory">查看›</view>');
  });

  it("opens the existing status page for the active student", () => {
    const page = createPageInstance({ activeStudentId: "student-1" });

    page.openTrainingHistory();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/status/index?student=student-1");
  });

  it("does not navigate when no active student is available", () => {
    const page = createPageInstance({ activeStudentId: "" });

    page.openTrainingHistory();

    expect(mocks.openPage).not.toHaveBeenCalled();
  });

  it("draws the P4 radar only from three real metrics and leaves unsupported summary facts pending", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      heroName: "真实球员",
      heroTeam: "球队待同步",
      heroSummaryMessage: "训练概览待同步",
      milestoneMessage: "成长足迹数据待同步",
      trainingHistoryMessage: "训练历程数据待同步",
      canDrawRadar: true,
    });
    expect(page.data.radar).toHaveLength(3);
  });

  it("uses P4 empty states instead of sample milestones, month bars, or fallback team facts", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: [], coachNames: [] },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
      ],
      metricItems: [],
      views: [],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.state).toBe("empty");
    expect(page.data.canDrawRadar).toBe(false);
    expect(template).toContain('wx:if="{{growth && state === \'ready\'}}"');
    expect(template).toContain("p4-card__empty");
    expect(template).not.toContain("p4-bars");
    expect(template).not.toContain("1月");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(readFileSync(new URL("./index.ts", import.meta.url), "utf8")).not.toContain("重庆天才");
  });
});
