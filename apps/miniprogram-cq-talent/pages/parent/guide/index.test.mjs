import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContentArticles: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getContentArticles: mocks.getContentArticles }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data, ...data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

describe("parent guide list", () => {
  beforeEach(() => {
    mocks.getContentArticles.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  });

  it("lists only guide-category articles from the real contract", async () => {
    mocks.getContentArticles.mockResolvedValue([
      { id: "g-1", title: "真实攻略", subtitle: "来自内容接口", accent: "#a80f1b", category: "guide" },
      { id: "v-1", title: "场地文章", subtitle: "不属于攻略", accent: "#2068d8", category: "venue" },
    ]);
    const page = createPageInstance();

    await page.loadGuides();

    expect(page.data).toMatchObject({
      state: "ready",
      hasGuides: true,
      guides: [{ id: "g-1", title: "真实攻略", subtitle: "来自内容接口", accent: "#a80f1b" }],
    });
  });

  it("shows the empty state when no guide articles exist", async () => {
    mocks.getContentArticles.mockResolvedValue([
      { id: "v-1", title: "场地文章", subtitle: "不属于攻略", accent: "#2068d8", category: "venue" },
    ]);
    const page = createPageInstance();

    await page.loadGuides();

    expect(page.data).toMatchObject({ state: "ready", hasGuides: false, guides: [] });
  });

  it("keeps a retryable error state when the request fails", async () => {
    mocks.getContentArticles.mockRejectedValue(new Error("network unavailable"));
    const page = createPageInstance();

    await page.loadGuides();

    expect(page.data).toMatchObject({ state: "error", message: "攻略读取失败，请点击重试。" });
  });

  it("navigates to the article detail with the tapped guide id", () => {
    const page = createPageInstance();

    page.openGuide({ currentTarget: { dataset: { id: "g-1" } } });

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/article/index?id=g-1");
  });

  it("keeps the template free of JS method calls in expressions", () => {
    expect(template).toContain('wx:for="{{guides}}"');
    expect(template).toContain('bindtap="openGuide"');
    expect(template).toContain('bindaction="loadGuides"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
