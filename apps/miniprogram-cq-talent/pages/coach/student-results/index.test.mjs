import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), team: vi.fn(), role: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getCoachStudentProfile: mocks.profile, getCoachTeam: mocks.team }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.role }));
vi.mock("../../../utils/presentation", () => ({ formatShortDate: value => value.slice(5, 10), resolveMenuInset: () => 0, resolveNavInset: () => 0 }));
let definition; globalThis.Page = value => { definition = value; };
globalThis.wx = { showToast: vi.fn(), showActionSheet: vi.fn(), navigateBack: vi.fn() };
await import("./index.ts");
const row = (id, version = "v1", seconds = 4.28) => ({ id, assessmentId: id, taskId: id, testItemId: "run", metricId: "speed", name: "20米跑", value: { kind: "duration_seconds", seconds }, unit: "秒", templateVersionId: version, eventId: null, occurredAt: "2026-09-12T08:00:00Z", recordedAt: "2026-09-13T00:00:00Z" });
const response = { profile: { student: { id: "s1", name: "林予安", teams: [{ name: "U10" }] } }, confirmedResults: [row("latest"), row("previous", "v1", 4.46), row("old-version", "v0", 8.2)] };
function page() { return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
beforeEach(() => { vi.clearAllMocks(); mocks.role.mockReturnValue(true); mocks.profile.mockResolvedValue(response); });
describe("confirmed raw student results", () => {
  it("preserves raw precision and separates versions in the history chart and selection", async () => {
    const p = page(); await p.load("s1");
    expect(p.data.selected.valueLabel).toBe("4.28 秒");
    expect(p.data.history.map(row => row.id)).toEqual(["previous", "latest"]);
    expect(p.data.bars).toHaveLength(2);
    expect(p.data.alternatives.map(row => row.id)).toEqual(["old-version"]);
    p.selectResult("old-version"); expect(p.data.history.map(row => row.id)).toEqual(["old-version"]);
    expect(p.data.alternatives[0].id).toBe("latest");
  });
  it("retains the full history while showing only the latest three chart points", async () => {
    mocks.profile.mockResolvedValueOnce({ ...response, confirmedResults: Array.from({ length: 15 }, (_, i) => row(`r${i}`, "v1", 4 + i / 100)) });
    const p = page(); await p.load("s1");
    expect(p.data.history).toHaveLength(15); expect(p.data.bars.map(item => item.id)).toEqual(["r2", "r1", "r0"]);
  });
  it("keeps zero valid and uses a list when historical version identity is unavailable", async () => {
    mocks.profile.mockResolvedValueOnce({ ...response, confirmedResults: [row("zero", null, 0)] });
    const p = page(); await p.load("s1");
    expect(p.data.selected.valueLabel).toBe("0 秒"); expect(p.data.history).toHaveLength(1); expect(p.data.bars).toEqual([]);
  });
  it("distinguishes empty confirmed facts from unsupported service and stale responses", async () => {
    mocks.profile.mockResolvedValueOnce({ ...response, confirmedResults: [] }); const p = page(); await p.load("s1"); expect(p.data.state).toBe("empty");
    mocks.profile.mockResolvedValueOnce({ ...response, confirmedResults: undefined }); await p.load("s1"); expect(p.data.state).toBe("error");
    let resolve; mocks.profile.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const pending = p.load("s1"); p.onUnload(); resolve(response); await pending; expect(p.data.state).toBe("loading");
  });
  it("offers every authorized teammate through native picker pages and retains selected student identity", async () => {
    const p = page(); p.data.teamId = "t1"; await p.load("s1");
    mocks.team.mockResolvedValue({ members: Array.from({ length: 11 }, (_, i) => ({ id: `s${i + 1}`, name: `学员${i + 1}` })) });
    await p.switchStudent(); const first = wx.showActionSheet.mock.calls.at(-1)[0]; expect(first.itemList).toHaveLength(5);
    first.success({ tapIndex: 4 }); const second = wx.showActionSheet.mock.calls.at(-1)[0]; expect(second.itemList).toHaveLength(6);
    second.success({ tapIndex: 5 }); const last = wx.showActionSheet.mock.calls.at(-1)[0]; expect(last.itemList).toContain("学员11");
    last.success({ tapIndex: 1 }); expect(mocks.profile).toHaveBeenLastCalledWith("s11");
  });
});
