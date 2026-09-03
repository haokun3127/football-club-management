import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openPage: vi.fn(),
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  getParentMetricDetail: vi.fn(),
  requireRole: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
  getParentMetricDetail: mocks.getParentMetricDetail,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatDateTime: () => "2026-08-10 10:00",
  formatTenure: (startsAt, prefix = "在队") => (startsAt ? `${prefix}1年7个月` : ""),
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
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

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
    mocks.getParentCalendar.mockReset().mockResolvedValue([]);
    mocks.getParentChildren.mockReset();
    mocks.getParentGrowth.mockReset();
    mocks.getParentMetricDetail.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.setCurrentStudentId.mockReset();
  });

  it("binds the training-history view action to its handler", () => {
    expect(template).toContain('<view class="p4-card__title">训练历程 📊</view><view class="p4-card__link" bindtap="openTrainingHistory">查看›</view>');
  });

  it("opens the training-history page", () => {
    const page = createPageInstance({ activeStudentId: "student-1" });

    page.openTrainingHistory();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/training-history/index");
  });

  it("refreshes growth after returning from the child switch and renders real recent activity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00.000Z"));
    mocks.requireRole.mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "第一位学员", teams: ["U8"], coachNames: [] },
      { id: "student-2", name: "第二位学员", teams: ["U9"], coachNames: [] },
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
    mocks.getParentCalendar.mockResolvedValue([
      { id: "training-1", type: "training", title: "训练复盘", startsAt: "2026-08-10T01:00:00.000Z", status: "completed", venue: "球场", childIds: ["student-2"] },
      { id: "match-1", type: "match", title: "友谊赛", startsAt: "2026-08-09T01:00:00.000Z", status: "completed", venue: "球场", childIds: ["student-2"] },
    ]);
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance({ activeStudentId: "student-1" });

    await page.onShow();

    expect(mocks.setCurrentStudentId).toHaveBeenCalledWith("student-2");
    expect(mocks.getParentGrowth).toHaveBeenCalledWith("student-2", expect.objectContaining({ name: "第二位学员" }));
    expect(mocks.getParentCalendar).toHaveBeenCalledWith("2026-07-13", "2026-08-11");
    expect(page.data).toMatchObject({
      activeStudentId: "student-2",
      heroName: "第二位学员",
      heroSummaryMessage: "近30天完成 1 次训练、1 场比赛",
      milestoneMessage: "最新足迹：训练复盘",
      trainingHistoryMessage: "近30天已完成 1 次训练，点击查看完整历程",
    });
    expect(page.data.milestones).toHaveLength(3);
    expect(page.data.trainingBars).toHaveLength(8);
  });

  it("opens the milestones page from the footprint card", () => {
    const page = createPageInstance({ activeStudentId: "" });

    page.openMilestones();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/milestones/index");
  });

  it("draws the P4 radar only from three real metrics and keeps activity copy explicit when none is returned", async () => {
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
      heroSummaryMessage: "近30天暂无已完成活动",
      milestoneMessage: "成长足迹正在积累",
      trainingHistoryMessage: "近30天暂无完成训练",
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
    expect(template).toContain("p4-milestone");
    expect(template).toContain("p4-bars");
    expect(template).not.toContain("1月");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(readFileSync(new URL("./index.ts", import.meta.url), "utf8")).not.toContain("重庆天才");
  });

  it("renders hero tags, stats panel, and monthly bars from server trainingStats", async () => {
    mocks.getParentChildren.mockResolvedValue([
      { id: "student-1", name: "真实球员", teams: ["U10 精英队"], coachNames: [], teamStartsAt: "2025-01-05" },
    ]);
    mocks.getParentGrowth.mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 8, maxValue: 10 },
        { metricId: "passing", label: "传球", value: 7, maxValue: 10 },
        { metricId: "control", label: "控球", value: 9, maxValue: 10 },
      ],
      metricItems: [],
      views: [{ id: "overview", name: "能力概览", metricIds: ["speed", "passing", "control"] }],
      trainingStats: {
        totalTrainings: 46,
        attendanceRate: 89,
        lessonStats: { attendedLessons: 41, expectedLessons: 46, attendanceRate: 89 },
        monthTrainings: 12,
        monthly: [
          { month: 1, count: 4 }, { month: 2, count: 6 }, { month: 3, count: 5 }, { month: 4, count: 8 },
          { month: 5, count: 7 }, { month: 6, count: 9 }, { month: 7, count: 5 }, { month: 8, count: 2 },
        ],
      },
    });
    mocks.getParentMetricDetail.mockResolvedValue({ metricId: "speed", label: "速度", records: [], sourceEvents: [] });
    const page = createPageInstance();

    await page.load();

    expect(page.data.heroTags).toEqual(["在队1年7个月", "训练46课"]);
    expect(page.data.heroStats).toEqual([
      { value: "41/46", label: "已到/应到课时", accent: false },
      { value: "89%", label: "出勤率", accent: true },
      { value: "12", label: "本月训练", accent: false },
    ]);
    expect(page.data.trainingBars.map((bar) => bar.label)).toEqual(["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月"]);
    expect(Math.max(...page.data.trainingBars.map((bar) => bar.height))).toBe(80);
    expect(template).toContain("p4-hero__stats");
    expect(template).toContain("p4-hero__tags");
  });

  it("keeps only the hero stats top divider and its internal separators from the Figma board", () => {
    expect(styles).not.toMatch(/\.p4-hero__stats\s*\{[^}]*border:\s*1rpx\s+solid\s+#334155/);
    expect(styles).toMatch(/\.p4-hero__stats\s*\{[^}]*border-top:\s*1rpx\s+solid\s+#334155/);
    expect(styles).toMatch(/\.p4-hero__stat\s*\+\s*\.p4-hero__stat\s*\{[^}]*border-left:\s*1rpx\s+solid\s+#334155/);
  });
});
