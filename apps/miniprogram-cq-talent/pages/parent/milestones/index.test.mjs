import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  getParentGrowth: mocks.getParentGrowth,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
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
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

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
    mocks.getParentGrowth.mockReset().mockResolvedValue({
      timeline: [{ id: "student-2-training", kind: "training", occurredAt: "2026-08-20T10:00:00.000Z", title: "第二位训练", subtitle: "完成 1 项训练内容" }],
    });
  });

  it("requests growth data for the selected child instead of the first child", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getParentGrowth).toHaveBeenCalledWith("student-2", expect.objectContaining({ id: "student-2" }));
    expect(page.data.milestones[0]).toEqual(expect.objectContaining({ title: "第二位训练", state: "训练", detail: "完成 1 项训练内容" }));
  });

  it("aligns the title with the Figma 44px title origin", () => {
    expect(styles).toMatch(/\.page-nav__title\s*\{[^}]*margin-left:\s*8rpx/);
  });

  it("renders detailed training and match facts from the child-scoped timeline", async () => {
    mocks.getParentChildren.mockResolvedValue([{ id: "student-1", name: "真实学员", teams: [] }]);
    mocks.requireRole.mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.getParentGrowth.mockResolvedValue({
      timeline: [
        {
          id: "timeline-training", kind: "training", occurredAt: "2026-08-10T09:00:00.000Z", title: "U10 基础传接训练", subtitle: "完成 2 项训练内容",
          teamName: "U10 发展队", venue: "奥体中心 1 号场",
          training: { items: [{ trainingProjectId: "drill-1", name: "传接球", score: 91, note: "处理稳定" }] },
        },
        {
          id: "timeline-match", kind: "match", occurredAt: "2026-08-09T09:00:00.000Z", title: "周末友谊赛", subtitle: "对阵渝北青训",
          match: { scoreLabel: "3 : 2", events: [{ id: "match-event-1", studentId: "student-1", type: "goal", minute: 18 }] },
        },
      ],
    });
    const page = createPageInstance();

    await page.load();

    expect(page.data.state).toBe("ready");
    expect(page.data.milestones).toEqual([
      expect.objectContaining({ id: "timeline-training", title: "U10 基础传接训练", detail: "传接球：91分 · 处理稳定" }),
      expect.objectContaining({ id: "timeline-match", title: "周末友谊赛", detail: "比分 3 : 2 · 进球 18'" }),
    ]);
    expect(template).toContain("{{item.detail}}");
    expect(readFileSync(new URL("./index.ts", import.meta.url), "utf8")).not.toContain("getParentCalendar");
  });
});
