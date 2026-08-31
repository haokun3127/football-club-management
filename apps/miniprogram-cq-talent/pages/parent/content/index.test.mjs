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
globalThis.wx = { showToast: vi.fn(), pageScrollTo: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const bookIcon = readFileSync(new URL("../../../assets/icons/content-book.svg", import.meta.url), "utf8");

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

  it("presents only contract-backed article fields without category filtering", async () => {
    mocks.getContentArticles.mockResolvedValue([
      { id: "guide-1", title: "真实训练攻略", subtitle: "来自内容接口", accent: "#a80818", category: "guide" },
      { id: "venue-1", title: "真实场地信息", subtitle: "来自内容接口", accent: "#2068d8", category: "venue" },
    ]);
    const page = createPageInstance();

    await page.loadArticles();

    expect(page.data).toMatchObject({
      state: "ready",
      hasVisibleArticles: true,
      visibleArticles: [
        { id: "guide-1", title: "真实训练攻略" },
        { id: "venue-1", title: "真实场地信息" },
      ],
    });
    expect(page.data).not.toHaveProperty("activeCategory");
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

  it("keeps only real quick-link routes including the guide list page", () => {
    const page = createPageInstance();

    page.openQuickLink({ currentTarget: { dataset: { category: "venue" } } });
    page.openQuickLink({ currentTarget: { dataset: { category: "guide" } } });

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/venues/index");
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/guide/index");
  });

  it("renders the featured and quick-link sections outside the article-availability gate", () => {
    const gateIndex = template.indexOf('wx:if="{{hasVisibleArticles}}"');
    expect(gateIndex).toBeGreaterThan(-1);

    for (const marker of ['class="featured-card"', 'class="quick-grid"']) {
      expect(template).toContain(marker);
      expect(template.indexOf(marker)).toBeLessThan(gateIndex);
    }
  });

  it("exposes article-detail navigation but no unsupported search action", () => {
    expect(template).toContain('state="{{state}}"');
    expect(template).toContain('bindaction="loadArticles"');
    expect(template).toContain('wx:if="{{hasVisibleArticles}}"');
    expect(template).toContain('bindtap="openArticle"');
    expect(template).not.toContain('bindtap="openSearch"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("2023");
    expect(controller).not.toContain("openSearch()");
  });

  it("keeps the featured card flush with the Figma body spacing", () => {
    expect(styles).not.toContain(".featured-card {\n  position: relative;\n  height: 360rpx;\n  border-radius: 32rpx;\n  overflow: hidden;\n  margin-top: 48rpx;");
    expect(styles).toContain(".featured-card {\n  position: relative;\n  height: 360rpx;\n  border-radius: 32rpx;\n  overflow: hidden;\n  margin-top: 0;");
  });

  it("uses the Figma book-open glyph for the training guide entry", () => {
    expect(bookIcon).toContain('d="M10 5.83333V17.5M10 5.83333C10 4.94928');
    expect(bookIcon).toContain('H17.5006C17.7216 2.5 17.9336 2.5878 18.0899 2.74408');
  });

  it("navigates to the article detail with the tapped article id", () => {
    const page = createPageInstance();

    page.openArticle({ currentTarget: { dataset: { id: "a-1" } } });

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/article/index?id=a-1");
  });
});
