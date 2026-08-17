import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTrainingCoverage: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachTrainingCoverage: mocks.getCoachTrainingCoverage }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 0 }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: mocks.navigateBack };

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

const coverage = [{
  studentId: "student-1",
  name: "Actual athlete",
  coveredCount: 2,
  totalCount: 3,
  dimensions: [
    { dimensionId: "dimension-1", label: "Actual metric", covered: true, scorePercent: 68.4 },
    { dimensionId: "dimension-2", label: "Pending metric", covered: false, scorePercent: null },
    { dimensionId: "dimension-3", label: "Zero metric", covered: true, scorePercent: 0 },
  ],
}];

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("C10.1 coach coverage preview", () => {
  beforeEach(() => {
    mocks.getCoachTrainingCoverage.mockReset().mockResolvedValue(coverage);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
  });

  it("makes no request without the coach role", async () => {
    mocks.requireRole.mockReturnValue(null);
    const page = createPageInstance();

    await page.onLoad();

    expect(mocks.getCoachTrainingCoverage).not.toHaveBeenCalled();
  });

  it("maps one real read without inventing students, dimensions, or score values", async () => {
    const page = createPageInstance();
    await page.onLoad();

    expect(mocks.getCoachTrainingCoverage).toHaveBeenCalledTimes(1);
    expect(page.data).toMatchObject({ state: "ready", hasStudents: true, menuInset: 16, coverageSummary: "已覆盖 2 项" });
    expect(page.data.students).toEqual([expect.objectContaining({
      studentId: "student-1",
      name: "Actual athlete",
      coverageLabel: "覆盖 2/3",
      dimensions: [
        expect.objectContaining({ label: "Actual metric", barWidth: 68, hasScore: true }),
        expect.objectContaining({ label: "Pending metric", barWidth: 0, hasScore: false, pendingLabel: "待同步" }),
        expect.objectContaining({ label: "Zero metric", barWidth: 0, hasScore: true }),
      ],
    })]);
  });

  it("handles empty data, safe errors, and retry without exposing backend text", async () => {
    mocks.getCoachTrainingCoverage.mockResolvedValueOnce([]);
    const empty = createPageInstance();
    await empty.onLoad();
    expect(empty.data).toMatchObject({ state: "empty", hasStudents: false, students: [] });

    mocks.getCoachTrainingCoverage.mockRejectedValueOnce(new Error("backend internal detail"));
    const failed = createPageInstance();
    await failed.onLoad();
    expect(failed.data).toMatchObject({ state: "error", hasStudents: false, students: [] });
    expect(failed.data.message).not.toContain("backend internal detail");

    await failed.retry();
    expect(mocks.getCoachTrainingCoverage).toHaveBeenCalledTimes(3);
  });

  it("treats the Figma confirmation as an honest local return instead of a fake coverage write", async () => {
    const page = createPageInstance();
    await page.onLoad();

    page.confirmCoverage();

    expect(mocks.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("ignores stale success and failure completions", async () => {
    let resolveOlder;
    let rejectOlder;
    const olderSuccess = new Promise((resolve) => { resolveOlder = resolve; });
    mocks.getCoachTrainingCoverage
      .mockImplementationOnce(() => olderSuccess)
      .mockResolvedValueOnce([]);
    const page = createPageInstance();
    const firstLoad = page.load();
    const secondLoad = page.load();
    await secondLoad;
    resolveOlder(coverage);
    await firstLoad;
    expect(page.data).toMatchObject({ state: "empty", students: [] });

    const olderFailure = new Promise((_, reject) => { rejectOlder = reject; });
    mocks.getCoachTrainingCoverage
      .mockImplementationOnce(() => olderFailure)
      .mockResolvedValueOnce(coverage);
    const failureLoad = page.load();
    const currentLoad = page.load();
    await currentLoad;
    rejectOlder(new Error("older failure"));
    await failureLoad;
    expect(page.data).toMatchObject({ state: "ready", hasStudents: true });
  });

  it("uses the C10.1 Figma-safe layout without a confirmation write or Figma sample facts", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('class="coverage-nav"');
    expect(template).toContain('padding-top:{{navInset}}px');
    expect(template).toContain('padding-right:{{menuInset}}px');
    expect(template).toContain('class="coverage-confirm"');
    expect(template).toContain('{{coverageSummary}}');
    expect(template).toContain('bindtap="confirmCoverage"');
    expect(template).toContain('<role-tabbar role="coach" active="training" />');
    expect(template).not.toContain("陈小宇");
    expect(template).not.toContain("林一诺");
    expect(template).not.toContain("王明");
    expect(template).not.toContain("已覆盖 3 项");
    expect(template).not.toContain('bindtap="save');
    expect(controller).toContain("confirmCoverage");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("saveCoachTrainingProjects");
    expect(stylesheet).toMatch(/\.coverage-nav\s*\{[^}]*height:\s*176rpx/s);
    expect(stylesheet).toMatch(/\.coverage-nav\s*\{[^}]*box-sizing:\s*content-box/s);
    expect(stylesheet).toMatch(/\.coverage-nav\s*\{[^}]*background:\s*#fceeef/s);
    expect(stylesheet).toMatch(/\.student-card\s*\{[^}]*border-radius:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.coverage-confirm\s*\{[^}]*min-height:\s*140rpx/s);
  });
});
