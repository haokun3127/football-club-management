import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearMatchEventDraft: vi.fn(),
  createCoachMatchEvent: vi.fn(),
  createIdempotencyKey: vi.fn(),
  getCoachMatchDetail: vi.fn(),
  loadMatchEventDraft: vi.fn(),
  requireRole: vi.fn(),
  saveMatchEventDraft: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  createCoachMatchEvent: mocks.createCoachMatchEvent,
  getCoachMatchDetail: mocks.getCoachMatchDetail,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/idempotency", () => ({ createIdempotencyKey: mocks.createIdempotencyKey }));
vi.mock("../../../utils/match-event-draft", () => ({
  clearMatchEventDraft: mocks.clearMatchEventDraft,
  isMatchEventDraftType: (value) => ["goal", "assist", "save", "tackle", "yellow_card", "red_card", "penalty", "own_goal"].includes(value),
  loadMatchEventDraft: mocks.loadMatchEventDraft,
  saveMatchEventDraft: mocks.saveMatchEventDraft,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

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
    mocks.clearMatchEventDraft.mockReset();
    mocks.loadMatchEventDraft.mockReset().mockReturnValue(null);
    mocks.requireRole.mockReset().mockReturnValue({
      role: "coach",
      capabilities: { match: { eventTypes: ["goal", "save", "unsupported", "goal"] } },
    });
    mocks.saveMatchEventDraft.mockReset();
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

  it("writes only valid, user-modified form values and restores a compatible event-scoped local draft", async () => {
    const initial = createPageInstance();
    await initial.onLoad({ eventId: "event-match-1" });

    expect(mocks.saveMatchEventDraft).not.toHaveBeenCalled();

    initial.onMinuteInput({ detail: { value: "12" } });
    expect(mocks.saveMatchEventDraft).toHaveBeenLastCalledWith(expect.objectContaining({
      eventId: "event-match-1",
      studentId: "student-1",
      type: "goal",
      minute: 12,
      updatedAt: expect.any(String),
    }));

    mocks.loadMatchEventDraft.mockReturnValueOnce({
      eventId: "event-match-1",
      studentId: "student-2",
      type: "save",
      minute: 24,
      note: "Recorded fact",
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    const resumed = createPageInstance();
    await resumed.onLoad({ eventId: "event-match-1" });

    expect(resumed.data).toMatchObject({
      activeType: "save",
      playerIndex: 1,
      selectedPlayerName: "Athlete Two",
      minute: "24",
      note: "Recorded fact",
    });
    expect(mocks.saveMatchEventDraft).toHaveBeenCalledTimes(1);
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
    expect(mocks.clearMatchEventDraft).not.toHaveBeenCalled();

    mocks.createCoachMatchEvent.mockResolvedValueOnce({
      event: { id: "server-event", studentId: "student-1", type: "goal", minute: 12, note: "Recorded fact" },
    });
    await page.saveEvent();
    expect(mocks.createCoachMatchEvent).toHaveBeenCalledTimes(2);
    expect(mocks.createCoachMatchEvent.mock.calls[1][2]).toBe("match-event-stable-key");
    expect(mocks.clearMatchEventDraft).toHaveBeenCalledWith("event-match-1");
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
    expect(template).toContain('<app-header theme="soft" title="添加比赛事件" title-align="left" show-back />');
    expect(pageConfig).toContain('"app-header": "/components/app-header/index"');
    expect(template).not.toContain("Chen");
    expect(template).not.toContain("45");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("uses the Figma form hierarchy without adding non-capability event options", () => {
    const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(template).toContain('<status-view wx:if="{{state !== \'ready\' && state !== \'idle\'}}"');
    expect(template).toContain('class="match-event-types"');
    expect(template).toContain('class="match-event-form"');
    expect(template).toContain('class="match-event-form__field"');
    expect(template).toContain('<textarea class="note-input"');
    expect(template).toContain('<view class="section-title">时间</view>');
    expect(template).toContain('class="minute-control"');
    expect(template).toContain('class="save-button"');
    expect(template).toContain("提交事件");
    expect(styles).toMatch(/\.match-event-page__body\s*\{[^}]*gap:\s*48rpx/s);
    expect(styles).toMatch(/\.type-chip--active\s*\{[^}]*background:\s*#a80f1b/s);
    expect(styles).toMatch(/\.picker-row\s*\{[^}]*height:\s*96rpx/s);
    expect(styles).toMatch(/\.save-button\s*\{[^}]*height:\s*104rpx[^}]*border-radius:\s*52rpx/s);
    expect(template).not.toContain("换人");
    expect(template).not.toContain("其他");
  });
});
