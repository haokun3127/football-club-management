import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();

globalThis.wx = {
  getStorageSync: vi.fn((key) => storage.get(key)),
  setStorageSync: vi.fn((key, value) => storage.set(key, value)),
  removeStorageSync: vi.fn((key) => storage.delete(key)),
};

const {
  clearMatchEventDraft,
  loadMatchEventDraft,
  matchEventDraftStorageKey,
  saveMatchEventDraft,
} = await import("./match-event-draft.ts");

describe("match-event draft", () => {
  beforeEach(() => {
    storage.clear();
    globalThis.wx.getStorageSync.mockClear();
    globalThis.wx.setStorageSync.mockClear();
    globalThis.wx.removeStorageSync.mockClear();
  });

  it("keys one valid local draft by event and preserves only real submit fields", () => {
    const saved = saveMatchEventDraft({
      eventId: "event-match-1",
      studentId: "student-1",
      type: "goal",
      minute: 12,
      note: "Recorded fact",
      updatedAt: "2026-08-10T12:00:00.000Z",
    });

    expect(matchEventDraftStorageKey("event-match-1")).not.toBe(matchEventDraftStorageKey("event-match-2"));
    expect(saved).toEqual({
      eventId: "event-match-1",
      studentId: "student-1",
      type: "goal",
      minute: 12,
      note: "Recorded fact",
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    expect(loadMatchEventDraft("event-match-1")).toEqual(saved);
  });

  it("ignores malformed, cross-event, and non-canonical local values", () => {
    storage.set(matchEventDraftStorageKey("event-match-1"), {
      eventId: "event-match-2",
      studentId: "student-1",
      type: "goal",
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    expect(loadMatchEventDraft("event-match-1")).toBeNull();

    storage.set(matchEventDraftStorageKey("event-match-1"), {
      eventId: "event-match-1",
      studentId: "student-1",
      type: "unsupported",
      minute: "12",
      updatedAt: "not-a-date",
    });
    expect(loadMatchEventDraft("event-match-1")).toBeNull();
  });

  it("clears only the matching event draft", () => {
    saveMatchEventDraft({ eventId: "event-match-1", studentId: "student-1", type: "goal", updatedAt: "2026-08-10T12:00:00.000Z" });
    saveMatchEventDraft({ eventId: "event-match-2", studentId: "student-2", type: "save", updatedAt: "2026-08-10T12:05:00.000Z" });

    clearMatchEventDraft("event-match-1");

    expect(loadMatchEventDraft("event-match-1")).toBeNull();
    expect(loadMatchEventDraft("event-match-2")).toEqual(expect.objectContaining({ studentId: "student-2", type: "save" }));
  });
});
