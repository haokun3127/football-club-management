import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachHome: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachHome: mocks.getCoachHome }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/date", () => ({ currentLocalDate: () => "2026-08-29" }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 20 }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = {
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  navigateBack: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach team selector", () => {
  beforeEach(() => {
    mocks.getCoachHome.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.getStorageSync.mockReset().mockReturnValue("");
    globalThis.wx.setStorageSync.mockReset();
    globalThis.wx.navigateBack.mockReset();
  });

  it("lists only API-provided teams and restores a stored selection only when it remains assigned", async () => {
    globalThis.wx.getStorageSync.mockReturnValue("U12 Blue");
    mocks.getCoachHome.mockResolvedValue({ teams: ["U11 Red", "U12 Blue"] });
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      teams: [
        { name: "U11 Red", isSelected: false },
        { name: "U12 Blue", isSelected: true },
      ],
    });

    globalThis.wx.getStorageSync.mockReturnValue("No longer assigned");
    const fallbackPage = createPageInstance();
    await fallbackPage.load();
    expect(fallbackPage.data.teams[0]).toMatchObject({ name: "U11 Red", isSelected: true });
  });

  it("persists a selected assigned-team name locally and returns to the coach home", () => {
    const page = createPageInstance();

    page.selectTeam({ currentTarget: { dataset: { name: "U12 Blue" } } });

    expect(globalThis.wx.setStorageSync).toHaveBeenCalledWith("coach-selected-team", "U12 Blue");
    expect(globalThis.wx.navigateBack).toHaveBeenCalledTimes(1);
  });

  it("uses a full-screen back flow without team-management actions or font-dependent selected icons", () => {
    expect(template).toContain('bindtap="goBack"');
    expect(template).toContain('bindtap="selectTeam"');
    expect(template).toContain('/assets/icons/c4-1-check.svg');
    expect(template).not.toContain('class="team-option__check">✓</view>');
    expect(template).not.toMatch(/新建|编辑|删除/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.team-selector-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
  });
});
