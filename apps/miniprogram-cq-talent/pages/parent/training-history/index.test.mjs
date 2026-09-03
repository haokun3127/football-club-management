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
    mocks.getParentGrowth.mockReset().mockResolvedValue({ timeline: [] });
  });

  it("loads and filters training history for the selected child", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      timeline: [{
        id: "training-student-2-training",
        eventId: "student-2-training",
        kind: "training",
        occurredAt: "2026-08-20T10:00:00.000Z",
        title: "第二位训练",
        subtitle: "完成训练",
        training: { items: [], lessonProgress: { attendedLessons: 5, expectedLessons: 6 } },
      }],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows.length).toBeGreaterThan(0);
    expect(page.data.rows.every((row) => row.id === "student-2-training")).toBe(true);
  });

  it("aligns the title with the Figma 44px title origin", () => {
    expect(styles).toMatch(/\.page-nav__title\s*\{[^}]*margin-left:\s*8rpx/);
  });

  it("renders the server-projected attendance progress for every completed training", async () => {
    mocks.getParentGrowth.mockResolvedValue({
      timeline: [{
        id: "training-2",
        kind: "training",
        occurredAt: "2026-08-20T10:00:00.000Z",
        title: "第二位训练",
        subtitle: "完成 2 项训练内容",
        teamName: "U10精英队",
        venue: "凤凰山足球公园",
        eventId: "student-2-training",
        training: { items: [], lessonProgress: { attendedLessons: 18, expectedLessons: 22 } },
      }],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows).toEqual([expect.objectContaining({ id: "student-2-training", lessonProgressLabel: "18/22课时" })]);
  });
});
