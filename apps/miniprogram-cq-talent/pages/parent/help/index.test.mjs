import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContentFaqs: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getContentFaqs: mocks.getContentFaqs }));
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
globalThis.wx = {
  navigateBack: vi.fn(),
  showToast: vi.fn(),
};

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

const faqs = [
  { id: "faq-1", category: "真实分类一", q: "真实问题一", a: "真实回答一" },
  { id: "faq-2", category: "真实分类二", q: "真实问题二", a: "真实回答二" },
  { id: "faq-3", category: "真实分类一", q: "真实问题三", a: "真实回答三" },
];

describe("parent help center", () => {
  beforeEach(() => {
    mocks.getContentFaqs.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("derives categories and question presenters solely from the FAQ contract", async () => {
    mocks.getContentFaqs.mockResolvedValue(faqs);
    const page = createPageInstance();

    await page.loadFaqs();
    page.selectCategory({ currentTarget: { dataset: { value: "真实分类一" } } });

    expect(page.data).toMatchObject({
      state: "ready",
      activeCategory: "真实分类一",
      hasVisibleQuestions: true,
      categories: [
        { label: "全部", value: "all" },
        { label: "真实分类一", value: "真实分类一" },
        { label: "真实分类二", value: "真实分类二" },
      ],
      visibleQuestions: [
        { id: "faq-1", category: "真实分类一", q: "真实问题一", a: "真实回答一", open: false, showDivider: true },
        { id: "faq-3", category: "真实分类一", q: "真实问题三", a: "真实回答三", open: false, showDivider: false },
      ],
    });
    expect(Object.keys(page.data.questions[0]).sort()).toEqual(["a", "category", "id", "open", "q"]);
  });

  it("expands only the selected real FAQ and keeps its category filtering", async () => {
    mocks.getContentFaqs.mockResolvedValue(faqs);
    const page = createPageInstance();
    await page.loadFaqs();
    page.selectCategory({ currentTarget: { dataset: { value: "真实分类一" } } });
    page.toggleQuestion({ currentTarget: { dataset: { id: "faq-3" } } });

    expect(page.data.visibleQuestions).toEqual([
      { id: "faq-1", category: "真实分类一", q: "真实问题一", a: "真实回答一", open: false, showDivider: true },
      { id: "faq-3", category: "真实分类一", q: "真实问题三", a: "真实回答三", open: true, showDivider: false },
    ]);
  });

  it("keeps loading, error, and empty states visible without a toast-only fallback", async () => {
    let resolveFaqs;
    mocks.getContentFaqs.mockReturnValue(new Promise((resolve) => {
      resolveFaqs = resolve;
    }));
    const loadingPage = createPageInstance();
    const loading = loadingPage.loadFaqs();

    expect(loadingPage.data).toMatchObject({ state: "loading", message: "正在加载帮助问题" });
    resolveFaqs([]);
    await loading;
    expect(loadingPage.data).toMatchObject({ state: "empty", message: "暂无可展示的帮助问题" });

    mocks.getContentFaqs.mockRejectedValue(new Error("network unavailable"));
    const errorPage = createPageInstance();
    await errorPage.loadFaqs();

    expect(errorPage.data).toMatchObject({
      state: "error",
      message: "帮助问题加载失败，请点击重试",
      hasVisibleQuestions: false,
    });
    expect(globalThis.wx.showToast).not.toHaveBeenCalled();
  });

  it("does not expose unsupported search, human service, or sample contact facts", () => {
    expect(template).toContain('state="{{state}}"');
    expect(template).toContain('bindaction="loadFaqs"');
    expect(template).toContain('data-value="{{item.value}}"');
    expect(template).toContain('bindtap="toggleQuestion"');
    expect(template).not.toContain('bindtap="openSearch"');
    expect(template).not.toContain('bindtap="openCategory"');
    expect(template).not.toContain('bindtap="contactWechat"');
    expect(template).not.toContain("微信客服");
    expect(template).not.toContain("前台电话");
    expect(template).not.toContain("工作时间");
    expect(template).not.toContain("家长如何确认孩子到场");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("contactWechat()");
    expect(controller).not.toContain("openSearch()");
    expect(controller).not.toContain("openCategory()");
  });
});
