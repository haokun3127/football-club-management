import { ROLE_TABS } from "../../utils/navigation";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentDir = new URL("./", import.meta.url);
const template = readFileSync(new URL("./index.wxml", componentDir), "utf8");
const styles = readFileSync(new URL("./index.wxss", componentDir), "utf8");
const controller = readFileSync(new URL("./index.ts", componentDir), "utf8");
const iconsDir = new URL("../../assets/icons/", componentDir);

const expectedItems = {
  parent: [
    ["home", "/pages/parent/home/index"],
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

const iconNames = ["calendar", "growth", "child", "discover", "training", "user"];

describe("role tabbar real-device icon contract", () => {
  it("keeps both role manifests, keys, and paths unchanged", () => {
    for (const [role, items] of Object.entries(expectedItems)) {
      expect(ROLE_TABS[role].map(item => [item.key, item.path])).toEqual(items);

    }

  });

  it("uses the official safe-area tabbar with stable icon slots", () => {
    expect(template).toContain('<t-tab-bar value="{{active}}" fixed="{{!flow}}" safe-area-inset-bottom');
    expect(template).toContain('bindchange="handleChange"');
    expect(template).toContain('slot="icon"');
    expect(template).toContain('src="{{item.icon}}"');
    expect(styles).not.toContain("9999");
  });

  it("resolves official change values to registered paths and ignores current/unknown keys", async () => {
    const ts = await import("typescript");
    const vm = await import("node:vm");
    let definition;
    const navigated = [];
    const js = ts.transpileModule(controller, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(js, { exports: {}, require: () => ({ ROLE_TABS }), Component: (value) => { definition = value; }, wx: { reLaunch: ({url}) => navigated.push(url) } });
    const page = { data: { items: [{key: "schedule", path: "/pages/coach/schedule/index"}, {key: "training", path: "/pages/coach/training/index"}], active: "schedule" } };
    for (const value of ["schedule", "unknown", "training"]) definition.methods.handleChange.call(page, {detail:{value}});
    expect(navigated).toEqual(["/pages/coach/training/index"]);
  });

  it("keeps flow mode and dark chrome as optional shared themes", () => {
    expect(controller).toMatch(/flow:\s*\{\s*type:\s*Boolean,\s*value:\s*false/s);
    expect(styles).toContain(".role-tabs--dark");
    expect(styles).toContain("--td-tab-bar-active-color");
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
