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
globalThis.wx = { showToast: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

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

describe("parent content center", () => {
  beforeEach(() => {
    mocks.getContentArticles.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    globalThis.wx.showToast.mockReset();
  });

  it("presents only contract-backed article fields and filters the loaded articles", async () => {
    mocks.getContentArticles.mockResolvedValue([
      { id: "guide-1", title: "真实训练攻略", subtitle: "来自内容接口", accent: "#a80818", category: "guide" },
      { id: "venue-1", title: "真实场地信息", subtitle: "来自内容接口", accent: "#2068d8", category: "venue" },
    ]);
    const page = createPageInstance();

    await page.loadArticles();
    page.selectCategory({ currentTarget: { dataset: { value: "guide" } } });

    expect(page.data).toMatchObject({
      state: "ready",
      hasVisibleArticles: true,
      activeCategory: "guide",
      visibleArticles: [{
        id: "guide-1",
        title: "真实训练攻略",
        subtitle: "来自内容接口",
        accent: "#a80818",
        category: "guide",
      }],
    });
    expect(Object.keys(page.data.articles[0]).sort()).toEqual(["accent", "category", "id", "subtitle", "title"]);
  });

  it("uses an error state for failed loads but keeps the static sections when no articles exist", async () => {
    mocks.getContentArticles.mockRejectedValue(new Error("network unavailable"));
    const failedPage = createPageInstance();

    await failedPage.loadArticles();

    expect(failedPage.data).toMatchObject({
      state: "error",
      hasVisibleArticles: false,
      message: "内容加载失败，请点击重试",
    });

    mocks.getContentArticles.mockResolvedValue([]);
    const emptyPage = createPageInstance();

    await emptyPage.loadArticles();

    expect(emptyPage.data).toMatchObject({
      state: "ready",
      hasVisibleArticles: false,
      emptyMessage: "暂无可展示的内容",
    });
  });

  it("keeps loading observable until the content request resolves", async () => {
    let resolveArticles;
    mocks.getContentArticles.mockReturnValue(new Promise((resolve) => {
      resolveArticles = resolve;
    }));
    const page = createPageInstance();
    const loading = page.loadArticles();

    expect(page.data).toMatchObject({ state: "loading", message: "正在加载内容" });

    resolveArticles([
      { id: "help-1", title: "真实帮助", subtitle: "来自内容接口", accent: "#b06800", category: "help" },
    ]);
    await loading;

    expect(page.data.state).toBe("ready");
  });

  it("keeps only real quick-link routes and makes guide navigation a category filter", () => {
    const page = createPageInstance({
      articles: [{ id: "guide-1", title: "真实训练攻略", subtitle: "来自内容接口", accent: "#a80818", category: "guide" }],
      visibleArticles: [],
    });

    page.openQuickLink({ currentTarget: { dataset: { category: "venue" } } });
    page.openQuickLink({ currentTarget: { dataset: { category: "guide" } } });

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/venues/index");
    expect(page.data).toMatchObject({
      activeCategory: "guide",
      hasVisibleArticles: true,
      visibleArticles: [{ id: "guide-1" }],
    });
  });

  it("renders the category, featured, and quick-link sections outside the article-availability gate", () => {
    const gateIndex = template.indexOf('wx:if="{{hasVisibleArticles}}"');
    expect(gateIndex).toBeGreaterThan(-1);

    for (const marker of ['class="pills"', 'class="featured-card"', 'class="quick-grid"']) {
      expect(template).toContain(marker);
      expect(template.indexOf(marker)).toBeLessThan(gateIndex);
    }
  });

  it("does not expose unsupported search or article-detail actions in the template", () => {
    expect(template).toContain('state="{{state}}"');
    expect(template).toContain('bindaction="loadArticles"');
    expect(template).toContain('wx:if="{{hasVisibleArticles}}"');
    expect(template).not.toContain('bindtap="openSearch"');
    expect(template).not.toContain('bindtap="openArticle"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("2023");
    expect(controller).not.toContain("openSearch()");
    expect(controller).not.toContain("openArticle()");
  });
});
