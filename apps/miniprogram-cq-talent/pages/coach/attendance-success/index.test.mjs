import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachWorkbench: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachWorkbench: mocks.getCoachWorkbench }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatCalendarDate: (value) => String(value).slice(0, 10),
  formatTimeRange: () => "09:00-10:00",
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

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

const workbench = {
  event: {
    id: "event-1",
    type: "training",
    title: "Ball-control session",
    startsAt: "2026-08-13T09:00:00.000Z",
    endsAt: "2026-08-13T10:00:00.000Z",
    venue: "North field",
    status: "scheduled",
  },
  roster: [
    { studentId: "student-present", name: "Athlete Present", status: "present" },
    { studentId: "student-late", name: "Athlete Late", status: "late" },
    { studentId: "student-absent", name: "Athlete Absent", status: "absent" },
    { studentId: "student-leave", name: "Athlete Leave", status: "leave_requested" },
    { studentId: "student-pending", name: "Athlete Pending", status: "pending" },
  ],
  workflow: [],
  training: [],
  selectedTrainingProjects: [],
  selectedTrainingProjectIds: [],
  match: [],
  pending: [],
};

describe("coach attendance success", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
  });

  it("reads the submitted activity back from its event ID and derives real attendance counts", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(workbench);
    const page = createPageInstance();

    await page.onLoad({ eventId: "event-1", title: "Do not trust query values", present: "20" });

    expect(mocks.getCoachWorkbench).toHaveBeenCalledWith("event-1");
    expect(page.data).toMatchObject({
      state: "ready",
      eventId: "event-1",
      eventTitle: "Ball-control session",
      eventDate: "2026-08-13",
      eventTime: "09:00-10:00",
      attendanceText: "2/5人",
      summary: { total: 5, present: 2, absent: 2, pending: 1 },
    });
  });

  it("never renders success for a missing ID or failed workbench readback", async () => {
    const missingPage = createPageInstance();
    await missingPage.onLoad({});
    expect(missingPage.data).toMatchObject({ state: "empty", eventId: "" });
    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();

    mocks.getCoachWorkbench.mockRejectedValue(Object.assign(new Error("forbidden details"), { status: 403 }));
    const forbiddenPage = createPageInstance();
    await forbiddenPage.onLoad({ eventId: "event-forbidden" });
    expect(forbiddenPage.data).toMatchObject({ state: "error", eventTitle: "", message: "出勤记录读取失败，请稍后重试。" });

    mocks.getCoachWorkbench.mockRejectedValueOnce(Object.assign(new Error("not found"), { status: 404 }));
    const missingEventPage = createPageInstance();
    await missingEventPage.onLoad({ eventId: "event-missing" });
    expect(missingEventPage.data.state).toBe("error");

    mocks.getCoachWorkbench.mockRejectedValueOnce(new Error("network error"));
    const networkPage = createPageInstance();
    await networkPage.onLoad({ eventId: "event-network" });
    expect(networkPage.data.state).toBe("error");
  });

  it("opens only real workbench and schedule routes", async () => {
    const page = createPageInstance({ eventId: "event-1" });
    page.openWorkbench();
    page.openSchedule();
    expect(mocks.openPage).toHaveBeenNthCalledWith(1, "/pages/coach/event/index?id=event-1");
    expect(mocks.openPage).toHaveBeenNthCalledWith(2, "/pages/coach/schedule/index");

    const emptyPage = createPageInstance();
    emptyPage.openWorkbench();
    expect(mocks.openPage).toHaveBeenCalledTimes(2);
  });

  it("keeps the template state-gated, data-driven, and free of unsafe WXML expressions", () => {
    expect(template).toContain('<app-header theme="soft" title="出勤管理" title-align="left" show-back />');
    expect(template).toContain('wx:elif="{{state === \'ready\'}}"');
    expect(template).toContain('bindtap="openWorkbench"');
    expect(template).toContain('bindtap="openSchedule"');
    expect(template).toContain("attendanceText");
    expect(template).toContain(">课程</text>");
    expect(template).toContain(">出席</text>");
    expect(template).not.toContain("hasVenue");
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("20人");
    expect(template).not.toContain("技术专项训练");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
