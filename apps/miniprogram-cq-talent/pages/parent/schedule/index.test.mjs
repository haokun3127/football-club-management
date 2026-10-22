import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  getWindowInfo: () => ({ statusBarHeight: 20, windowWidth: 375 }),
  getMenuButtonBoundingClientRect: () => ({ top: 24, left: 300, width: 64, height: 32 }),
  getStorageSync: () => "",
  setStorageSync: () => {},
  removeStorageSync: () => {},
  navigateTo: () => {},
  reLaunch: () => {},
};
globalThis.Page = () => {};

const { buildScheduleDigest, presentNoticeBanner } = await import("./index.ts");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function event(overrides) {
  return {
    id: "event-1",
    type: "training",
    title: "U12 技术训练",
    startsAt: "2026-08-05T09:30:00.000Z",
    endsAt: "2026-08-05T11:00:00.000Z",
    venue: "奥体训练场",
    teamName: "U12 红队",
    status: "scheduled",
    ...overrides,
  };
}

describe("parent schedule", () => {
  it("summarizes only the selected club week, including its UTC boundary",()=>{
    const digest=buildScheduleDigest([
      event({id:"sunday-before",startsAt:"2026-08-02T15:59:00Z",endsAt:"2026-08-02T16:59:00Z"}),
      event({id:"monday",startsAt:"2026-08-02T16:00:00Z",endsAt:"2026-08-02T17:00:00Z"}),
      event({id:"sunday",startsAt:"2026-08-09T15:00:00Z",endsAt:"2026-08-09T15:30:00Z"}),
      event({id:"next-monday",startsAt:"2026-08-09T16:00:00Z",endsAt:"2026-08-09T17:00:00Z"}),
    ],"2026-08-05");
    expect(digest).toMatchObject({weekCount:2,weekHours:"1.5",todayCount:0});expect(digest).not.toHaveProperty("hero");
  });




  it("derives the P1 spacer from the shared device-width-aware top-bar helper", () => {
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(controller).toContain("resolveTopBarHeight");
    expect(controller).not.toContain("resolveNavInset() + 44");
  });

  it("connects the same controlled calendar without a second grid", () => {
    expect(template).toContain('<schedule-calendar class="schedule-calendar-widget" date="{{selectedDate}}" events="{{calendarEvents}}"');
    expect(template).toContain('bindchange="onCalendarChange" bindviewchange="onCalendarViewChange"');
    expect(template).not.toContain('class="month-calendar__grid"');
  });





  it("does not execute JavaScript collection or string methods in WXML", () => {
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("presents only real notice articles with precomputed Chinese summaries", () => {
    expect(presentNoticeBanner([
      { id: "guide", title: "训练指南", subtitle: "普通内容", accent: "#a80f1b", category: "guide", body: "不应展示" },
      { id: "notice-1", title: "本周训练安排提醒", subtitle: "请关注本周课程调整", accent: "#a80f1b", category: "notice", body: "本周六训练提前至上午九点，请家长及时查看日程安排。" },
    ])).toEqual({
      id: "notice-1",
      title: "本周训练安排提醒",
      summary: "请关注本周课程调整",
      metaLabel: "俱乐部公告",
      hasDetail: true,
    });
  });

  it("returns no banner for an empty or non-notice article list", () => {
    expect(presentNoticeBanner([])).toBeNull();
    expect(presentNoticeBanner([{ id: "guide", title: "训练指南", subtitle: "帮助", accent: "#a80f1b", category: "guide" }])).toBeNull();
    expect(presentNoticeBanner([{ id: "expired", title: "过期通知", subtitle: "不应展示", accent: "#a80f1b", category: "notice", expiresAt: "2020-01-01T00:00:00.000Z" }])).toBeNull();
  });

  it("uses publication dates only to control display and leaves source articles available for history", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-09-06T08:00:00Z"));
    try {
      const notice = { id: "n", title: "俱乐部活动", subtitle: "活动摘要", accent: "#a80f1b", category: "notice" };
      const future = { ...notice, id: "future", publishedAt: "2026-09-07T00:00:00Z" };
      const expired = { ...notice, id: "expired", expiresAt: "2026-09-06T08:00:00Z" };
      const active = { ...notice, id: "active", publishedAt: "2026-09-06T08:00:00Z", expiresAt: "2026-10-01T00:00:00Z" };
      const articles = [future, expired, active];
      expect(presentNoticeBanner(articles)).toMatchObject({ id: "active", metaLabel: "俱乐部公告" });
      expect(articles).toEqual([future, expired, active]);
      expect(presentNoticeBanner([future, expired])).toBeNull();
      expect(presentNoticeBanner([{ ...notice, publishedAt: "invalid" }])).toBeNull();
      expect(presentNoticeBanner([{ ...notice, expiresAt: "invalid" }])).toBeNull();
      expect(presentNoticeBanner([{ ...notice, subtitle: "   ", body: "完整正文" }])).toMatchObject({ summary: "完整正文" });
    } finally {
      clock.mockRestore();
    }
  });
});
