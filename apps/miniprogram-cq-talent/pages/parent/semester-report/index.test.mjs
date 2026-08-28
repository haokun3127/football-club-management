import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  requireRole: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: vi.fn() }));
vi.mock("../../../utils/presentation", () => ({
  formatDateTime: (value) => value,
  formatShortDate: (value) => value,
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.setCurrentStudentId }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

const { buildSemesterReportView } = await import("./index.ts");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent semester report", () => {
  const first = { id: "student-1", name: "罗一", teams: ["U10"], coachNames: [] };
  const second = { id: "student-2", name: "罗二", teams: ["U11"], coachNames: [] };

  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentChildren.mockReset().mockResolvedValue([first, second]);
    mocks.getParentGrowth.mockReset().mockResolvedValue({
      radar: [
        { metricId: "speed", label: "速度", value: 82, maxValue: 100 },
        { metricId: "control", label: "控球", value: 74, maxValue: 100 },
        { metricId: "pass", label: "传球", value: 68, maxValue: 100 },
      ],
      trainingStats: { totalTrainings: 12, attendanceRate: 92, monthTrainings: 4, monthly: [] },
      updatedAt: "2026-08-27T09:00:00.000Z",
      trainingHistory: [],
      milestones: [],
      metricItems: [],
      views: [],
    });
    mocks.getParentCalendar.mockReset()
      .mockResolvedValueOnce([
        { id: "event-2", type: "training", title: "真实训练", startsAt: "2026-08-20T09:00:00.000Z", endsAt: "2026-08-20T10:30:00.000Z", status: "completed", childIds: ["student-2"] },
        { id: "event-3", type: "match", title: "真实比赛", startsAt: "2026-08-21T09:00:00.000Z", endsAt: "2026-08-21T10:30:00.000Z", status: "completed", childIds: ["student-2"] },
      ])
      .mockResolvedValue([]);
    mocks.setCurrentStudentId.mockReset();
  });

  it("uses the session-selected child for growth and activity data", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getParentGrowth).toHaveBeenCalledWith("student-2", second);
    expect(page.data.activeStudentId).toBe("student-2");
    expect(page.data.activeStudentName).toBe("罗二");
    expect(page.data.report.trainingSummary.value).toBe("1 次");
    expect(page.data.report.matchSummary.value).toBe("1 场");
  });

  it("returns honest empty labels when real report data has no metrics or activities", () => {
    const report = buildSemesterReportView(
      { radar: [], trainingStats: undefined, updatedAt: undefined, trainingHistory: [], milestones: [], metricItems: [], views: [] },
      [],
      first,
    );

    expect(report.state).toBe("empty");
    expect(report.dimensions).toEqual([]);
    expect(report.metricsEmptyLabel).toBe("暂无能力数据");
    expect(report.activitiesEmptyLabel).toBe("暂无训练或比赛记录");
    expect(report.coachNoteLabel).toBe("暂无教练评语");
  });

  it("precomputes localized dimension bars, period and update labels", () => {
    const report = buildSemesterReportView(
      {
        radar: [
          { metricId: "speed", label: "速度", value: 82, maxValue: 100 },
          { metricId: "control", label: "控球", value: 74, maxValue: 100 },
          { metricId: "pass", label: "传球", value: 68, maxValue: 100 },
        ],
        trainingStats: { totalTrainings: 12, attendanceRate: 92, monthTrainings: 4, monthly: [] },
        updatedAt: "2026-08-27T09:00:00.000Z",
        trainingHistory: [],
        milestones: [],
        metricItems: [],
        views: [],
      },
      [],
      first,
    );

    expect(report.state).toBe("ready");
    expect(report.periodLabel).toBe("最近阶段");
    expect(report.updatedAtLabel).toBe("更新时间：2026-08-27T09:00:00.000Z");
    expect(report.overallLabel).toBe("75 分");
    expect(report.dimensions).toEqual([
      { label: "速度", valueLabel: "82分", percent: 82 },
      { label: "控球", valueLabel: "74分", percent: 74 },
      { label: "传球", valueLabel: "68分", percent: 68 },
    ]);
    expect(report.coachNoteLabel).toBe("暂无教练评语");
  });
});
