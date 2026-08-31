import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVenues: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getVenues: mocks.getVenues }));
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
  openLocation: vi.fn(),
  showToast: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

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

const venue = {
  id: "venue-1",
  name: "真实场馆",
  type: "11人制场地",
  address: "真实地址",
  tags: ["outdoor", "natural"],
  facilities: ["真实设施"],
  latitude: 29.5,
  longitude: 106.5,
  monthlyCount: 4,
};

describe("parent venues", () => {
  beforeEach(() => {
    mocks.getVenues.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.openLocation.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("maps only supported venue fields, presents usage, and filters real tags", async () => {
    mocks.getVenues.mockResolvedValue([venue]);
    const page = createPageInstance();

    await page.loadVenues();
    page.selectFilter({ currentTarget: { dataset: { value: "outdoor" } } });

    expect(page.data).toMatchObject({
      state: "ready",
      activeFilter: "outdoor",
      hasVisibleVenues: true,
      venues: [{
        id: "venue-1",
        name: "真实场馆",
        type: "11人制场地",
        address: "真实地址",
        tags: ["outdoor", "natural"],
        facilities: ["真实设施"],
        latitude: 29.5,
        longitude: 106.5,
        monthlyCount: 4,
        canNavigate: true,
        usageLabel: "本月训练 4次",
        heroImage: "/assets/venues/venue-1.png",
      }],
    });
    expect(page.data.venues[0]).not.toHaveProperty("gradient");
    expect(page.data.venues[0]).not.toHaveProperty("imageUrl");
  });

  it("shows loading, error, and empty states without a toast-only fallback", async () => {
    let resolveVenues;
    mocks.getVenues.mockReturnValue(new Promise((resolve) => {
      resolveVenues = resolve;
    }));
    const loadingPage = createPageInstance();
    const loading = loadingPage.loadVenues();

    expect(loadingPage.data).toMatchObject({ state: "loading", message: "正在加载场地" });
    resolveVenues([]);
    await loading;
    expect(loadingPage.data).toMatchObject({ state: "empty", message: "暂无可展示的场地" });

    mocks.getVenues.mockRejectedValue(new Error("network unavailable"));
    const errorPage = createPageInstance();
    await errorPage.loadVenues();

    expect(errorPage.data).toMatchObject({
      state: "error",
      message: "场地加载失败，请点击重试",
      hasVisibleVenues: false,
    });
    expect(globalThis.wx.showToast).not.toHaveBeenCalled();
  });

  it("offers map navigation only for validated coordinates", async () => {
    mocks.getVenues.mockResolvedValue([
      venue,
      { ...venue, id: "venue-without-location", latitude: 0, longitude: 0 },
    ]);
    const page = createPageInstance();
    await page.loadVenues();

    page.navigate({ currentTarget: { dataset: { id: "venue-1" } } });
    page.navigate({ currentTarget: { dataset: { id: "venue-without-location" } } });

    expect(globalThis.wx.openLocation).toHaveBeenCalledTimes(1);
    expect(globalThis.wx.openLocation).toHaveBeenCalledWith({
      latitude: 29.5,
      longitude: 106.5,
      name: "真实场馆",
      address: "真实地址",
    });
    expect(page.data.venues[1].canNavigate).toBe(false);
    expect(globalThis.wx.showToast).not.toHaveBeenCalled();
  });

  it("does not expose unsupported search, photo, or location actions in the template", () => {
    expect(template).toContain('state="{{state}}"');
    expect(template).toContain('bindaction="loadVenues"');
    expect(template).toContain('wx:if="{{item.canNavigate}}"');
    expect(template).not.toContain('wx:for="{{item.tags}}"');
    expect(template).not.toContain('bindtap="openSearch"');
    expect(template).not.toContain("item.gradient");
    expect(template).not.toContain("http");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("九龙坡足球公园");
    expect(template).not.toContain("营业时间");
    expect(template).not.toContain("电话");
    expect(controller).not.toContain("openSearch()");
    expect(controller).not.toContain("GRADIENTS");
  });

  it("starts the title directly after the 24px Figma back slot", () => {
    expect(styles).not.toContain(".venues-nav__title { flex: 1; margin-left: 24rpx;");
    expect(styles).toContain(".venues-nav__title { flex: 1; margin-left: 0;");
  });
});
