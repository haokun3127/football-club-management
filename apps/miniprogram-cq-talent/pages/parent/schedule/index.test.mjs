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

const { buildScheduleDigest } = await import("./index.ts");
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

  it("uses the approved offsets for regular and empty hero pills", () => {
    const heroStats = styles.match(/\.hero__stats\s*\{([^}]*)\}/)?.[1] ?? "";
    const emptyHeroStats = styles.match(/\.hero__stats--empty\s*\{([^}]*)\}/)?.[1] ?? "";
    const heroPill = styles.match(/\.hero__pill\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(heroStats).toContain("top: 294rpx");
    expect(emptyHeroStats).toContain("top: 274rpx");
    expect(heroPill).toContain("height: 62rpx");
  });

  it("uses the approved CSS and text fallback icon nodes instead of unverified SVG assets", () => {
    const bellShape = styles.match(/\.p1-nav__bell-shape\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellShapeAfter = styles.match(/\.p1-nav__bell-shape::after\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellClapper = styles.match(/\.p1-nav__bell-clapper\s*\{([^}]*)\}/)?.[1] ?? "";
    const clock = styles.match(/\.acard__clock\s*\{([^}]*)\}/)?.[1] ?? "";
    const chevron = styles.match(/\.acard__chevron\s*\{([^}]*)\}/)?.[1] ?? "";
    const bellDot = styles.match(/\.p1-nav__bell-dot\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(template).not.toContain('/assets/icons/bell.svg');
    expect(template).not.toContain('/assets/icons/clock.svg');
    expect(template).not.toContain('/assets/icons/chevron-right.svg');
    expect(template).toContain('<view class="p1-nav__bell-shape"><view class="p1-nav__bell-clapper"></view></view>');
    expect(template).toContain('<view class="acard__clock"></view>');
    expect(template).toContain('<view class="acard__chevron">›</view>');
    expect(bellShape).not.toBe("");
    expect(bellShapeAfter).not.toBe("");
    expect(bellClapper).not.toBe("");
    expect(clock).toContain("width: 20rpx");
    expect(clock).toContain("height: 20rpx");
    expect(clock).toContain("border: 3rpx solid #6b7280");
    expect(chevron).toContain("color: #c0c8d2");
    expect(chevron).toContain("font-size: 32rpx");
    expect(bellDot).toContain("box-sizing: border-box");
    expect(bellDot).toContain("width: 16rpx");
    expect(bellDot).toContain("height: 16rpx");
  });

  it("lets the dynamic date chip wrap without clipping while preserving the other chip widths", () => {
    const chips = styles.match(/\.chips\s*\{([^}]*)\}/)?.[1] ?? "";
    const chip = styles.match(/\.chip\s*\{([^}]*)\}/)?.[1] ?? "";
    const redChip = styles.match(/\.chip--red\s*\{([^}]*)\}/)?.[1] ?? "";
    const greenChip = styles.match(/\.chip--green\s*\{([^}]*)\}/)?.[1] ?? "";
    const yellowChip = styles.match(/\.chip--yellow\s*\{([^}]*)\}/)?.[1] ?? "";

    expect(chips).toContain("flex-wrap: wrap");
    expect(chips).toContain("min-height: 54rpx");
    expect(chips).toContain("height: auto");
    expect(chip).toContain("min-height: 54rpx");
    expect(chip).toContain("height: auto");
    expect(chip).toContain("white-space: normal");
    expect(chip).toContain("word-break: break-all");
    expect(chip).toContain("overflow: visible");
    expect(chip).toContain("text-overflow: clip");
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
