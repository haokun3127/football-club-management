import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPrivateLessonRequest: vi.fn(),
  getParentChildren: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  createPrivateLessonRequest: mocks.createPrivateLessonRequest,
  getParentChildren: mocks.getParentChildren,
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
  redirectTo: vi.fn(),
  showToast: vi.fn(),
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

const child = {
  id: "student-1",
  name: "真实孩子",
  teams: [],
  coachNames: ["真实教练"],
};

function completeForm(page) {
  page.selectDate({ detail: { value: "2026-08-12" } });
  page.selectStartTime({ detail: { value: "10:00" } });
  page.selectEndTime({ detail: { value: "11:00" } });
  page.inputGoals({ detail: { value: "控球, 射门\n体能" } });
  page.inputNote({ detail: { value: "真实备注" } });
}

describe("parent private lesson form", () => {
  beforeEach(() => {
    mocks.createPrivateLessonRequest.mockReset();
    mocks.getParentChildren.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.redirectTo.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("uses only real coaches and precomputes user-entered time and goals", async () => {
    mocks.getParentChildren.mockResolvedValue([child]);
    const page = createPageInstance();

    await page.load("student-1");
    completeForm(page);

    expect(page.data).toMatchObject({
      state: "ready",
      studentId: "student-1",
      studentName: "真实孩子",
      coachOptions: ["真实教练"],
      selectedCoachName: "真实教练",
      startTime: "10:00",
      endTime: "11:00",
      timeSlot: "10:00-11:00",
      goals: ["控球", "射门", "体能"],
      canSubmit: true,
    });
    expect(page.data).not.toHaveProperty("timeSlots");
    expect(page.data).not.toHaveProperty("selectedGoals");
  });

  it("submits once and redirects only with the returned request and real student IDs", async () => {
    mocks.getParentChildren.mockResolvedValue([child]);
    let resolveRequest;
    mocks.createPrivateLessonRequest.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const page = createPageInstance();
    await page.load("student-1");
    completeForm(page);

    const first = page.submit();
    const second = page.submit();

    expect(mocks.createPrivateLessonRequest).toHaveBeenCalledTimes(1);
    expect(mocks.createPrivateLessonRequest).toHaveBeenCalledWith({
      studentId: "student-1",
      coachName: "真实教练",
      date: "2026-08-12",
      timeSlot: "10:00-11:00",
      goals: ["控球", "射门", "体能"],
      note: "真实备注",
    });

    resolveRequest({ id: "request-1", studentId: "student-1" });
    await Promise.all([first, second]);

    expect(globalThis.wx.redirectTo).toHaveBeenCalledWith({
      url: "/pages/parent/private-success/index?request=request-1&student=student-1",
    });
  });

  it("does not submit without a real coach and leaves 400, 403, and network failures on the form", async () => {
    mocks.getParentChildren.mockResolvedValue([{ ...child, coachNames: [] }]);
    const unassignedPage = createPageInstance();
    await unassignedPage.load("student-1");
    completeForm(unassignedPage);
    await unassignedPage.submit();

    expect(unassignedPage.data).toMatchObject({ hasCoaches: false, canSubmit: false });
    expect(mocks.createPrivateLessonRequest).not.toHaveBeenCalled();

    for (const failure of [
      Object.assign(new Error("bad request"), { status: 400 }),
      Object.assign(new Error("forbidden"), { status: 403 }),
      new Error("network unavailable"),
    ]) {
      mocks.getParentChildren.mockResolvedValue([child]);
      mocks.createPrivateLessonRequest.mockRejectedValueOnce(failure);
      const page = createPageInstance();
      await page.load("student-1");
      completeForm(page);
      await page.submit();

      expect(page.data.submitting).toBe(false);
      expect(page.data.hasFormMessage).toBe(true);
      expect(globalThis.wx.redirectTo).not.toHaveBeenCalled();
    }
  });

  it("keeps loading, empty, and fetch failures as visible page states", async () => {
    let resolveChildren;
    mocks.getParentChildren.mockReturnValue(new Promise((resolve) => {
      resolveChildren = resolve;
    }));
    const loadingPage = createPageInstance();
    const loading = loadingPage.load("student-1");

    expect(loadingPage.data).toMatchObject({ state: "loading", message: "正在读取孩子与教练信息" });
    resolveChildren([]);
    await loading;
    expect(loadingPage.data).toMatchObject({ state: "empty", message: "当前账号没有绑定孩子" });

    mocks.getParentChildren.mockRejectedValue(new Error("network unavailable"));
    const errorPage = createPageInstance();
    await errorPage.load("student-1");
    expect(errorPage.data).toMatchObject({ state: "error", message: "预约信息读取失败，请点击重试" });
  });

  it("does not expose sample slots, goals, prices, or unsupported confirmation promises", () => {
    expect(template).toContain('bindchange="selectStartTime"');
    expect(template).toContain('bindchange="selectEndTime"');
    expect(template).toContain('bindinput="inputGoals"');
    expect(template).toContain('wx:if="{{canSubmit && !submitting}}"');
    expect(template).not.toContain("09:00-10:00");
    expect(template).not.toContain("传球");
    expect(template).not.toContain("预计费用");
    expect(template).not.toContain("在线支付");
    expect(template).not.toContain("等待教练确认");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("TIME_SLOTS");
    expect(controller).not.toContain("const GOALS");
    expect(controller).not.toContain("待分配教练");
    expect(controller).not.toContain("coach=");
  });
});
