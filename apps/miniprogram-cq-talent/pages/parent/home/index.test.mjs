import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ children: vi.fn(), growth: vi.fn(), news: vi.fn(), calendar: vi.fn(), records: vi.fn(), presentation: vi.fn(), session: vi.fn(), select: vi.fn(), open: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getParentChildren: mocks.children, getParentGrowth: mocks.growth, getContentArticles: mocks.news, getParentCalendar: mocks.calendar }));
vi.mock("../../../utils/training-records", () => ({ getTrainingRecords: mocks.records }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.session }));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.select }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.open }));
vi.mock("../../../utils/presentation", () => ({ activityTypeLabel: type => ({training:"训练",match:"比赛",other:"俱乐部活动"})[type], formatCalendarDate: () => "2026年10月23日 周五", formatTimeRange: () => "16:30–18:00" }));
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
    // 展示配置独立读取；等待该模块就绪后检查入口。
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
  it("keeps the page usable when training totals fail", async () => {
    mocks.records.mockRejectedValueOnce({ message: "无法读取训练记录" });
    const p = page(); await p.load(); expect(p.data.state).toBe("ready"); expect(p.data.trainingState).toBe("error"); expect(p.data.trainingTotal).toBeNull(); expect(p.data.trainingMessage).toBe("无法读取训练记录");
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

it("opens the next training with its visible date and explicit selected child",async()=>{
 const startsAt=new Date(Date.now()+86400000).toISOString();
 mocks.calendar.mockResolvedValue([{id:"next-course",type:"training",status:"scheduled",title:"训练",startsAt,endsAt:startsAt,childIds:["b"],teamName:"U10",venue:"球场"}]);
 const p=page();await p.load();expect(p.data.nextEventTime).toContain("2026年10月23日");p.openNextEvent();expect(mocks.open).toHaveBeenCalledWith("/pages/parent/event/index?id=next-course&studentId=b");
});

function activity(id, type, startOffset, endOffset, extra = {}) {
  const now = Date.now();
  return { id, type, status: "scheduled", title: id, venue: "球场", childIds: ["b"],
    startsAt: new Date(now + startOffset * 60000).toISOString(),
    endsAt: new Date(now + endOffset * 60000).toISOString(), ...extra };
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

describe("CQ-12 current and next activity", () => {
  it("selects an earlier match before training and preserves child context", async () => {
    mocks.calendar.mockResolvedValue([activity("training", "training", 120, 180), activity("match", "match", 60, 90)]);
    const p = page(); await p.load();
    expect(p.data.nextEvent.id).toBe("match"); expect(p.data.nextEventType).toBe("比赛");
    expect(p.data.nextEventHeading).toBe("下一项活动");
    p.openNextEvent(); expect(mocks.open).toHaveBeenCalledWith("/pages/parent/event/index?id=match&studentId=b");
  });
  it.each(["training", "match", "other"])("prefers an ongoing %s and excludes cancelled, completed and other children", async type => {
    mocks.calendar.mockResolvedValue([
      activity("cancelled", "training", -60, 60, { status: "cancelled" }),
      activity("completed", "training", -50, 60, { status: "completed" }),
      activity("sibling", "match", -40, 60, { childIds: ["a"] }),
      activity("past", "other", -30, -10), activity("future", "training", 30, 60),
      activity("ongoing", type, -20, 20),
    ]);
    const p = page(); await p.load();
    expect(p.data.nextEvent.id).toBe("ongoing"); expect(p.data.nextEventHeading).toBe("进行中的活动");
  });
  it("keeps calendar ready while totals are pending, then retries only the failed totals", async () => {
    const old = deferred(); mocks.records.mockReturnValueOnce(old.promise);
    mocks.calendar.mockResolvedValue([activity("next", "other", 10, 20)]);
    const p = page(), loading = p.load();
    await vi.waitFor(() => expect(p.data.calendarState).toBe("ready"));
    expect(p.data.state).toBe("ready"); expect(p.data.trainingState).toBe("loading"); expect(p.data.trainingTotal).toBeNull();
    p.openNextEvent(); expect(mocks.open).toHaveBeenCalled();
    old.reject(new Error("累计失败")); await loading;
    expect(p.data.trainingState).toBe("error");
    p.retryTraining(); await vi.waitFor(() => expect(p.data.trainingState).toBe("ready"));
    expect(p.data.trainingTotal).toBe(12); expect(mocks.calendar).toHaveBeenCalledTimes(1); expect(mocks.children).toHaveBeenCalledTimes(1);
  });
  it("keeps real zero totals when calendar fails and retries only the calendar", async () => {
    mocks.records.mockResolvedValue({ total: 0, records: [] }); mocks.calendar.mockRejectedValueOnce(new Error("日历失败"));
    const p = page(); await p.load();
    expect(p.data.trainingState).toBe("ready"); expect(p.data.trainingTotal).toBe(0);
    expect(p.data.calendarState).toBe("error"); expect(p.data.nextEvent).toBeNull();
    p.retryCalendar(); await vi.waitFor(() => expect(p.data.calendarState).toBe("ready"));
    expect(mocks.records).toHaveBeenCalledTimes(1); expect(mocks.children).toHaveBeenCalledTimes(1);
  });
  it("clears old facts on refresh and ignores a late calendar response for the previous child", async () => {
    const p = page(); await p.load(); const old = deferred(); mocks.calendar.mockReturnValueOnce(old.promise);
    const refresh = p.load(); await vi.waitFor(() => expect(p.data.calendarState).toBe("loading"));
    expect(p.data.nextEvent).toBeNull();
    mocks.session.mockReturnValue({ role: "parent", currentStudentId: "a" });
    mocks.calendar.mockResolvedValueOnce([activity("a-next", "match", 10, 20, { childIds: ["a"] })]);
    await p.load(); old.resolve([activity("b-old", "training", -10, 20)]); await refresh;
    expect(p.data.student.id).toBe("a"); expect(p.data.nextEvent.id).toBe("a-next");
  });
  it("discards older same-child retries and responses after unload", async () => {
    const p = page(); await p.load(); const old = deferred(); mocks.calendar.mockReturnValueOnce(old.promise);
    p.retryCalendar(); mocks.calendar.mockResolvedValueOnce([activity("latest", "other", 10, 20)]);
    p.retryCalendar(); await vi.waitFor(() => expect(p.data.nextEvent?.id).toBe("latest"));
    old.resolve([activity("old", "training", -10, 20)]); await old.promise;
    expect(p.data.nextEvent.id).toBe("latest");
    const pending = deferred(); mocks.records.mockReturnValueOnce(pending.promise); p.retryTraining(); p.onUnload();
    pending.resolve({ total: 99, records: [] }); await pending.promise;
    expect(p.data.trainingTotal).toBeNull();
  });
  it("binds separate retry and loading states and limits leave wording to training", () => {
    const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
    expect(template).toContain('bindtap="retryTraining"'); expect(template).toContain('bindtap="retryCalendar"');
    expect(template).toContain("trainingState === 'ready' ? trainingTotal : '—'");
    expect(template).toContain("nextEvent.type === 'training' ? '查看训练与请假' : '查看活动详情'");
  });
});
