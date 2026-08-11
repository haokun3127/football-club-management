import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

globalThis.wx = { navigateBack: mocks.navigateBack };

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

function coachSession(entrypoints) {
  return {
    role: "coach",
    capabilities: { client: { roleEntrypoints: { coach: entrypoints } } },
  };
}

describe("coach permission scope", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue(
      coachSession(["assessment", "home", "training", "calendar", "attendance", "matches", "attendance", "unknown"]),
    );
    mocks.navigateBack.mockReset();
  });

  it("projects only recognized coach entrypoints in the fixed neutral display order", () => {
    const page = createPageInstance();
    page.onLoad();

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(page.data).toMatchObject({
      state: "ready",
      permissions: [
        { key: "calendar", label: "日程", enabled: true },
        { key: "attendance", label: "出勤", enabled: true },
        { key: "training", label: "训练", enabled: true },
        { key: "matches", label: "比赛", enabled: true },
        { key: "assessment", label: "能力评估", enabled: true },
      ],
    });
  });

  it("shows an honest empty state when no recognized entrypoint is configured", () => {
    mocks.requireRole.mockReturnValueOnce(coachSession(["home", "unknown", "unknown"]));
    const page = createPageInstance();
    page.onLoad();

    expect(page.data).toMatchObject({
      state: "empty",
      permissions: [],
      message: "当前未配置可用入口",
    });
  });

  it("does not make a page request when requireRole rejects a non-coach", () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const page = createPageInstance();
    page.onLoad();

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(controller).not.toMatch(/from\s+["']\.\.\/\.\.\/\.\.\/utils\/api["']/);
    expect(controller).not.toContain("wx.request");
  });

  it("uses the C16.1 Figma geometry and non-interactive availability presentation", () => {
    for (const name of ["arrow-left", "info", "toggle-on", "toggle-off"]) {
      expect(existsSync(new URL(`../../../assets/icons/c161-${name}.svg`, import.meta.url))).toBe(true);
    }
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="c161-nav"');
    expect(template).not.toContain("c161-nav__placeholder");
    expect(template).toContain("/assets/icons/c161-arrow-left.svg");
    expect(template).toContain("/assets/icons/c161-info.svg");
    expect(template).toContain("/assets/icons/c161-toggle-on.svg");
    expect(template).toContain("/assets/icons/c161-toggle-off.svg");
    expect(template).toContain('class="c161-explain__icon-wrap"');
    expect(template).toContain('class="c161-content"');
    expect(template).toContain("仅管理员可调整");
    expect(template).not.toMatch(/class="c161-permission-row"[^>]*bindtap/);
    expect(template).not.toMatch(/class="c161-switch"[^>]*bindtap/);
    expect(template).not.toMatch(/class="c161-admin-cta"[^>]*bindtap/);
    expect(template).not.toMatch(/保存更改|修改活动|发起私教|查看财务/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toMatch(/showToast|setStorage|wx\.request/);
    expect(stylesheet).toMatch(/\.c161-page\s*\{[^}]*background:\s*#f6f7f9/s);
    expect(stylesheet).toMatch(/\.c161-nav\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*border-box[^}]*padding-right:\s*44rpx[^}]*padding-left:\s*44rpx[^}]*background:\s*#fceeef/s);
    expect(stylesheet).toMatch(/\.c161-nav__title\s*\{[^}]*font-size:\s*44rpx/s);
    expect(stylesheet).toMatch(/\.c161-page__body\s*\{[^}]*padding:\s*32rpx\s+44rpx\s+180rpx/s);
    expect(stylesheet).toMatch(/\.c161-content\s*\{[^}]*gap:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c161-explain\s*\{[^}]*border-radius:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c161-permission-list\s*\{[^}]*border-radius:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c161-explain__icon-wrap\s*\{(?=[^}]*width:\s*64rpx)(?=[^}]*height:\s*64rpx)(?=[^}]*border-radius:\s*50%)(?=[^}]*background:\s*#e6f2ff)/s);
    expect(stylesheet).toMatch(/\.c161-explain__icon\s*\{[^}]*width:\s*32rpx[^}]*height:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c161-switch\s*\{[^}]*width:\s*80rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c161-admin-cta\s*\{[^}]*min-height:\s*104rpx[^}]*background:\s*#e8515d[^}]*border-radius:\s*52rpx/s);
  });
});
