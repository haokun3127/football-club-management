import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContentArticles: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getContentArticles: mocks.getContentArticles }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
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

describe("parent article detail", () => {
  beforeEach(() => {
    mocks.getContentArticles.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  });

  it("renders the requested article with precomputed paragraphs from the real contract", async () => {
    mocks.getContentArticles.mockResolvedValue([
      { id: "a-1", title: "真实标题", subtitle: "真实副标题", accent: "#a80f1b", category: "guide", body: "第一段。\n\n第二段。" },
    ]);
    const page = createPageInstance();

    await page.load("a-1");

    expect(page.data).toMatchObject({
      state: "ready",
      title: "真实标题",
      subtitle: "真实副标题",
      hasSubtitle: true,
      paragraphs: ["第一段。", "第二段。"],
    });
  });

  it("shows the empty state for a missing article id without inventing content", async () => {
    mocks.getContentArticles.mockResolvedValue([]);
    const page = createPageInstance();

    await page.load("missing");
    expect(page.data).toMatchObject({ state: "empty", message: "文章不存在或已下线。" });

    const noId = createPageInstance();
    await noId.load("");
    expect(noId.data.state).toBe("empty");
    expect(mocks.getContentArticles).toHaveBeenCalledTimes(1);
  });

  it("keeps a retryable error state when the request fails", async () => {
    mocks.getContentArticles.mockRejectedValue(new Error("network unavailable"));
    const page = createPageInstance();

    await page.load("a-1");
    expect(page.data).toMatchObject({ state: "error", message: "文章读取失败，请点击重试。" });
  });

  it("uses the contract fields only and precomputes paragraphs outside WXML", () => {
    expect(template).toContain('wx:for="{{paragraphs}}"');
    expect(template).toContain('bindaction="retryLoad"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("{{item.body");
  });
});
