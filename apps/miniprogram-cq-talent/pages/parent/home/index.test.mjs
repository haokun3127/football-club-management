import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ children: vi.fn(), growth: vi.fn(), news: vi.fn(), calendar: vi.fn(), records: vi.fn(), session: vi.fn(), select: vi.fn(), open: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getParentChildren: mocks.children, getParentGrowth: mocks.growth, getContentArticles: mocks.news, getParentCalendar: mocks.calendar }));
vi.mock("../../../utils/training-records", () => ({ getTrainingRecords: mocks.records }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.session }));
vi.mock("../../../utils/store", () => ({ setCurrentStudentId: mocks.select }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.open }));
vi.mock("../../../utils/presentation", () => ({ formatTimeRange: () => "16:30–18:00" }));
vi.mock("../../../utils/club-presentation", () => ({
 getClubPresentation: () => Promise.resolve({ branding: null, banners: [], optionalFeatures: [], shareTemplates: [] }),
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
});
describe("player homepage", () => {
  it("keeps the selected child's identity, real count, and empty milestones together", async () => {
    const p = page(); await p.load();
    expect(p.data.student.id).toBe("b"); expect(p.data.teamLabel).toBe("U10"); expect(p.data.trainingTotal).toBe(12);
    expect(mocks.records).toHaveBeenCalledWith("b"); expect(p.data.milestoneCount).toBe("—");
    expect(p.data.shortcuts).toHaveLength(4);
    p.openShortcut({ currentTarget: { dataset: { key: "records" } } });
    expect(mocks.open).toHaveBeenCalledWith("/pages/parent/training-history/index");
  });
  it("shows the latest milestone date like the P01 design", async () => {
    mocks.growth.mockResolvedValue({ milestones: [{ title: "阶段测评已确认", description: "教练已确认", date: "2026-09-12" }], milestonesAvailable: true });
    const p = page(); await p.load();
    expect(p.data.milestoneCount).toBe("1");
    expect(p.data.milestoneDate).toBe("9月12日");
    p.onSlideChange({ detail: { current: 1 } });
    expect(p.data.playerSlide).toBe(1);
  });
  it("keeps the latest growth line clean when no milestone date exists", async () => {
    const p = page(); await p.load();
    expect(p.data.milestoneDate).toBe("");
  });
  it("never fabricates a count when the facts request fails", async () => {
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
