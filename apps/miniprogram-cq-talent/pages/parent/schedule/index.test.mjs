import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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

const { buildDateOptions, buildScheduleDigest } = await import("./index.ts");
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
      timeText: "09:30",
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

    expect(template).toContain('<view class="p1-nav__title" style="top:{{navActionTop}}px">日程</view>');
    expect(nav).toContain("align-items: center");
    expect(title).toContain("position: absolute");
    expect(title).toContain("height: 64rpx");
    expect(title).toContain("display: flex");
    expect(title).toContain("align-items: center");
  });

  it("keeps one 88rpx content-box custom navigation rule", () => {
    const navRules = [...styles.matchAll(/(?:^|})\s*\.p1-nav\s*\{([^}]*)\}/g)].map((match) => match[1]);

    expect(navRules).toHaveLength(1);
    expect(navRules[0]).toContain("height: 88rpx");
    expect(navRules[0]).toContain("box-sizing: content-box");
    expect(navRules[0]).not.toContain("height: 176rpx");
    expect(navRules[0]).not.toContain("box-sizing: border-box");
  });

  it("presents a selected week from Monday through Sunday", () => {
    const options = buildDateOptions("2026-08-05", []);

    expect(options.map((option) => option.weekShort)).toEqual(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
    expect(options[0]?.date).toBe("2026-08-03");
    expect(options[6]?.date).toBe("2026-08-09");
  });

  it("uses the approved CSS and text fallback icon nodes instead of unverified SVG assets", () => {
    const bell = styles.match(/\.p1-nav__bell\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellShape = styles.match(/\.p1-nav__bell-shape\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellShapeBefore = styles.match(/\.p1-nav__bell-shape::before\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellShapeAfter = styles.match(/\.p1-nav__bell-shape::after\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellClapper = styles.match(/\.p1-nav__bell-clapper\s*\{([^}]*)\}/)?.[1] ?? "";
    const clock = styles.match(/\.acard__clock\s*\{([^}]*)\}/)?.[1] ?? "";
    const chevron = styles.match(/\.acard__chevron\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellDot = styles.match(/\.p1-nav__bell-dot\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(template).not.toContain('/assets/icons/bell.svg');
    expect(template).not.toContain('/assets/icons/clock.svg');
    expect(template).not.toContain('/assets/icons/chevron-right.svg');
    expect(template).toContain('style="right:{{menuInset}}px;top:{{navActionTop}}px"');
    expect(template).toContain('bindtap="openReminders"');
    expect(template).toContain('<view class="p1-nav__bell-shape"><view class="p1-nav__bell-clapper"></view></view>');
    expect(template).toContain('<view class="acard__clock"></view>');
    expect(template).toContain('<view class="acard__chevron">›</view>');
    expect(bell).toContain("width: 64rpx");
    expect(bell).toContain("height: 64rpx");
    expect(bellShape).toContain("width: 36rpx");
    expect(bellShape).toContain("height: 40rpx");
    expect(bellShape).toContain("box-sizing: border-box");
    expect(bellShape).not.toMatch(/(?:^|;)\s*border\s*:/);
    expect(bellShapeBefore).toContain("top: 0");
    expect(bellShapeBefore).toContain("left: 0");
    expect(bellShapeBefore).toContain("width: 36rpx");
    expect(bellShapeBefore).toContain("height: 32rpx");
    expect(bellShapeBefore).toContain("box-sizing: border-box");
    expect(bellShapeBefore).toContain("border: 4rpx solid #0d0d0d");
    expect(bellShapeBefore).toContain("border-bottom: 0");
    expect(bellShapeBefore).toContain('content: ""');
    expect(bellShapeAfter).toContain("top: 32rpx");
    expect(bellShapeAfter).toContain("left: 0");
    expect(bellShapeAfter).toContain("width: 36rpx");
    expect(bellShapeAfter).toContain("height: 4rpx");
    expect(bellShapeAfter).toContain("box-sizing: border-box");
    expect(bellShapeAfter).toContain("background: #0d0d0d");
    expect(bellShapeAfter).toContain('content: ""');
    expect(bellClapper).toContain("top: 36rpx");
    expect(bellClapper).toContain("left: 13rpx");
    expect(bellClapper).toContain("width: 10rpx");
    expect(bellClapper).toContain("height: 4rpx");
    expect(bellClapper).toContain("box-sizing: border-box");
    expect(bellClapper).toContain("background: #0d0d0d");
    expect(clock).toContain("width: 20rpx");
    expect(clock).toContain("height: 20rpx");
    expect(clock).toContain("border: 3rpx solid #6b7280");
    expect(chevron).toContain("color: #c0c8d2");
    expect(chevron).toContain("font-size: 32rpx");
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
});
