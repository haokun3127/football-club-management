import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCoachMatchEvent: vi.fn(),
  createIdempotencyKey: vi.fn(),
  getCoachMatchDetail: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  createCoachMatchEvent: mocks.createCoachMatchEvent,
  getCoachMatchDetail: mocks.getCoachMatchDetail,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/idempotency", () => ({ createIdempotencyKey: mocks.createIdempotencyKey }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

const detail = {
  event: {
    id: "event-match-1",
    type: "match",
    title: "Real match",
    startsAt: "2026-08-13T09:00:00.000Z",
    venue: "",
    status: "completed",
  },
  roster: [
    { studentId: "student-1", name: "Athlete One", status: "present" },
    { studentId: "student-2", name: "Athlete Two", status: "present" },
  ],
  match: { id: "match-1", status: "completed" },
  events: [],
};

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("C6.1 match event add", () => {
  beforeEach(() => {
    mocks.getCoachMatchDetail.mockReset().mockResolvedValue(detail);
    mocks.createCoachMatchEvent.mockReset();
    mocks.createIdempotencyKey.mockReset().mockReturnValue("match-event-stable-key");
    mocks.requireRole.mockReset().mockReturnValue({
      role: "coach",
      capabilities: { match: { eventTypes: ["goal", "save", "unsupported", "goal"] } },
    });
    globalThis.wx.navigateBack.mockReset();
  });

  it("uses detail roster plus capability types instead of the workbench, opener payload, or hardcoded chips", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-match-1" });

    expect(mocks.getCoachMatchDetail).toHaveBeenCalledWith("event-match-1");
    expect(page.data).toMatchObject({
      state: "ready",
      roster: [
        { studentId: "student-1", name: "Athlete One" },
        { studentId: "student-2", name: "Athlete Two" },
      ],
      eventTypes: [
        { value: "goal", label: "进球" },
        { value: "save", label: "扑救" },
      ],
    });
    expect(controller).not.toContain("getCoachWorkbench");
    expect(controller).not.toContain("getOpenerEventChannel");
    expect(controller).not.toContain("acceptMatchEvent");
    expect(controller).not.toContain("const EVENT_TYPES");
  });

  it("keeps a failed draft and retries only on an explicit second tap with the same key", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-match-1" });
    page.onMinuteInput({ detail: { value: "12" } });
    page.onNoteInput({ detail: { value: "Recorded fact" } });
    mocks.createCoachMatchEvent.mockRejectedValueOnce(new Error("network unavailable"));

    await page.saveEvent();
    expect(mocks.createCoachMatchEvent).toHaveBeenCalledWith(
      "event-match-1",
      { studentId: "student-1", type: "goal", minute: 12, note: "Recorded fact" },
      "match-event-stable-key",
    );
    expect(page.data).toMatchObject({
      submitting: false,
      minute: "12",
      note: "Recorded fact",
      operationKey: "match-event-stable-key",
    });
    expect(globalThis.wx.navigateBack).not.toHaveBeenCalled();

    mocks.createCoachMatchEvent.mockResolvedValueOnce({
      event: { id: "server-event", studentId: "student-1", type: "goal", minute: 12, note: "Recorded fact" },
    });
    await page.saveEvent();
    expect(mocks.createCoachMatchEvent).toHaveBeenCalledTimes(2);
    expect(mocks.createCoachMatchEvent.mock.calls[1][2]).toBe("match-event-stable-key");
    expect(globalThis.wx.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("rejects invalid minute input without a request", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-match-1" });
    page.onMinuteInput({ detail: { value: "12.5" } });

    await page.saveEvent();
    expect(mocks.createCoachMatchEvent).not.toHaveBeenCalled();
    expect(page.data).toMatchObject({ submitting: false, minute: "12.5" });
  });

  it("keeps template expressions safe and has no Figma sample facts", () => {
    expect(template).not.toContain("app-header");
    expect(template).not.toContain("Chen");
    expect(template).not.toContain("45");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
