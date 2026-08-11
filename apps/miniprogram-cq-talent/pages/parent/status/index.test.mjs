import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  getParentStudentHome: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
  getParentStudentHome: mocks.getParentStudentHome,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: () => undefined };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent lessons and insurance", () => {
  beforeEach(() => {
    mocks.getParentCalendar.mockReset();
    mocks.getParentChildren.mockReset();
    mocks.getParentStudentHome.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  });

  it("counts only completed trainings explicitly associated with the active child", () => {
    const page = createPageInstance();

    page.render(
      { id: "student-1", name: "Player", teams: [], coachNames: [] },
      { profile: [], lessonStatus: [], insuranceStatus: [{ label: "Insurance", value: "Unregistered" }], clubInfo: [] },
      [
        { id: "event-1", type: "training", title: "Player training", startsAt: "2026-08-09T09:00:00.000Z", endsAt: "2026-08-09T10:00:00.000Z", status: "completed", venue: "Field", childIds: ["student-1"] },
        { id: "event-2", type: "training", title: "Another child", startsAt: "2026-08-08T09:00:00.000Z", endsAt: "2026-08-08T10:00:00.000Z", status: "completed", venue: "Field", childIds: ["student-2"] },
        { id: "event-3", type: "training", title: "Unscoped training", startsAt: "2026-08-07T09:00:00.000Z", endsAt: "2026-08-07T10:00:00.000Z", status: "completed", venue: "Field" },
      ],
      new Date("2026-08-10T12:00:00.000Z"),
    );

    expect(page.data).toMatchObject({ totalCount: 1, monthCount: 1, seasonCount: 1, insuranceBadge: "待同步", insuranceBadgeTone: "neutral" });
    expect(page.data.history).toEqual([expect.objectContaining({ id: "event-1", title: "Player training" })]);
  });

  it("keeps unavailable history and insurance copy explicit without template method calls", () => {
    expect(template).toContain('wx:if="{{history.length}}"');
    expect(template).not.toContain("随队保险覆盖中");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("requests a live 30-day history window instead of the obsolete develop fixture date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T12:00:00.000Z"));
    mocks.getParentChildren.mockResolvedValue([{ id: "student-1", name: "Player", teams: [], coachNames: [] }]);
    mocks.getParentStudentHome.mockResolvedValue({ profile: [], lessonStatus: [], insuranceStatus: [], clubInfo: [] });
    mocks.getParentCalendar.mockResolvedValue([]);
    const page = createPageInstance();

    await page.load("student-1");

    expect(mocks.getParentCalendar).toHaveBeenCalledWith("2026-07-13", "2026-08-11");
  });
});
