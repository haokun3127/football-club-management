import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachHome: vi.fn(),
  getCoachLessonConfirmation: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachHome: mocks.getCoachHome,
  getCoachLessonConfirmation: mocks.getCoachLessonConfirmation,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/date", () => ({
  currentLocalDate: () => "2026-08-28",
  shiftCalendarDate: (date, offset) => {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  },
}));
vi.mock("../../../utils/presentation", () => ({
  formatShortDate: (value) => String(value).slice(5, 10).replace("-", "月") + "日",
  formatTimeRange: () => "09:00–10:30",
}));

let pageDefinition;
globalThis.Page = (page) => {
  pageDefinition = page;
  return page;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const page = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  page.setData = (patch) => { page.data = { ...page.data, ...patch }; };
  return page;
}

const completedTraining = {
  id: "event-completed",
  type: "training",
  title: "真实训练课",
  startsAt: "2026-08-21T09:00:00.000Z",
  endsAt: "2026-08-21T10:30:00.000Z",
  venue: "真实场地",
  teamName: "真实队伍",
  status: "completed",
  participantCount: 2,
};

const incompleteTraining = {
  ...completedTraining,
  id: "event-not-settled",
  title: "尚未销课训练",
};

function home(events = [completedTraining, incompleteTraining]) {
  return {
    date: "2026-08-28",
    dateRange: { from: "2026-07-30", to: "2026-08-28" },
    teams: ["真实队伍"],
    events,
    tasks: [],
    summary: { total: events.length, training: events.length, matches: 0, pending: 0 },
    pendingItems: [],
  };
}

describe("coach lesson history", () => {
  beforeEach(() => {
    mocks.getCoachHome.mockReset().mockResolvedValue(home());
    mocks.getCoachLessonConfirmation.mockReset().mockImplementation(async (eventId) => ({
      participants: [{ studentId: "student-1" }, { studentId: "student-2" }],
      ledgers: eventId === "event-completed"
        ? [
          { studentId: "student-1", balance: 8, sourceIds: ["app-client-lesson-event-completed-student-1"] },
          { studentId: "student-2", balance: 7, sourceIds: ["app-client-lesson-event-completed-student-2"] },
        ]
        : [],
      pending: [],
    }));
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    globalThis.wx.navigateBack.mockReset();
  });

  it("keeps only completed training activities with real lesson ledger entries", async () => {
    const page = createPageInstance();
    await page.onLoad();

    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-07-30", to: "2026-08-28" });
    expect(mocks.getCoachLessonConfirmation).toHaveBeenCalledWith("event-completed");
    expect(mocks.getCoachLessonConfirmation).toHaveBeenCalledWith("event-not-settled");
    expect(page.data.rows).toEqual([
      expect.objectContaining({ id: "event-completed", title: "真实训练课", statusLabel: "已完成" }),
    ]);
    expect(page.data.rows.map((row) => row.id)).not.toContain("event-not-settled");
  });

  it("opens a real event detail route and keeps backend errors generic", async () => {
    const page = createPageInstance();
    await page.onLoad();
    page.openDetail({ currentTarget: { dataset: { id: "event-completed" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/lesson-detail/index?id=event-completed");

    mocks.getCoachHome.mockRejectedValueOnce(new Error("raw backend detail"));
    await page.retry();
    expect(page.data).toMatchObject({ state: "error", rows: [], message: "销课历史读取失败，请稍后重试。" });
    expect(page.data.message).not.toContain("raw backend detail");
  });

  it("does not present a partial ledger as a completed lesson history record", async () => {
    mocks.getCoachLessonConfirmation.mockResolvedValueOnce({
      participants: [{ studentId: "student-1" }, { studentId: "student-2" }],
      ledgers: [{ studentId: "student-1", sourceIds: ["app-client-lesson-event-completed-student-1"] }],
      pending: [],
    });

    const page = createPageInstance();
    await page.onLoad();

    expect(page.data.state).toBe("empty");
    expect(page.data.rows).toEqual([]);
  });

  it("keeps importer-backed lesson debits in history when their source belongs to the completed event", async () => {
    mocks.getCoachLessonConfirmation.mockResolvedValueOnce({
      participants: [{ studentId: "student-1" }, { studentId: "student-2" }],
      ledgers: [
        { studentId: "student-1", sourceIds: ["event-completed-student-1"] },
        { studentId: "student-2", sourceIds: ["event-completed-student-2"] },
      ],
      pending: [],
    });

    const page = createPageInstance();
    await page.onLoad();

    expect(page.data.state).toBe("ready");
    expect(page.data.rows).toHaveLength(1);
    expect(page.data.rows[0]).toMatchObject({ id: "event-completed", title: "真实训练课" });
  });

  it("matches the current C5 history board hierarchy without Figma sample records", () => {
    expect(template).toContain('<app-header theme="soft" title="销课历史" title-align="left" show-back />');
    expect(template).toContain('<view class="history-hero">');
    expect(template).toContain('<view class="history-hero__title">历史销课记录</view>');
    expect(template).toContain('{{historyTeamDateLabel}}');
    expect(template).toContain('{{historyTimeVenueLabel}}');
    expect(template).toContain("最近销课记录");
    expect(template).toContain("{{recordWindowLabel}} · {{recentRecordCount}} 条");
    expect(template).toContain('<view class="history-row__avatar">{{item.avatarLetter}}</view>');
    expect(template).toContain('<view class="history-actions__primary" bindtap="showAll">查看全部记录</view>');
    expect(template).toContain('<view class="history-actions__filter">按日期筛选</view>');
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("技术专项训练");
    expect(template).not.toContain('class="history-heading"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(styles).toContain("padding: 44rpx 44rpx 0;");
    expect(styles).toContain("padding-bottom: calc(324rpx + env(safe-area-inset-bottom));");
  });

  it("expands all real records without exceeding the API's 31-day history window", async () => {
    const page = createPageInstance();
    await page.onLoad();
    expect(page.data.recordWindowLabel).toBe("近 30 天");
    await page.showAll();

    expect(mocks.getCoachHome).toHaveBeenLastCalledWith({ from: "2026-07-30", to: "2026-08-28" });
    expect(page.data.recordWindowLabel).toBe("全部记录");
  });
});
