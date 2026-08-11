import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContentFaqs: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getContentFaqs: mocks.getContentFaqs }));
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

const faqs = [
  { id: "faq-1", category: "训练", q: "如何安排训练？", a: "使用活动工作台安排训练内容。" },
  { id: "faq-2", category: "训练", q: "训练记录何时更新？", a: "记录同步后显示。" },
  { id: "faq-3", category: "出勤", q: "出勤如何更正？", a: "请提交出勤更正。" },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach help", () => {
  beforeEach(() => {
    mocks.getContentFaqs.mockReset().mockResolvedValue(faqs);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
  });

  it("loads real FAQ fields once for a coach and derives local category, search, and expansion state", async () => {
    const page = createPageInstance();

    await page.onLoad();

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(mocks.getContentFaqs).toHaveBeenCalledTimes(1);
    expect(page.data).toMatchObject({
      state: "ready",
      categories: [
        { label: "全部", value: "all" },
        { label: "训练", value: "训练" },
        { label: "出勤", value: "出勤" },
      ],
      visibleQuestions: [
        { id: "faq-1", q: "如何安排训练？", a: "使用活动工作台安排训练内容。", category: "训练", open: false },
        { id: "faq-2", q: "训练记录何时更新？", a: "记录同步后显示。", category: "训练", open: false },
        { id: "faq-3", q: "出勤如何更正？", a: "请提交出勤更正。", category: "出勤", open: false },
      ],
    });
    expect(page.data.categories.map((item) => item.icon)).toEqual([
      "/assets/icons/c164-category-attendance.svg",
      "/assets/icons/c164-category-training.svg",
      "/assets/icons/c164-category-attendance.svg",
    ]);
    expect(page.data.visibleQuestions.map((item) => item.showDivider)).toEqual([true, true, false]);
    expect(Object.keys(page.data.questions[0]).sort()).toEqual(["a", "category", "id", "open", "q"]);

    page.onSearchInput({ detail: { value: "同步" } });
    expect(page.data.visibleQuestions.map((item) => item.id)).toEqual(["faq-2"]);

    page.onSearchInput({ detail: { value: "出勤" } });
    expect(page.data.visibleQuestions.map((item) => item.id)).toEqual(["faq-3"]);
    page.selectCategory({ currentTarget: { dataset: { value: "出勤" } } });
    page.toggleQuestion({ currentTarget: { dataset: { id: "faq-3" } } });
    expect(page.data.visibleQuestions).toMatchObject([{ id: "faq-3", open: true }]);
    expect(mocks.getContentFaqs).toHaveBeenCalledTimes(1);
  });

  it("makes no request for a non-coach and keeps loading, empty, and errors safe", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.onLoad();
    expect(mocks.getContentFaqs).not.toHaveBeenCalled();

    const pending = deferred();
    mocks.getContentFaqs.mockReturnValueOnce(pending.promise);
    const loadingPage = createPageInstance();
    const loading = loadingPage.loadFaqs();
    expect(loadingPage.data).toMatchObject({ state: "loading", message: "正在同步帮助内容" });
    pending.resolve([]);
    await loading;
    expect(loadingPage.data).toMatchObject({ state: "empty", message: "暂无可展示的帮助问题" });

    mocks.getContentFaqs.mockRejectedValueOnce(new Error("raw upstream support contact"));
    const errorPage = createPageInstance();
    await errorPage.loadFaqs();
    expect(errorPage.data).toMatchObject({ state: "error", message: "帮助内容待同步" });
    expect(errorPage.data.message).not.toContain("raw upstream support contact");
  });

  it("ignores stale FAQ success and failure", async () => {
    const first = deferred();
    const second = deferred();
    mocks.getContentFaqs.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const page = createPageInstance();

    const firstLoad = page.loadFaqs();
    await Promise.resolve();
    const secondLoad = page.loadFaqs();
    second.resolve([{ ...faqs[0], id: "latest" }]);
    await secondLoad;
    first.reject(new Error("older failure"));
    await firstLoad;
    expect(page.data).toMatchObject({ state: "ready", visibleQuestions: [{ id: "latest" }] });

    const staleSuccess = deferred();
    const latestFailure = deferred();
    mocks.getContentFaqs.mockImplementationOnce(() => staleSuccess.promise).mockImplementationOnce(() => latestFailure.promise);
    const oldLoad = page.loadFaqs();
    await Promise.resolve();
    const currentLoad = page.loadFaqs();
    latestFailure.reject(new Error("latest failure"));
    await currentLoad;
    staleSuccess.resolve([{ ...faqs[0], id: "old" }]);
    await oldLoad;
    expect(page.data).toMatchObject({ state: "error", message: "帮助内容待同步", visibleQuestions: [] });
  });

  it("uses a local Figma nav and neutral assets without sample topics or support interactions", () => {
    const page = createPageInstance();
    page.goBack();

    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
    for (const name of ["chevron-left", "search", "question", "chevron-right"]) {
      expect(existsSync(new URL(`../../../assets/icons/c164-${name}.svg`, import.meta.url))).toBe(true);
    }
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="c164-nav"');
    expect(template).toContain('class="c164-nav__spacer"');
    expect(template).not.toContain("c164-nav__placeholder");
    expect(template).toContain('src="{{item.icon}}"');
    expect(template).toContain("支持方式待配置");
    expect([...template.matchAll(/\bbind(?:tap|input|longpress|change|submit|action)\s*=/g)]).toHaveLength(4);
    expect(template).toMatch(/class="c164-nav__back"[^>]*bindtap="goBack"/);
    expect(template).toMatch(/class="c164-search__input"[^>]*bindinput="onSearchInput"/);
    expect(template).not.toMatch(/出勤操作|活动管理|评分评估|私教流程|账号权限|客服电话|公众号|在线咨询|工作日\s*9:00|文字图标/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toMatch(/TOPICS|showToast|showModal|getStorage|setStorage|contactWechat|openSupport/);
    expect(stylesheet).toMatch(/\.c164-nav\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*border-box[^}]*background:\s*#fceeef/s);
    expect(stylesheet).toMatch(/\.c164-nav__title\s*\{[^}]*flex:\s*1[^}]*text-align:\s*center/s);
    expect(stylesheet).toMatch(/\.c164-nav__spacer\s*\{[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c164-page__body\s*\{[^}]*padding:\s*32rpx\s+44rpx\s+180rpx/s);
    expect(stylesheet).toMatch(/\.c164-content\s*\{[^}]*gap:\s*40rpx/s);
    expect(stylesheet).toMatch(/\.c164-card\s*\{[^}]*border-radius:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c164-category-grid\s*\{[^}]*gap:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c164-category-card\s*\{[^}]*width:\s*280rpx/s);
    expect(stylesheet).toMatch(/\.c164-faq-card__header\s*\{[^}]*border-bottom:\s*1rpx\s+solid\s+#e7eaf0/s);
    expect(stylesheet).toMatch(/\.c164-faq-item--line\s*\{[^}]*border-bottom:\s*1rpx\s+solid\s+#e7eaf0/s);
  });
});
