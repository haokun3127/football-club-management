import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

describe("shared app header", () => {
  it("uses the live Figma navigation geometry for back, title, and action", () => {
    expect(template).toContain('class="app-header__back"');
    expect(template).toContain('src="/assets/icons/chevron-left.svg"');
    expect(stylesheet).toMatch(/\.app-header__content\s*\{[^}]*padding-left:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.app-header__back\s*\{[^}]*width:\s*48rpx[^}]*height:\s*48rpx[^}]*margin-left:\s*0/s);
    expect(stylesheet).toMatch(/\.app-header__title\s*\{[^}]*font-size:\s*36rpx[^}]*line-height:\s*44rpx/s);
    expect(stylesheet).toMatch(/\.app-header__action\s*\{[^}]*font-size:\s*28rpx/s);
  });

  it("keeps a normal-flow reservation while the visible navigation stays fixed", () => {
    expect(template).toContain('class="app-header__surface app-header--{{theme}}"');
    expect(stylesheet).toMatch(/\.app-header\s*\{[^}]*position:\s*relative[^}]*height:\s*88px/s);
    expect(stylesheet).toMatch(/\.app-header__surface\s*\{[^}]*position:\s*fixed[^}]*top:\s*0[^}]*right:\s*0[^}]*left:\s*0[^}]*z-index:\s*100/s);
  });
});
