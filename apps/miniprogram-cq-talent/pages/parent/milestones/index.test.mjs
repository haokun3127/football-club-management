import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/date", () => ({ resolveParentPageDate: () => "2026-08-28" }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance() {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data },
    setData(patch) {
      this.data = { ...this.data, ...patch };
    },
  };
  return instance;
}

describe("parent milestones active student", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentChildren.mockReset().mockResolvedValue([
      { id: "student-1", name: "第一位学员", teams: [] },
      { id: "student-2", name: "第二位学员", teams: [] },
    ]);
    mocks.getParentGrowth.mockReset().mockResolvedValue({ radar: [] });
    mocks.getParentCalendar.mockReset().mockImplementationOnce(async () => [
      { id: "student-2-training", type: "training", title: "第二位训练", startsAt: "2026-08-20T10:00:00.000Z", status: "completed", childIds: ["student-2"] },
    ]).mockResolvedValue([]);
  });

  it("requests growth data for the selected child instead of the first child", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getParentGrowth).toHaveBeenCalledWith("student-2", expect.objectContaining({ id: "student-2" }));
    expect(page.data.milestones[0]).toEqual(expect.objectContaining({ title: "完成 1 次训练", state: "已达成" }));
  });

  it("aligns the title with the Figma 44px title origin", () => {
    expect(styles).toMatch(/\.page-nav__title\s*\{[^}]*margin-left:\s*8rpx/);
  });
});
