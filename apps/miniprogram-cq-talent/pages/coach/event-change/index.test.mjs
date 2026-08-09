import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCoachEventChangeRequest: vi.fn(),
  getCoachWorkbench: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  createCoachEventChangeRequest: mocks.createCoachEventChangeRequest,
  getCoachWorkbench: mocks.getCoachWorkbench,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = {
  navigateBack: vi.fn(),
  showToast: vi.fn(),
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
    startsAt: "2026-08-13T09:00:00+08:00",
    endsAt: "2026-08-13T10:00:00+08:00",
    venue: "North field",
    teamName: "U11 Red",
    status: "scheduled",
  },
  roster: [],
  workflow: [],
  training: [],
  selectedTrainingProjects: [],
  selectedTrainingProjectIds: [],
  match: [],
  pending: [],
};

async function loadReadyPage() {
  mocks.getCoachWorkbench.mockResolvedValue(workbench);
  const page = createPageInstance();
  await page.load("event-1");
  return page;
}

describe("coach activity change", () => {
  beforeEach(() => {
    mocks.createCoachEventChangeRequest.mockReset().mockResolvedValue(undefined);
    mocks.getCoachWorkbench.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("builds reason-specific payloads and rejects the original venue or datetime", async () => {
    const venuePage = await loadReadyPage();
    venuePage.inputVenue({ detail: { value: "North field" } });
    await venuePage.submit();
    expect(mocks.createCoachEventChangeRequest).not.toHaveBeenCalled();
    expect(venuePage.data).toMatchObject({ hasSubmitError: true, canSubmit: false });

    venuePage.inputVenue({ detail: { value: "South field" } });
    venuePage.inputNote({ detail: { value: "Venue maintenance" } });
    await venuePage.submit();
    expect(mocks.createCoachEventChangeRequest).toHaveBeenLastCalledWith("event-1", {
      reason: "venue",
      newVenue: "South field",
      note: "Venue maintenance",
    });

    const timePage = await loadReadyPage();
    timePage.selectReason({ currentTarget: { dataset: { index: 1 } } });
    timePage.selectDate({ detail: { value: "2026-08-13" } });
    timePage.selectTime({ detail: { value: "09:00" } });
    await timePage.submit();
    expect(timePage.data).toMatchObject({ hasSubmitError: true, canSubmit: false });

    timePage.selectTime({ detail: { value: "10:00" } });
    timePage.inputVenue({ detail: { value: "Ignored venue" } });
    timePage.inputNote({ detail: { value: "Move later" } });
    await timePage.submit();
    expect(mocks.createCoachEventChangeRequest).toHaveBeenLastCalledWith("event-1", {
      reason: "time",
      newStartsAt: "2026-08-13T10:00:00+08:00",
      note: "Move later",
    });

    const weatherPage = await loadReadyPage();
    weatherPage.selectReason({ currentTarget: { dataset: { index: 2 } } });
    weatherPage.selectDate({ detail: { value: "2026-08-14" } });
    weatherPage.selectTime({ detail: { value: "11:00" } });
    weatherPage.inputVenue({ detail: { value: "Ignored venue" } });
    weatherPage.inputNote({ detail: { value: "Weather alert" } });
    await weatherPage.submit();
    expect(mocks.createCoachEventChangeRequest).toHaveBeenLastCalledWith("event-1", {
      reason: "weather",
      note: "Weather alert",
    });
  });

  it("single-flights submission and returns only after the successful server response", async () => {
    let resolveRequest;
    mocks.createCoachEventChangeRequest.mockReturnValue(new Promise((resolve) => {
      resolveRequest = resolve;
    }));
    const page = await loadReadyPage();
    page.inputVenue({ detail: { value: "South field" } });

    const first = page.submit();
    const second = page.submit();
    expect(mocks.createCoachEventChangeRequest).toHaveBeenCalledTimes(1);
    expect(globalThis.wx.navigateBack).not.toHaveBeenCalled();

    resolveRequest();
    await Promise.all([first, second]);
    expect(globalThis.wx.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("keeps 400, 403, and 404 submit failures on the form without navigating", async () => {
    for (const failure of [
      Object.assign(new Error("bad request"), { status: 400 }),
      Object.assign(new Error("forbidden"), { status: 403 }),
      Object.assign(new Error("missing"), { status: 404 }),
    ]) {
      mocks.createCoachEventChangeRequest.mockRejectedValueOnce(failure);
      const page = await loadReadyPage();
      page.inputVenue({ detail: { value: "South field" } });
      await page.submit();

      expect(page.data).toMatchObject({ submitting: false, hasSubmitError: true });
      expect(globalThis.wx.navigateBack).not.toHaveBeenCalled();
    }
  });

  it("keeps missing, cancelled, and failed workbench loads as safe non-submit states", async () => {
    const missingPage = createPageInstance();
    await missingPage.load("");
    expect(missingPage.data).toMatchObject({ state: "empty", message: "缺少活动参数，请从活动详情页进入。" });

    mocks.getCoachWorkbench.mockRejectedValue(new Error("server detail"));
    const failedPage = createPageInstance();
    await failedPage.load("event-1");
    expect(failedPage.data).toMatchObject({ state: "error", message: "活动信息读取失败，请稍后重试。" });

    mocks.getCoachWorkbench.mockResolvedValue({ ...workbench, event: { ...workbench.event, status: "cancelled" } });
    const cancelledPage = createPageInstance();
    await cancelledPage.load("event-1");
    expect(cancelledPage.data).toMatchObject({ state: "empty", canSubmit: false });
  });

  it("uses precomputed fields and excludes Figma examples and unsupported notification actions", () => {
    expect(template).toContain('wx:if="{{requiresVenue}}"');
    expect(template).toContain('wx:if="{{requiresTime}}"');
    expect(template).toContain('wx:if="{{hasSubmitError}}"');
    expect(template).toContain('disabled="{{submitting}}"');
    expect(template).not.toContain("凤凰山");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("2025-07-10");
    expect(template).not.toContain("通知学员家长");
    expect(template).not.toContain("20 位家长");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
