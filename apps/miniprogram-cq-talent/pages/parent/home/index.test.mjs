import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ children: vi.fn(), growth: vi.fn(), news: vi.fn(), calendar: vi.fn(), records: vi.fn(), presentation: vi.fn(), session: vi.fn(), select: vi.fn(), open: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getParentChildren: mocks.children, getParentGrowth: mocks.growth, getContentArticles: mocks.news, getParentCalendar: mocks.calendar }));
vi.mock("../../../utils/training-records", () => ({ getTrainingRecords: mocks.records }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.session }));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.select }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.open }));
vi.mock("../../../utils/presentation", () => ({ formatTimeRange: () => "16:30–18:00" }));
vi.mock("../../../utils/club-presentation", () => ({
 getClubPresentation: mocks.presentation,
 defaultParentShortcuts: [{ key: "leave", label: "请假", path: "/pages/parent/schedule/index" }, { key: "records", label: "训练记录", path: "/pages/parent/training-history/index" }, { key: "results", label: "测评结果", path: "/pages/parent/ability-history/index" }, { key: "service", label: "私教咨询", path: "/pages/parent/private/index" }],
 parentShortcutOptions: () => [{ key: "leave", path: "/pages/parent/schedule/index" }, { key: "records", path: "/pages/parent/training-history/index" }, { key: "results", path: "/pages/parent/ability-history/index" }, { key: "service", path: "/pages/parent/private/index" }],
 restoreParentShortcuts: options => options, saveParentShortcuts: (keys, options) => keys.map(key => options.find(item => item.key === key)),
}));
let definition;
globalThis.Page = (value) => { definition = value; };
await import("./index.ts");
function page() { return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
beforeEach(() => {
  vi.clearAllMocks(); mocks.session.mockReturnValue({ role: "parent", currentStudentId: "b" });
  mocks.children.mockResolvedValue([{ id: "a", name: "甲", teams: ["U9"] }, { id: "b", name: "乙", teams: ["U10"] }]);
  mocks.records.mockResolvedValue({ total: 12, records: [] }); mocks.growth.mockResolvedValue({ milestones: [] }); mocks.news.mockResolvedValue([]); mocks.calendar.mockResolvedValue([]);
  mocks.presentation.mockResolvedValue({ branding: null, banners: [], optionalFeatures: [], shareTemplates: [] });
});
describe("player homepage", () => {
  it("keeps the selected child's identity, real count, and empty milestones together", async () => {
    const p = page(); await p.load();
    // L-02：load 现在只等待核心（孩子+训练累计+下一次训练）；快捷入口来自独立的俱乐部展示模块，需等其就绪
    await vi.waitFor(() => expect(p.data.presentationState).toBe("ready"));
    expect(p.data.student.id).toBe("b"); expect(p.data.teamLabel).toBe("U10"); expect(p.data.trainingTotal).toBe(12);
    expect(mocks.records).toHaveBeenCalledWith("b"); expect(p.data.milestoneCount).toBe("—");
    expect(p.data.shortcuts).toHaveLength(4);
    p.openShortcut({ currentTarget: { dataset: { key: "records" } } });
    expect(mocks.open).toHaveBeenCalledWith("/pages/parent/training-history/index");
  });
  it("shows the latest milestone date like the P01 design", async () => {
    mocks.growth.mockResolvedValue({ milestones: [{ title: "阶段测评已确认", description: "教练已确认", date: "2026-09-12" }], milestonesAvailable: true });
    const p = page(); await p.load();
    // L-02：成长里程碑由成长模块独立呈现，就绪后再断言其内容
    await vi.waitFor(() => expect(p.data.growthState).toBe("ready"));
    expect(p.data.milestoneCount).toBe("1");
    expect(p.data.milestoneDate).toBe("9月12日");
    expect(p.data.latestGrowthText).toBe("阶段测评已确认 · 9月12日");
    p.onSlideChange({ detail: { current: 1 } });
    expect(p.data.playerSlide).toBe(1);
  });
  it("keeps the latest growth line clean when no milestone date exists", async () => {
    const p = page(); await p.load();
    await vi.waitFor(() => expect(p.data.growthState).toBe("ready"));
    expect(p.data.milestoneDate).toBe("");
    expect(p.data.latestGrowthText).toBe("成长正在发生");
  });
  it("fails the whole page only when a core request (training facts) fails", async () => {
    // L-02：训练累计属于核心模块，核心失败仍整页错误；辅助模块失败不再拖垮整页（见下方分块用例）
    mocks.records.mockRejectedValueOnce({ message: "无法读取训练记录" });
    const p = page(); await p.load(); expect(p.data.state).toBe("error"); expect(p.data.message).toBe("无法读取训练记录");
  });
  it("does not let a slower previous child overwrite the newly selected child", async () => {
    let finishOld;
    mocks.records.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    const p = page(); const old = p.load(); await vi.waitFor(() => expect(finishOld).toBeTypeOf("function"));
    mocks.session.mockReturnValue({ role: "parent", currentStudentId: "a" }); mocks.records.mockResolvedValueOnce({ total: 3, records: [] });
    await p.load(); finishOld({ total: 12, records: [] }); await old;
    expect(p.data.student.id).toBe("a"); expect(p.data.trainingTotal).toBe(3);
  });
});

describe("L-02 progressive homepage modules", () => {
  it("keeps the rest of the page and retries only the news module when news fails", async () => {
    mocks.news.mockRejectedValueOnce({ message: "动态读取失败" });
    const p = page(); await p.load();
    await vi.waitFor(() => expect(p.data.newsState).toBe("error"));
    expect(p.data.state).toBe("ready");
    expect(p.data.trainingTotal).toBe(12);
    expect(p.data.newsMessage).toBe("动态读取失败");
    expect(p.data.news).toBeNull();
    await vi.waitFor(() => { expect(p.data.growthState).toBe("ready"); expect(p.data.presentationState).toBe("ready"); });
    mocks.news.mockResolvedValueOnce([{ id: "n1", title: "国庆训练安排", subtitle: "", accent: "", category: "notice" }]);
    const recordsCalls = mocks.records.mock.calls.length, growthCalls = mocks.growth.mock.calls.length,
      calendarCalls = mocks.calendar.mock.calls.length, childrenCalls = mocks.children.mock.calls.length;
    p.retryNews();
    await vi.waitFor(() => expect(p.data.newsState).toBe("ready"));
    expect(p.data.news.id).toBe("n1");
    expect(mocks.records.mock.calls.length).toBe(recordsCalls);
    expect(mocks.growth.mock.calls.length).toBe(growthCalls);
    expect(mocks.calendar.mock.calls.length).toBe(calendarCalls);
    expect(mocks.children.mock.calls.length).toBe(childrenCalls);
  });
  it("shows the core and news first while growth is still loading", async () => {
    let finishGrowth;
    mocks.growth.mockImplementationOnce(() => new Promise((resolve) => { finishGrowth = resolve; }));
    const p = page(); await p.load();
    expect(p.data.state).toBe("ready");
    expect(p.data.trainingTotal).toBe(12);
    await vi.waitFor(() => expect(p.data.newsState).toBe("ready"));
    expect(p.data.growthState).toBe("loading");
    expect(p.data.milestoneCount).toBe("—");
    finishGrowth({ milestones: [{ title: "阶段测评已确认", description: "教练已确认", date: "2026-09-12" }], milestonesAvailable: true });
    await vi.waitFor(() => expect(p.data.growthState).toBe("ready"));
    expect(p.data.milestoneCount).toBe("1");
  });
  it("still renders the main body when every auxiliary module fails", async () => {
    mocks.growth.mockRejectedValueOnce({ message: "成长读取失败" });
    mocks.news.mockRejectedValueOnce({ message: "动态读取失败" });
    mocks.presentation.mockRejectedValueOnce(new Error("配置读取失败"));
    const p = page(); await p.load();
    await vi.waitFor(() => { expect(p.data.growthState).toBe("error"); expect(p.data.newsState).toBe("error"); expect(p.data.presentationState).toBe("error"); });
    expect(p.data.state).toBe("ready");
    expect(p.data.student.id).toBe("b");
    expect(p.data.trainingTotal).toBe(12);
    expect(p.data.clubTitle).toBe("天才足球俱乐部");
    expect(p.data.contentMessage).toContain("俱乐部展示配置暂时无法读取");
    expect(p.data.shortcuts).toHaveLength(4);
  });
  it("recovers a failed growth module with a growth-only retry", async () => {
    mocks.growth.mockRejectedValueOnce({ message: "成长读取失败" });
    const p = page(); await p.load();
    await vi.waitFor(() => expect(p.data.growthState).toBe("error"));
    expect(p.data.milestoneCount).toBe("—");
    expect(p.data.growthMessage).toBe("成长读取失败");
    mocks.growth.mockResolvedValueOnce({ milestones: [{ title: "阶段测评已确认", description: "教练已确认", date: "2026-09-12" }], milestonesAvailable: true });
    p.retryGrowth();
    await vi.waitFor(() => expect(p.data.growthState).toBe("ready"));
    expect(p.data.milestoneCount).toBe("1");
    expect(mocks.news.mock.calls.length).toBe(1);
    expect(mocks.records.mock.calls.length).toBe(1);
  });
  it("discards a stale module retry after switching children", async () => {
    const p = page(); await p.load();
    await vi.waitFor(() => expect(p.data.growthState).toBe("ready"));
    let finishRetry;
    mocks.growth.mockImplementationOnce(() => new Promise((resolve) => { finishRetry = resolve; }));
    p.retryGrowth();
    expect(p.data.growthState).toBe("loading");
    mocks.session.mockReturnValue({ role: "parent", currentStudentId: "a" });
    await p.load();
    finishRetry?.({ milestones: [{ title: "旧孩子的里程碑", description: "", date: "2026-01-01" }], milestonesAvailable: true });
    await vi.waitFor(() => expect(p.data.growthState).toBe("ready"));
    expect(p.data.milestoneTitle).toBe("成长正在发生");
    expect(p.data.latestGrowthText).toBe("成长正在发生");
  });
});

describe("P01 visual alignment (V-01/V-05)", () => {
  const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
  const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

  it("renders the warm page surface, white player card, and red stats from club tokens only", () => {
    expect(stylesheet).toMatch(/\.home\s*\{[^}]*background:\s*var\(--club-page\)/s);
    expect(stylesheet).toMatch(/\.player-card\s*\{[^}]*background:\s*var\(--color-card\)/s);
    expect(stylesheet).toMatch(/\.metric-value\s*\{[^}]*color:\s*var\(--color-brand\)/s);
    expect(stylesheet).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("keeps the whole shortcut group on white cards without dropping the editor", () => {
    expect(template).toContain('class="shortcuts"');
    expect(template).toContain('bindtap="editShortcuts"');
    expect(template).toContain('class="shortcut-editor"');
    expect(stylesheet).toMatch(/\.shortcut\s*\{[^}]*background:\s*var\(--color-card\)/s);
  });

  it("constrains the child-switch button and lets long names ellipsis with a full-name path", () => {
    expect(template).toMatch(/<t-button class="child-button"[^>]*bindtap="toggleChildren"[^>]*>切换孩子<\/t-button>/);
    expect(template).toContain('<student-switcher wx:if="{{showChildren}}"');
    expect(stylesheet).toMatch(/\.child-button\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*220rpx[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis/s);
    expect(stylesheet).toMatch(/\.player-name\s*\{[^}]*flex:\s*1\s+1\s+auto[^}]*min-width:\s*0[^}]*text-overflow:\s*ellipsis/s);
  });

  it("keeps the light top nav and the club photo banner structure", () => {
    expect(template).toContain('<app-header title="{{clubTitle}}" title-align="left" />');
    expect(template).not.toContain('theme="dark" />\n  <view class="home-body"');
    expect(template).toContain('class="club-banner-scrim"');
    expect(stylesheet).toMatch(/\.club-banner-scrim\s*\{[^}]*linear-gradient\(90deg,\s*var\(--color-card\)/s);
  });
});
