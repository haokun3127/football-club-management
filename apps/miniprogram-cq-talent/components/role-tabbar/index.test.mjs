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
  ],
  coach: [
    ["schedule", "/pages/coach/schedule/index"],
    ["training", "/pages/coach/training/index"],
    ["me", "/pages/coach/me/index"],
  ],
};

const iconNames = ["calendar", "growth", "child", "training", "user"];

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
    expect(template).toContain("<cover-view class=\"tabbar\">");
    expect(template).toContain("<cover-image class=\"tabbar-icon\" src=\"{{item.icon}}\" />");
    expect(styles).not.toContain("opacity: .48");
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
