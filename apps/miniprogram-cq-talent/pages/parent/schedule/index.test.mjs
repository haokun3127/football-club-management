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

describe("parent schedule hero", () => {
  it("returns the real selected-date activity in upcoming mode", () => {
    const input = event({});

    const digest = buildScheduleDigest([input], "2026-08-05");

    expect(digest.hero).toMatchObject({
      mode: "upcoming",
      id: input.id,
      title: input.title,
      timeText: "17:30",
      teamName: input.teamName,
      venue: input.venue,
    });
  });

  it("returns real weekly statistics without fabricated activity fields in empty mode", () => {
    const events = [
      event({
        id: "monday-training",
        startsAt: "2026-08-03T09:00:00.000Z",
        endsAt: "2026-08-03T10:30:00.000Z",
      }),
      event({
        id: "friday-match",
        type: "match",
        title: "周五友谊赛",
        startsAt: "2026-08-07T14:00:00.000Z",
        endsAt: "2026-08-07T16:00:00.000Z",
      }),
    ];

    const digest = buildScheduleDigest(events, "2026-08-05");

    expect(digest.hero).toEqual({
      mode: "empty",
      todayLabel: "2026年8月5日 周三",
      weekCount: 2,
      weekHours: "3.5",
      title: "该日期暂无日程",
      description: "暂未安排训练、比赛或其他活动",
    });
    expect(digest.hero).not.toHaveProperty("id");
    expect(digest.hero).not.toHaveProperty("timeText");
    expect(digest.hero).not.toHaveProperty("teamName");
    expect(digest.hero).not.toHaveProperty("venue");
  });

  it("keeps an upcoming hero clickable with its real activity id", () => {
    const openingTag = template.match(/<view[^>]*wx:if="\{\{state === 'ready' && hero\.mode === 'upcoming'\}\}"[^>]*>/)?.[0] ?? "";

    expect(openingTag).toContain('class="hero"');
    expect(openingTag).toContain('data-id="{{hero.id}}"');
    expect(openingTag).toContain('bindtap="openEvent"');
  });

  it("renders a fixed-size non-clickable hero for an empty selected date", () => {
    const openingTag = template.match(/<view[^>]*wx:elif="\{\{state === 'ready' && hero\.mode === 'empty'\}\}"[^>]*>/)?.[0] ?? "";

    expect(openingTag).toContain('class="hero hero--empty"');
    expect(openingTag).not.toContain("bindtap");
    expect(openingTag).not.toContain("data-id");
    expect(template).toContain("{{hero.todayLabel}}");
    expect(template).toContain("{{hero.weekHours}}h");
    expect(template).toContain("{{hero.weekCount}}节");
    expect(template).toContain("{{hero.title}}");
    expect(template).toContain("{{hero.description}}");
    expect(styles).toMatch(/\.hero\s*\{[^}]*width:\s*686rpx;[^}]*height:\s*360rpx;/);
    expect(template).toContain('class="p1-empty-list"');
    expect(template).toContain('class="p1-empty-list__calendar"');
    expect(template).toContain('class="p1-empty-list__calendar-x"');
    expect(styles).toMatch(/\.p1-empty-list\s*\{[^}]*height:\s*360rpx;[^}]*background:\s*#ffffff/);
    expect(styles).toMatch(/\.p1-empty-list__icon\s*\{[^}]*width:\s*96rpx;[^}]*height:\s*96rpx;[^}]*background:\s*#f3f4f6/);
  });

  it("keeps both hero statistic rows at the Figma-aligned offset", () => {
    const heroStats = styles.match(/\.hero__stats\s*\{([^}]*)\}/)?.[1] ?? "";
    const emptyHeroStats = styles.match(/\.hero__stats--empty\s*\{([^}]*)\}/)?.[1] ?? "";
    const heroPill = styles.match(/\.hero__pill\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(heroStats).toContain("top: 274rpx");
    expect(emptyHeroStats).toContain("top: 274rpx");
    expect(heroPill).toContain("height: 62rpx");
  });

  it("keeps the weekly lesson-count metric on one line when the count is two digits or less", () => {
    const lastHeroPill = styles.match(/\.hero__pill:last-child\s*\{([^}]*)\}/)?.[1] ?? "";
    const heroPillValueRules = [...styles.matchAll(/\.hero__pill-value\s*\{([^}]*)\}/g)].map((match) => match[1]);

    expect(lastHeroPill).toContain("width: 196rpx");
    expect(heroPillValueRules).toContainEqual(expect.stringContaining("white-space: nowrap"));
  });

  it("aligns the schedule title with the right-side menu action baseline", () => {
    const nav = styles.match(/\.p1-nav\s*\{([^}]*)\}/)?.[1] ?? "";
    const title = styles.match(/\.p1-nav__title\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(template).toContain('<view class="p1-nav__title">日程</view>');
    expect(template).toContain('<image class="p1-nav__bell-icon" src="/assets/icons/bell.svg" mode="aspectFit" />');
    expect(nav).toContain("align-items: center");
    expect(nav).toContain("justify-content: space-between");
    expect(nav).not.toContain("padding-bottom");
    expect(title).not.toContain("position: absolute");
    expect(title).toContain("display: flex");
    expect(title).toContain("align-items: center");
    expect(title).toContain("font-size: var(--font-size-display)");
    expect(title).toContain("line-height: 1.5");
  });

  it("keeps one 88rpx content-box custom navigation rule", () => {
    const navRules = [...styles.matchAll(/(?:^|})\s*\.p1-nav\s*\{([^}]*)\}/g)].map((match) => match[1]);

    expect(navRules).toHaveLength(1);
    expect(navRules[0]).toContain("height: 88rpx");
    expect(navRules[0]).toContain("box-sizing: content-box");
    expect(navRules[0]).not.toContain("height: 176rpx");
    expect(navRules[0]).not.toContain("box-sizing: border-box");
  });

  it("pins the P1 top bar and reserves exactly its safe-area height in document flow", () => {
    const nav = styles.match(/\.p1-nav\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(template).toContain('class="p1-top-spacer" style="height:{{topBarHeight}}px"');
    expect(nav).toContain("position: fixed");
    expect(nav).toContain("top: 0");
    expect(nav).toContain("z-index: 100");
  });

  it("derives the P1 spacer from the shared device-width-aware top-bar helper", () => {
    const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

    expect(controller).toContain("resolveTopBarHeight");
    expect(controller).not.toContain("resolveNavInset() + 44");
  });

  it("connects the same controlled calendar without a second grid", () => {
    expect(template).toContain('<schedule-calendar date="{{selectedDate}}" events="{{calendarEvents}}"');
    expect(template).toContain('bindchange="onCalendarChange" bindviewchange="onCalendarViewChange"');
    expect(template).not.toContain('class="month-calendar__grid"');
  });

  it("uses the Figma bell asset with explicit outer and leaf sizing", () => {
    const bell = styles.match(/\.p1-nav__bell\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellIcon = styles.match(/\.p1-nav__bell-icon\s*\{([^}]*)\}/)?.[1] ?? "";
    const clock = styles.match(/\.acard__clock\s*\{([^}]*)\}/)?.[1] ?? "";
    const chevron = styles.match(/\.acard__chevron\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellDot = styles.match(/\.p1-nav__bell-dot\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(template).toContain('/assets/icons/bell.svg');
    expect(template).not.toContain('/assets/icons/clock.svg');
    expect(template).toContain('style="margin-right:{{menuInset}}px"');
    expect(template).toContain('bindtap="openReminders"');
    expect(template).not.toContain('p1-nav__bell-shape');
    expect(template).toContain('<view class="acard__clock"></view>');
    expect(template).toContain('<view class="acard__chevron">›</view>');
    expect(bell).toContain("width: 64rpx");
    expect(bell).toContain("height: 64rpx");
    expect(bellIcon).toContain("width: 64rpx");
    expect(bellIcon).toContain("height: 64rpx");
    expect(bellIcon).toContain("display: block");
    expect(clock).toContain("width: 20rpx");
    expect(clock).toContain("height: 20rpx");
    expect(clock).toContain("border: 3rpx solid #6b7280");
    expect(chevron).toContain("color: #c0c8d2");
    expect(chevron).toContain("font-size: var(--font-size-body)");
    expect(bellDot).toContain("box-sizing: border-box");
    expect(bellDot).toContain("width: 16rpx");
    expect(bellDot).toContain("height: 16rpx");
    expect(bellDot).toContain("border: 2rpx solid #ffffff");
    expect(bellDot).toContain("right: 4rpx");
  });

  it("keeps all schedule chips on one Figma-sized line", () => {
    const chips = styles.match(/\.chips\s*\{([^}]*)\}/)?.[1] ?? "";
    const chip = styles.match(/\.chip\s*\{([^}]*)\}/)?.[1] ?? "";
    const redChip = styles.match(/\.chip--red\s*\{([^}]*)\}/)?.[1] ?? "";
    const greenChip = styles.match(/\.chip--green\s*\{([^}]*)\}/)?.[1] ?? "";
    const yellowChip = styles.match(/\.chip--yellow\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(chips).toContain("flex-wrap: nowrap");
    expect(chips).toContain("min-height: 54rpx");
    expect(chips).toContain("height: 54rpx");
    expect(chip).toContain("min-height: 54rpx");
    expect(chip).toContain("height: 54rpx");
    expect(chip).toContain("display: flex");
    expect(chip).toContain("align-items: center");
    expect(chip).toContain("justify-content: center");
    expect(chip).toContain("white-space: nowrap");
    expect(chip).toContain("flex-shrink: 0");
    expect(redChip).toContain("width: auto");
    expect(redChip).toContain("min-width: 0");
    expect(redChip).toContain("max-width: 100%");
    expect(greenChip).toContain("width: 182rpx");
    expect(yellowChip).toContain("width: 124rpx");
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
