import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  showToast: vi.fn(),
  getCoachPreferences: vi.fn(),
  saveCoachPreferences: vi.fn(),
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
    mocks.getCoachPreferences.mockReset().mockResolvedValue({ acceptsPrivateLessons: true, availabilitySlots: [] });
    mocks.saveCoachPreferences.mockReset().mockResolvedValue(undefined);
  });

  it("loads persisted preferences and defaults availability to weekday slots", async () => {
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

  it("reverts acceptance and toasts when the save fails", async () => {
    mocks.saveCoachPreferences.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    await page.toggleAccepting();
    expect(page.data.accepting).toBe(true);
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

  it("uses the C16.2 Figma structure with interactive toggle and selectable slots", () => {
    expect(existsSync(new URL("../../../assets/icons/c162-chevron-left.svg", import.meta.url))).toBe(true);
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="c162-nav"');
    expect(template).toContain('bindtap="toggleAccepting"');
    expect(template).toContain('bindtap="toggleSlot"');
    expect(template).toContain("c162-toggle--on");
    expect(template).toContain("c162-slot--selected");
    expect(template).not.toMatch(/\{\{item\.(?:map|filter|slice|indexOf)/);
    expect(stylesheet).toMatch(/\.c162-toggle--on\s*\{[^}]*background:\s*#34c759/s);
    expect(stylesheet).toMatch(/\.c162-slot--selected\s*\{[^}]*background:\s*#34c759/s);
    expect(stylesheet).toMatch(/\.c162-nav\s*\{(?=[^}]*background:\s*#fceeef)/s);
  });
});
