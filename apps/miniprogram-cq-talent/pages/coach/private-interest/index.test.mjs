import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  showToast: vi.fn(),
  getCoachPreferences: vi.fn(),
  saveCoachPreferences: vi.fn(),
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
}));

vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));
vi.mock("../../../utils/api", () => ({
  getCoachPreferences: mocks.getCoachPreferences,
  saveCoachPreferences: mocks.saveCoachPreferences,
}));

globalThis.wx = {
  navigateBack: mocks.navigateBack,
  showToast: mocks.showToast,
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
    mocks.showToast.mockReset();
    mocks.getCoachPreferences.mockReset().mockResolvedValue({ acceptsPrivateLessons: true, availabilitySlots: Array.from({ length: 20 }, (_, i) => `${Math.floor(i / 4)}-${i % 4}`) });
    mocks.saveCoachPreferences.mockReset().mockResolvedValue(undefined);
    mocks.getStorageSync.mockReset().mockReturnValue("");
    mocks.setStorageSync.mockReset();
  });

  it("preserves server empty availability on a fresh device and on acceptance changes", async () => {
    mocks.getCoachPreferences.mockResolvedValue({ acceptsPrivateLessons: true, availabilitySlots: [] });
    const page = createPageInstance();
    await page.load(true);
    expect(page.data.availabilityColumns.flatMap(c => c.slots).filter(s => s.selected)).toHaveLength(0);
    await page.toggleAccepting();
    expect(mocks.saveCoachPreferences).toHaveBeenCalledWith({ acceptsPrivateLessons: false, availabilitySlots: [] });
  });

  it("loads actual persisted weekday slots", async () => {
    const page = createPageInstance();
    page.onLoad();
    await page.data && Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(mocks.getCoachPreferences).toHaveBeenCalledTimes(1);
    expect(page.data.featureState).toBe("enabled");
    expect(page.data.interactive).toBe(true);
    expect(page.data.accepting).toBe(true);
    const selectedCount = page.data.availabilityColumns.flatMap((column) => column.slots).filter((slot) => slot.selected).length;
    expect(selectedCount).toBe(20);
  });

  it("toggles acceptance and persists it", async () => {
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await page.toggleAccepting();
    expect(page.data.accepting).toBe(false);
    expect(mocks.saveCoachPreferences).toHaveBeenCalledWith(expect.objectContaining({ acceptsPrivateLessons: false }));
  });

  it("reverts acceptance and marks unsaved when the save fails", async () => {
    mocks.saveCoachPreferences.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await page.toggleAccepting();
    expect(page.data.accepting).toBe(true);
    expect(page.data.saveFailed).toBe(true);
    expect(mocks.showToast).toHaveBeenCalled();
  });

  it("toggles a single slot and persists the full selection", async () => {
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await page.toggleSlot({ currentTarget: { dataset: { key: "5-0" } } });
    const saturday = page.data.availabilityColumns[5];
    expect(saturday.slots[0].selected).toBe(true);
    expect(mocks.saveCoachPreferences).toHaveBeenCalledWith(expect.objectContaining({ availabilitySlots: expect.arrayContaining(["5-0"]) }));
    expect(page.data.saveFailed).toBe(false);
  });

  it("restores the previous columns and marks unsaved when the slot save fails", async () => {
    mocks.saveCoachPreferences.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const before = page.data.availabilityColumns.map((column) => column.slots.map((slot) => slot.selected));
    await page.toggleSlot({ currentTarget: { dataset: { key: "0-0" } } });
    expect(page.data.availabilityColumns[0].slots[0].selected).toBe(before[0][0]);
    const after = page.data.availabilityColumns.map((column) => column.slots.map((slot) => slot.selected));
    expect(after).toEqual(before);
    expect(page.data.saveFailed).toBe(true);
    expect(mocks.showToast).toHaveBeenCalled();
  });

  it("keeps the new value and clears the unsaved flag after a successful retry", async () => {
    mocks.saveCoachPreferences.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await page.toggleSlot({ currentTarget: { dataset: { key: "5-0" } } });
    expect(page.data.availabilityColumns[5].slots[0].selected).toBe(false);
    expect(page.data.saveFailed).toBe(true);
    await page.toggleSlot({ currentTarget: { dataset: { key: "5-0" } } });
    expect(page.data.availabilityColumns[5].slots[0].selected).toBe(true);
    expect(page.data.saveFailed).toBe(false);
  });

  it("keeps an explicitly saved empty availability instead of reviving defaults", async () => {
    mocks.getCoachPreferences.mockResolvedValue({ acceptsPrivateLessons: true, availabilitySlots: [] });
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const selectedCount = page.data.availabilityColumns.flatMap((column) => column.slots).filter((slot) => slot.selected).length;
    expect(selectedCount).toBe(0);
  });

  it("does not revive default slots after clearing all, saving, and re-entering", async () => {
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const keys = page.data.availabilityColumns.flatMap((column) => column.slots.filter((slot) => slot.selected).map((slot) => slot.key));
    expect(keys.length).toBe(20);
    for (const key of keys) {
      await page.toggleSlot({ currentTarget: { dataset: { key } } });
    }
    const clearedCount = page.data.availabilityColumns.flatMap((column) => column.slots).filter((slot) => slot.selected).length;
    expect(clearedCount).toBe(0);
    expect(mocks.saveCoachPreferences).toHaveBeenLastCalledWith({ acceptsPrivateLessons: true, availabilitySlots: [] });

    mocks.getCoachPreferences.mockResolvedValue({ acceptsPrivateLessons: true, availabilitySlots: [] });
    const reentered = createPageInstance();
    reentered.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const reenteredCount = reentered.data.availabilityColumns.flatMap((column) => column.slots).filter((slot) => slot.selected).length;
    expect(reenteredCount).toBe(0);
  });

  it("blocks editing and submitting while the initial read fails", async () => {
    mocks.getCoachPreferences.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(page.data.interactive).toBe(false);
    expect(page.data.loadFailed).toBe(true);
    await page.toggleAccepting();
    await page.toggleSlot({ currentTarget: { dataset: { key: "0-0" } } });
    expect(mocks.saveCoachPreferences).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalled();
  });

  it("recovers to an editable state after retrying the read", async () => {
    mocks.getCoachPreferences.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(page.data.loadFailed).toBe(true);

    page.retryLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(page.data.loadFailed).toBe(false);
    expect(page.data.interactive).toBe(true);
    await page.toggleSlot({ currentTarget: { dataset: { key: "5-0" } } });
    expect(mocks.saveCoachPreferences).toHaveBeenCalledTimes(1);
    expect(page.data.availabilityColumns[5].slots[0].selected).toBe(true);
  });

  it("keeps disabled and pending feature states non-interactive", async () => {
    mocks.requireRole.mockReturnValueOnce(coachSession({ private_lessons: false }));
    const disabled = createPageInstance();
    disabled.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(disabled.data.featureState).toBe("unavailable");
    expect(disabled.data.interactive).toBe(false);
    expect(mocks.getCoachPreferences).not.toHaveBeenCalled();

    mocks.requireRole.mockReturnValueOnce(coachSession(undefined));
    const pending = createPageInstance();
    pending.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pending.data.featureState).toBe("pending");
    expect(pending.data.interactive).toBe(false);
  });

  it("does not make a request for a non-coach", () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const page = createPageInstance();
    page.onLoad();

    expect(mocks.getCoachPreferences).not.toHaveBeenCalled();
    expect(mocks.saveCoachPreferences).not.toHaveBeenCalled();
  });

  it("organizes the C34 information hierarchy: status, availability summary, consultations, follow-up", async () => {
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(page.data.acceptingStatusLabel).toBe("接课中");
    expect(page.data.availabilitySummary).toBe("每周周一、周二、周三、周四、周五，共 20 个时段");
  });

  it("summarizes an explicitly empty availability without default wording", async () => {
    mocks.getCoachPreferences.mockResolvedValue({ acceptsPrivateLessons: true, availabilitySlots: [] });
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(page.data.availabilitySummary).toBe("暂无可用时段");
    await page.toggleAccepting();
    expect(page.data.acceptingStatusLabel).toBe("已暂停接课");
  });

  it("uses the C34 four-section structure with club tokens and no hardcoded colors", () => {
    expect(existsSync(new URL("../../../assets/icons/c162-chevron-left.svg", import.meta.url))).toBe(true);
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('<view class="c34-card__title">接课状态</view>');
    expect(template).toContain('<view class="c34-card__title">可用时段</view>');
    expect(template).toContain('<view class="c34-card__title">已分派咨询</view>');
    expect(template).toContain('<view class="c34-card__title">服务跟进</view>');
    expect(template).toContain('{{availabilitySummary}}');
    expect(template).toContain('bindtap="retryLoad"');
    expect(template).toContain('bindtap="toggleAccepting"');
    expect(template).toContain('bindtap="toggleSlot"');
    expect(template).toContain("c34-toggle--on");
    expect(template).toContain("c34-slot--selected");
    expect(template).not.toMatch(/\{\{item\.(?:map|filter|slice|indexOf)/);
    expect(stylesheet).toMatch(/\.c34-page\s*\{[^}]*background:\s*var\(--club-page\)/s);
    expect(stylesheet).toMatch(/\.c34-toggle--on\s*\{[^}]*background:\s*var\(--color-brand\)/s);
    expect(stylesheet).toMatch(/\.c34-slot--selected\s*\{[^}]*background:\s*var\(--color-brand\)/s);
    expect(stylesheet).toMatch(/\.c34-status__label--on\s*\{[^}]*color:\s*var\(--color-success\)/s);
    expect(stylesheet).not.toMatch(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  });
});
