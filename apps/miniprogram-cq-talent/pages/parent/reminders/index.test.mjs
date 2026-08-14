import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentReminders: vi.fn(),
  requireRole: vi.fn(),
  getReminderReadIds: vi.fn(),
  markAllRemindersRead: vi.fn(),
  countUnreadReminders: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentReminders: mocks.getParentReminders }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 0, resolveNavInset: () => 0 }));
vi.mock("../../../utils/reminders", () => ({
  getReminderReadIds: mocks.getReminderReadIds,
  markAllRemindersRead: mocks.markAllRemindersRead,
  countUnreadReminders: mocks.countUnreadReminders,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

globalThis.wx = { navigateBack: vi.fn() };

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

function dueAt(dayOffset) {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setHours(18, 30, 0, 0);
  return value.toISOString();
}

describe("parent reminders", () => {
  beforeEach(() => {
    mocks.getParentReminders.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    mocks.getReminderReadIds.mockReset().mockReturnValue([]);
    mocks.markAllRemindersRead.mockReset();
    mocks.countUnreadReminders.mockReset();
  });

  it("groups only API reminders and marks the visible items read locally", () => {
    const reminders = [
      { id: "today", type: "event_upcoming", severity: "info", studentId: "student-1", studentName: "真实球员", dueAt: dueAt(0), event: { id: "event-1", type: "training", title: "真实训练", startsAt: dueAt(0), endsAt: dueAt(0) } },
      { id: "earlier", type: "lesson_credit_low", severity: "warning", studentId: "student-1", studentName: "真实球员", dueAt: dueAt(-1), lessonCredit: { balance: 4 } },
    ];
    mocks.countUnreadReminders.mockReturnValue(2);
    const page = createPageInstance();

    page.render(reminders);
    page.markAllRead();

    expect(page.data).toMatchObject({ state: "ready", unreadCount: 0 });
    expect(page.data.today).toEqual([expect.objectContaining({ id: "today", title: "真实训练", read: true })]);
    expect(page.data.earlier).toEqual([expect.objectContaining({ id: "earlier", read: true })]);
    expect(mocks.markAllRemindersRead).toHaveBeenCalledWith([
      expect.objectContaining({ id: "today" }),
      expect.objectContaining({ id: "earlier" }),
    ]);
  });

  it("keeps list, empty, and error presentation states exclusive", async () => {
    const page = createPageInstance({ state: "ready", today: [{ id: "old" }], earlier: [{ id: "old-2" }], unreadCount: 2 });
    mocks.getParentReminders.mockRejectedValue(new Error("提醒读取失败"));

    await page.load();

    expect(page.data).toMatchObject({ state: "error", today: [], earlier: [], unreadCount: 0 });
    mocks.getParentReminders.mockResolvedValue([]);

    await page.load();

    expect(page.data).toMatchObject({ state: "empty", today: [], earlier: [], unreadCount: 0 });
    expect(template).toContain('wx:if="{{state === \'ready\'}}"');
    expect(template).toContain('wx:if="{{state === \'empty\'}}"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("uses the badge icon and blue accents for match reminders, calendar red for training", () => {
    const reminders = [
      { id: "match", type: "event_upcoming", severity: "info", studentId: "student-1", studentName: "真实球员", dueAt: dueAt(1), event: { id: "event-m", type: "match", title: "周末联赛", startsAt: dueAt(1), endsAt: dueAt(1) } },
      { id: "training", type: "event_upcoming", severity: "info", studentId: "student-1", studentName: "真实球员", dueAt: dueAt(1), event: { id: "event-t", type: "training", title: "体能训练", startsAt: dueAt(1), endsAt: dueAt(1) } },
    ];
    const page = createPageInstance();

    page.render(reminders);

    expect(page.data.earlier).toEqual([
      expect.objectContaining({ id: "match", iconSrc: "/assets/icons/reminder-badge.svg", iconBg: "#eff6ff", dotColor: "#1976d2" }),
      expect.objectContaining({ id: "training", iconSrc: "/assets/icons/tab-calendar.svg", iconBg: "#f3f4f6", dotColor: "#a80f1b" }),
    ]);
  });
});
