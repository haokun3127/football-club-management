import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentChildren: vi.fn(),
  getParentSchedule: vi.fn(),
  getParentStudentHome: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
  setCurrentStudentId: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentChildren: mocks.getParentChildren,
  getParentSchedule: mocks.getParentSchedule,
  getParentStudentHome: mocks.getParentStudentHome,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatDateTime: (value) => value,
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
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent profile hub", () => {
  beforeEach(() => {
    mocks.getParentChildren.mockReset().mockResolvedValue([
      { id: "student-1", name: "Player", teams: ["Team A"], coachNames: [] },
    ]);
    mocks.getParentSchedule.mockReset().mockResolvedValue([
      { id: "event-1", type: "training", title: "Actual training", startsAt: "2026-08-10T09:00:00.000Z", status: "completed", venue: "Field" },
    ]);
    mocks.getParentStudentHome.mockReset().mockResolvedValue({
      profile: [],
      lessonStatus: [{ label: "Remaining lessons", value: "12" }],
      insuranceStatus: [{ label: "Insurance", value: "Registered", status: "active" }],
      clubInfo: [],
      updatedAt: "2026-08-10T09:00:00.000Z",
    });
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-1" });
    mocks.setCurrentStudentId.mockReset();
  });

  it("uses only supplied status rows and child schedule activities", async () => {
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({ state: "ready", teamLabel: "Team A" });
    expect(page.data.heroStats).toEqual([{ label: "Remaining lessons", value: "12" }]);
    expect(page.data.recentActivities).toEqual([{ title: "Actual training", date: "2026-08-10T09:00:00.000Z" }]);
  });

  it("surfaces a student-home failure as the page error state", async () => {
    mocks.getParentStudentHome.mockRejectedValue(new Error("home unavailable"));
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({ state: "error", message: "home unavailable" });
  });

  it("does not render invented activities or reminders and keeps template expressions precomputed", () => {
    expect(template).toContain('wx:if="{{recentActivities.length}}"');
    expect(template).toContain("p7-card--pending");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
