import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openPage: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
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

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("C15.1 coach assessment submit", () => {
  beforeEach(() => {
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
  });

  it("renders only a coach's valid C15 title and positive confirmed count", () => {
    const page = createPageInstance({ state: "ready" });
    page.onLoad({ title: encodeURIComponent("真实技术评估"), count: "2" });

    expect(mocks.requireRole).toHaveBeenCalledWith("coach");
    expect(page.data).toMatchObject({
      state: "ready",
      taskTitle: "真实技术评估",
      studentCount: 2,
      countLabel: "2 名",
      dateLabel: "今天",
    });
  });

  it("uses a safe empty state for malformed input and makes no request for a non-coach", () => {
    const invalidPage = createPageInstance();
    invalidPage.onLoad({ title: "", count: "0" });
    expect(invalidPage.data).toMatchObject({
      state: "empty",
      taskTitle: "",
      studentCount: 0,
      message: "未找到可确认的评估提交信息，请返回评估任务列表。",
    });

    const fractionalPage = createPageInstance();
    fractionalPage.onLoad({ title: encodeURIComponent("真实技术评估"), count: "1.5" });
    expect(fractionalPage.data.state).toBe("empty");

    mocks.requireRole.mockReturnValue(null);
    const guestPage = createPageInstance();
    guestPage.onLoad({ title: encodeURIComponent("真实技术评估"), count: "2" });
    expect(guestPage.data.state).toBe("idle");
    expect(mocks.openPage).not.toHaveBeenCalled();
  });

  it("navigates only to current team results or one level back to the assessment list", () => {
    const page = createPageInstance({ state: "ready" });
    page.viewResults();
    page.backToList();

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/team-ability/index");
    expect(mocks.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("keeps the page state-gated, neutral, and free of unsafe WXML helpers", () => {
    expect(controller).toContain('requireRole("coach")');
    expect(template).toContain('wx:if="{{state === \'empty\'}}"');
    expect(template).toContain('wx:elif="{{state === \'ready\'}}"');
    expect(template).toContain('bindtap="viewResults"');
    expect(template).toContain('bindtap="backToList"');
    expect(template).toContain('role="coach" active="training"');
    expect(template).toContain("{{taskTitle}}已提交");
    expect(template).toContain(">查看结果</view>");
    expect(template).not.toContain("24小时");
    expect(template).not.toContain("处理中");
    expect(template).not.toContain("技术评估");
    expect(template).not.toContain("18名");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('padding-top:{{navInset}}px');
    expect(template).toContain('/assets/icons/chevron-left.svg');
    expect(template).toContain('class="c151-nav__placeholder"');
    expect(stylesheet).toMatch(/\.c151-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*padding:\s*0\s+32rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(stylesheet).toMatch(/\.c151-nav__back,\s*\.c151-nav__placeholder\s*\{(?=[^}]*width:\s*48rpx)(?=[^}]*height:\s*48rpx)/s);
    expect(stylesheet).toMatch(/\.c151-nav__title\s*\{(?=[^}]*flex:\s*1)(?=[^}]*margin-left:\s*0)(?=[^}]*font-size:\s*36rpx)(?=[^}]*line-height:\s*44rpx)/s);
    expect(stylesheet).toMatch(/\.c151-success\s*\{[^}]*gap:\s*0/s);
    expect(stylesheet).toMatch(/\.c151-success__title\s*\{[^}]*margin-top:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c151-success__subtitle\s*\{(?=[^}]*margin-top:\s*16rpx)(?=[^}]*line-height:\s*34rpx)/s);
    expect(template).toContain('class="c151-summary__details"');
    expect(stylesheet).toMatch(/\.c151-summary\s*\{[^}]*gap:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c151-summary__details\s*\{[^}]*gap:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c151-summary__title,\s*\.c151-summary__value\s*\{[^}]*line-height:\s*34rpx/s);
    expect(stylesheet).toMatch(/\.c151-summary__label\s*\{[^}]*line-height:\s*34rpx/s);
  });
});
