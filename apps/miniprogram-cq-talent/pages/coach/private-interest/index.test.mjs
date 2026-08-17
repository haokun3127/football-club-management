import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
}));

vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

globalThis.wx = {
  navigateBack: mocks.navigateBack,
  getStorageSync: mocks.getStorageSync,
  setStorageSync: mocks.setStorageSync,
};

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

function coachSession(features) {
  return { role: "coach", capabilities: { features } };
}

describe("coach private interest", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue(coachSession({ private_lessons: true }));
    mocks.navigateBack.mockReset();
    mocks.getStorageSync.mockReset();
    mocks.setStorageSync.mockReset();
  });

  it("projects an enabled club feature without inventing coach acceptance or availability", () => {
    const page = createPageInstance();
    page.onLoad();

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(page.data).toMatchObject({
      featureState: "enabled",
      featureTitle: "私教服务已开通",
      featureMessage: "家长可提交私教意向，当前教练接单状态与确认排期尚未接入",
      availabilityMessage: "当前教练可用时段尚未接入",
      coachStatus: "状态待同步",
    });
    expect(mocks.getStorageSync).not.toHaveBeenCalled();
    expect(mocks.setStorageSync).not.toHaveBeenCalled();
  });

  it("distinguishes disabled and missing feature flags honestly", () => {
    mocks.requireRole.mockReturnValueOnce(coachSession({ private_lessons: false }));
    const disabled = createPageInstance();
    disabled.onLoad();
    expect(disabled.data).toMatchObject({
      featureState: "unavailable",
      featureTitle: "俱乐部未开通私教服务",
      featureMessage: "当前无法提供私教意向服务",
    });

    mocks.requireRole.mockReturnValueOnce(coachSession(undefined));
    const pending = createPageInstance();
    pending.onLoad();
    expect(pending.data).toMatchObject({
      featureState: "pending",
      featureTitle: "私教服务状态待同步",
      featureMessage: "暂无法确认俱乐部是否已开通私教服务",
    });
  });

  it("does not read storage or make a page request for a non-coach", () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const page = createPageInstance();
    page.onLoad();

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(mocks.getStorageSync).not.toHaveBeenCalled();
    expect(mocks.setStorageSync).not.toHaveBeenCalled();
    expect(controller).not.toMatch(/from\s+["']\.\.\/\.\.\/\.\.\/utils\/api["']/);
    expect(controller).not.toMatch(/getStorage|setStorage|showToast/);
  });

  it("uses the C16.2 Figma structure without interactive or sample availability", () => {
    expect(existsSync(new URL("../../../assets/icons/c162-chevron-left.svg", import.meta.url))).toBe(true);
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="c162-nav"');
    expect(template).toContain('class="c162-nav__placeholder"');
    expect(template).toContain("/assets/icons/c162-chevron-left.svg");
    expect(template).toContain('class="c162-pending-marker"');
    expect(template).not.toMatch(/class="c162-pending-marker"[^>]*bindtap/);
    expect(template).not.toMatch(/class="c162-status-card"[^>]*bindtap/);
    expect(template).not.toMatch(/周[一二三四五六日]|17:00|18:00|19:00|20:00|费用|价格|保存|确认排期/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toMatch(/WEEK_DAYS|SLOT_LABELS|toggleAccepting|toggleSlot|persist|getStorage|setStorage|showToast/);
    expect(stylesheet).toMatch(/\.c162-page\s*\{[^}]*background:\s*#f6f7f9/s);
    expect(stylesheet).toMatch(/\.c162-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)(?=[^}]*padding-right:\s*200rpx)(?=[^}]*padding-left:\s*32rpx)(?=[^}]*background:\s*#fceeef)/s);
    expect(stylesheet).toMatch(/\.c162-nav__title\s*\{(?=[^}]*flex:\s*1)(?=[^}]*font-size:\s*44rpx)(?=[^}]*text-align:\s*center)/s);
    expect(stylesheet).toMatch(/\.c162-nav__placeholder\s*\{(?=[^}]*width:\s*48rpx)(?=[^}]*height:\s*48rpx)/s);
    expect(stylesheet).toMatch(/\.c162-page__body\s*\{[^}]*padding:\s*32rpx\s+44rpx\s+180rpx/s);
    expect(stylesheet).toMatch(/\.c162-content\s*\{[^}]*gap:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c162-info-card\s*,\s*\.c162-status-card\s*,\s*\.c162-schedule-card\s*\{[^}]*border-radius:\s*24rpx/s);
  });
});
