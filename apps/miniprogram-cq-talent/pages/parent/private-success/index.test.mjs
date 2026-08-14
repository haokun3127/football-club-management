import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrivateLessonRequests: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getPrivateLessonRequests: mocks.getPrivateLessonRequests,
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
globalThis.wx = {
  navigateBack: vi.fn(),
  reLaunch: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

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

const persistedRequest = {
  id: "request-1",
  studentId: "student-1",
  coachName: "Coach Chen",
  date: "2026-08-12",
  timeSlot: "10:00-11:00",
  goals: ["ball control", "shooting"],
  note: "Bring boots",
  status: "pending",
  createdAt: "2026-08-10T09:00:00.000Z",
};

describe("parent private lesson result", () => {
  beforeEach(() => {
    mocks.getPrivateLessonRequests.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.reLaunch.mockReset();
  });

  it("requires both returned request and real student identifiers before fetching", async () => {
    const page = createPageInstance();

    await page.onLoad({ request: "", student: "student-1" });

    expect(mocks.getPrivateLessonRequests).not.toHaveBeenCalled();
    expect(page.data).toMatchObject({ state: "error", request: null });
  });

  it("renders only the matching persisted request with precomputed summary fields", async () => {
    mocks.getPrivateLessonRequests.mockResolvedValue([persistedRequest]);
    const page = createPageInstance();

    await page.onLoad({ request: "request-1", student: "student-1" });

    expect(mocks.getPrivateLessonRequests).toHaveBeenCalledWith("student-1");
    expect(page.data).toMatchObject({
      state: "ready",
      requestId: "request-1",
      studentId: "student-1",
      request: {
        id: "request-1",
        studentId: "student-1",
        coachName: "Coach Chen",
        date: "2026-08-12",
        timeSlot: "10:00-11:00",
        goalsLabel: "ball control, shooting",
        note: "Bring boots",
        hasNote: true,
        status: "pending",
        statusLabel: "待处理",
        confirmHint: "Coach Chen将在 24 小时内确认",
      },
    });
  });

  it("does not render a result when the request is absent, cross-student, or unreadable", async () => {
    const failures = [
      [],
      [{ ...persistedRequest, studentId: "student-2" }],
      Object.assign(new Error("forbidden"), { status: 403 }),
    ];

    for (const failure of failures) {
      if (failure instanceof Error) {
        mocks.getPrivateLessonRequests.mockRejectedValueOnce(failure);
      } else {
        mocks.getPrivateLessonRequests.mockResolvedValueOnce(failure);
      }
      const page = createPageInstance();
      await page.onLoad({ request: "request-1", student: "student-1" });

      expect(page.data).toMatchObject({ state: "error", request: null });
    }
  });

  it("uses direct routes for schedule and home", () => {
    const page = createPageInstance();

    page.backToSchedule();
    page.backToHome();

    expect(globalThis.wx.reLaunch).toHaveBeenNthCalledWith(1, { url: "/pages/parent/schedule/index" });
    expect(globalThis.wx.reLaunch).toHaveBeenNthCalledWith(2, { url: "/pages/parent/schedule/index" });
  });

  it("does not retain route-derived success data or unsupported confirmation promises", () => {
    expect(template).toContain('state="{{state}}"');
    expect(template).toContain('wx:if="{{state === \'ready\' && request}}"');
    expect(template).toContain('<role-tabbar role="parent" active="child" />');
    expect(template).not.toContain("Coach Lin");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("query.coach");
    expect(controller).not.toContain("decodeURIComponent");
  });
});
