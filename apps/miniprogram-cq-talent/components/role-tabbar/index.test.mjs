import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentDir = new URL("./", import.meta.url);
const template = readFileSync(new URL("./index.wxml", componentDir), "utf8");
const styles = readFileSync(new URL("./index.wxss", componentDir), "utf8");
const controller = readFileSync(new URL("./index.ts", componentDir), "utf8");
const iconsDir = new URL("../../assets/icons/", componentDir);

const expectedItems = {
  parent: [
    ["schedule", "/pages/parent/schedule/index"],
    ["growth", "/pages/parent/growth/index"],
    ["child", "/pages/parent/child/index"],
    ["discover", "/pages/parent/content/index"],
  ],
  coach: [
    ["schedule", "/pages/coach/schedule/index"],
    ["training", "/pages/coach/training/index"],
    ["me", "/pages/coach/me/index"],
  ],
};

const iconNames = ["calendar", "growth", "child", "discover", "training", "user"];

describe("role tabbar real-device icon contract", () => {
  it("keeps both role manifests, keys, and paths unchanged", () => {
    for (const [role, items] of Object.entries(expectedItems)) {
      expect(controller).toContain(`${role}: [`);
      for (const [key, path] of items) {
        expect(controller).toContain(`key: "${key}"`);
        expect(controller).toContain(`path: "${path}"`);
      }
    }
  });

  it("uses precomputed PNG icon paths for both active states", () => {
    expect(controller).toContain("activeIcon");
    expect(controller).toContain("inactiveIcon");
    expect(controller).toMatch(/icon:\s*item\.key === active/);
    expect(controller).toMatch(/activeIcon:\s*"\/assets\/icons\/tab-[^"]+-active\.png"/);
    expect(controller).toMatch(/inactiveIcon:\s*"\/assets\/icons\/tab-[^"]+-inactive\.png"/);
    expect(controller).not.toContain("tab-calendar.svg");
    expect(controller).not.toContain("tab-growth.svg");
    expect(controller).not.toContain("tab-child.svg");
    expect(controller).not.toContain("tab-training.svg");
    expect(controller).not.toContain("tab-user.svg");
    expect(template).not.toMatch(/\.(map|filter|slice|indexOf)\s*\(/);
    expect(template).toContain('class="tabbar tabbar--{{role}} {{flow ? \'tabbar--flow\' : \'\'}}"');
    expect(template).toContain("<cover-image class=\"tabbar-icon\" src=\"{{item.icon}}\" />");
    expect(styles).not.toContain("opacity: .48");
  });

  it("keeps parent activity affordances separate from coach tab states", () => {
    expect(template).toContain('class="tabbar tabbar--{{role}} {{flow ? \'tabbar--flow\' : \'\'}}"');
    expect(styles).toContain(".tabbar { position: fixed; right: 0; bottom: 0; left: 0; z-index: 9999; display: flex; box-sizing: border-box; height: 140rpx;");
    expect(styles).toContain(".tabbar-icon-wrap { position: static; display: flex; align-items: center; justify-content: center; width: 32rpx; height: 32rpx;");
    expect(styles).toContain(".tabbar-icon { width: 32rpx; height: 32rpx; }");
    expect(styles).toContain(".tabbar--parent .tabbar-item.active { color: #a80f1b;");
    expect(styles).toContain(".tabbar--parent .tabbar-item.active .tabbar-dot { top: 88rpx; left: 50%; width: 8rpx; height: 8rpx; margin-left: -4rpx; border-radius: 999rpx; background: #a80f1b; }");
    expect(styles).toContain(".tabbar--coach .tabbar-item.active .tabbar-dot { top: 88rpx; left: 50%; width: 8rpx; height: 8rpx; margin-left: -4rpx; border-radius: 999rpx; background: var(--color-brand); }");
    expect(styles).not.toContain(".tabbar-item.active .tabbar-icon-wrap { background: #fceeef; }");
    expect(styles).not.toContain(".tabbar-item.active .tabbar-dot { background: var(--color-brand); }");
  });

  it("places fixed tab content inside the Figma 70px overlay", () => {
    expect(styles).toContain("height: 140rpx;");
    expect(styles).toContain("padding-bottom: 0;");
    expect(styles).not.toContain("padding-bottom: env(safe-area-inset-bottom);");
    expect(styles).toContain(".tabbar-item { position: relative; display: flex; flex: 1; box-sizing: border-box; flex-direction: column; align-items: center; justify-content: flex-start; height: 112rpx; min-width: 0; padding-top: 16rpx;");
    expect(styles).toContain("width: 32rpx; height: 32rpx;");
    expect(styles).toContain(".tabbar-label { width: 100%; margin-top: 8rpx;");
    expect(styles).toContain("line-height: 22rpx;");
    expect(styles).toContain("text-align: center;");
    expect(styles).toContain("top: 88rpx; left: 50%; width: 8rpx; height: 8rpx; margin-left: -4rpx;");
  });

  it("uses the live Figma tab typography and inactive color", () => {
    expect(styles).toContain("color: #8e97a6;");
    expect(styles).toContain("font-family: \"Noto Sans SC\", sans-serif;");
    expect(styles).toContain("font-weight: 400;");
    expect(styles).not.toContain("font-weight: 650;");
  });

  it("supports an opt-in flowing layout without changing the default fixed tab bar", () => {
    expect(controller).toMatch(/flow:\s*\{\s*type:\s*Boolean,\s*value:\s*false/s);
    expect(styles).toContain(".tabbar--flow { position: static; }");
  });

  it("ships all active and inactive icons as valid PNG files", () => {
    for (const name of iconNames) {
      for (const state of ["active", "inactive"]) {
        const asset = new URL(`./tab-${name}-${state}.png`, iconsDir);
        expect(existsSync(asset)).toBe(true);
        const png = readFileSync(asset);
        expect(png.subarray(0, 8)).toEqual(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        );
        expect(png.readUInt32BE(16)).toBe(44);
        expect(png.readUInt32BE(20)).toBe(44);
        expect(png[25]).toBe(6);
      }
    }
  });

  it("keeps the original SVG resources for existing consumers", () => {
    for (const name of iconNames) {
      expect(existsSync(new URL(`./tab-${name}.svg`, iconsDir))).toBe(true);
    }
  });
});
