import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getParentGrowth: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentChildren: mocks.getParentChildren, getParentGrowth: mocks.getParentGrowth }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 0, resolveNavInset: () => 0 }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance() {
  return {
    ...pageDefinition,
    data: { ...pageDefinition.data },
    setData(patch) { this.data = { ...this.data, ...patch }; },
  };
}

describe("parent ability model history", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.getParentChildren.mockReset().mockResolvedValue([{ id: "student-1", name: "罗志炫", teams: ["U10精英队"] }]);
    mocks.getParentGrowth.mockReset().mockResolvedValue({
      timeline: [{
        id: "training-assessment-1",
        kind: "ability_update",
        occurredAt: "2026-09-04T10:20:00.000Z",
        title: "训练内容评测已记录",
        subtitle: "传接球 82 分",
        eventId: "event-training-1",
        abilityUpdate: {
          source: "training_content_assessment",
          metrics: [{ metricId: "passing", label: "传球", previousValue: 78, value: 82 }],
        },
      }],
    });
  });

  it("renders source, before/after value, delta, and an event source link from the real growth timeline", async () => {
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows).toEqual([expect.objectContaining({
      sourceLabel: "课堂训练",
      metricLabel: "传球 78 → 82",
      deltaLabel: "+4",
      sourceUrl: "/pages/parent/event/index?id=event-training-1",
    })]);
    expect(template).toContain("bindtap=\"openSource\"");
  });
});
