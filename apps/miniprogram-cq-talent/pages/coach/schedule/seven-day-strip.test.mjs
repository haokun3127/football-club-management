import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

describe("coach schedule seven-day strip", () => {
  it("renders all seven days between the week arrows without a fake dropdown cell", () => {
    expect(controller).toContain("collapsedDayStrip: dayStrip,");
    expect(controller).not.toContain("collapsedDayStrip: dayStrip.slice(0, 6)");
    expect(template).not.toContain('class="c1-dates__expand"');
    expect(stylesheet).toMatch(/\.c1-week-nav\s*\{[^}]*left:\s*44rpx[^}]*grid-template-columns:\s*repeat\(7,\s*88rpx\)[^}]*column-gap:\s*8rpx[^}]*width:\s*664rpx/s);
  });
});
