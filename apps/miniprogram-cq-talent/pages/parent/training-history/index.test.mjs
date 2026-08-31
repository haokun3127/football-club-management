import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/date", () => ({ resolveParentPageDate: () => "2026-08-28" }));
vi.mock("../../../utils/presentation", () => ({
  formatShortDate: () => "8月20日",
  formatTimeRange: () => "18:00–19:30",
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

describe("parent training history active student", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentChildren.mockReset().mockResolvedValue([
      { id: "student-1", name: "第一位学员", teams: [] },
      { id: "student-2", name: "第二位学员", teams: [] },
    ]);
    mocks.getParentCalendar.mockReset().mockResolvedValue([]);
  });

  it("loads and filters training history for the selected child", async () => {
    mocks.getParentCalendar.mockResolvedValue([
      { id: "student-2-training", type: "training", title: "第二位训练", startsAt: "2026-08-20T10:00:00.000Z", endsAt: "2026-08-20T11:30:00.000Z", status: "completed", childIds: ["student-2"] },
      { id: "student-1-training", type: "training", title: "第一位训练", startsAt: "2026-08-19T10:00:00.000Z", endsAt: "2026-08-19T11:30:00.000Z", status: "completed", childIds: ["student-1"] },
    ]);
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows.length).toBeGreaterThan(0);
    expect(page.data.rows.every((row) => row.id === "student-2-training")).toBe(true);
  });

  it("aligns the title with the Figma 44px title origin", () => {
    expect(styles).toMatch(/\.page-nav__title\s*\{[^}]*margin-left:\s*8rpx/);
  });
});
