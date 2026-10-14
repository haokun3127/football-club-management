import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), create: vi.fn(), roster: vi.fn(), change: vi.fn(), role: vi.fn() }));
vi.mock("../../../utils/scout-players", () => ({ listScoutPlayers: mocks.list, getScoutPlayer: mocks.detail, createScoutPlayer: mocks.create, getEventRoster: mocks.roster, changeEventRoster: mocks.change }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.role }));
vi.mock("../../../utils/presentation", async importOriginal => ({ ...await importOriginal(), resolveNavInset: () => 0, resolveMenuInset: () => 0 }));
let definition; globalThis.Page = value => { definition = value; };
globalThis.wx = { showToast: vi.fn(), showModal: vi.fn(), navigateBack: vi.fn(), showActionSheet: vi.fn() };
await import("./index.ts");
const player = { id: "s1", name: "标准示例人员", birthDate: "1949-12-31", maskedDocument: "**************002X", status: "active", createdAt: "2026-10-05T00:00:00Z" };
const list = (players = [player], nextOffset = null) => ({ players, nextOffset, total: players.length, canCreate: true });
function page() { return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
function fill(p) { p.inputName({ detail: { value: player.name } }); p.inputIdentity({ detail: { value: "11010519491231002x" } }); }
beforeEach(() => { vi.clearAllMocks(); mocks.role.mockReturnValue(true); mocks.list.mockResolvedValue(list()); mocks.detail.mockResolvedValue({ player, participations: [] }); });
describe("scout library controller", () => {
  it("preserves the loaded search while paginating and deduplicates records", async () => {
    mocks.list.mockResolvedValueOnce(list([player], 30)); const p = page(); await p.onLoad();
    p.inputSearch({ detail: { value: "未提交搜索" } });
    mocks.list.mockResolvedValueOnce(list([player, { ...player, id: "s2" }])); await p.loadMore();
    expect(mocks.list).toHaveBeenLastCalledWith("", 30); expect(p.data.players).toHaveLength(2);
    await p.searchPlayers(); expect(mocks.list).toHaveBeenLastCalledWith("未提交搜索", 0);
  });
  it("keeps failed input, permits natural-identity retry, clears identity only after a verified result", async () => {
    const p = page(); await p.onLoad({ mode: "create" }); fill(p);
    mocks.create.mockRejectedValueOnce({ code: "identity_name_conflict" }); await p.save();
    expect(p.data.identityNumber).toBe("11010519491231002X"); expect(p.data.message).toContain("不一致"); expect(wx.showToast).not.toHaveBeenCalled();
    mocks.create.mockResolvedValueOnce({ created: false, player }); await p.save();
    expect(p.data.identityNumber).toBe(""); expect(p.data.name).toBe(""); expect(p.data.mode).toBe("detail"); expect(wx.showToast).toHaveBeenCalledWith({ title: "已找到现有档案", icon: "none" });
  });
  it("rejects a mismatched save and ignores writes completing after unload", async () => {
    const p = page(); await p.onLoad({ mode: "create" }); fill(p);
    mocks.create.mockResolvedValueOnce({ created: true, player: { ...player, name: "其他人" } }); await p.save(); expect(p.data.mode).toBe("create"); expect(wx.showToast).not.toHaveBeenCalled();
    let resolve; mocks.create.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const pending = p.save(); p.onUnload(); resolve({ created: true, player }); await pending;
    expect(p.data.identityNumber).toBe(""); expect(wx.showToast).not.toHaveBeenCalled(); expect(mocks.detail).not.toHaveBeenCalled();
  });
  it("requires deliberate discard and ignores an older search response", async () => {
    const p = page(); await p.onLoad({ mode: "create" }); fill(p); p.goBack(); wx.showModal.mock.calls.at(-1)[0].success({ confirm: false }); expect(p.data.mode).toBe("create");
    wx.showModal.mock.calls.at(-1)[0].success({ confirm: true }); await Promise.resolve(); expect(p.data.identityNumber).toBe("");
    let resolve; mocks.list.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const pending = p.load();
    p.inputSearch({ detail: { value: "new" } }); mocks.list.mockResolvedValueOnce(list([])); await p.searchPlayers(); resolve(list()); await pending;
    expect(p.data.players).toEqual([]); expect(p.data.loadedSearch).toBe("new");
  });
  it("shows missing detail as an error, never a wrong or invented history", async () => {
    mocks.detail.mockResolvedValueOnce({ player: { ...player, id: "wrong" }, participations: [] }); const p = page(); await p.onLoad({ student: "s1" }); expect(p.data.state).toBe("error"); expect(p.data.player).toBe(null);
    mocks.role.mockReturnValue(false); await p.save(); expect(mocks.create).not.toHaveBeenCalled();
  });
});

const roster = (included = false, ended = false) => ({ event: { id: "e1", title: "训练", type: "training", ended, cancelled: false, endsAt: "2099-10-09T01:00:00Z" }, roster: { eventId: "e1", revision: (included ? "b" : "a").repeat(64), participantIds: included ? [player.id] : [], temporary: included ? [{ studentId: player.id, active: true, revision: 1, history: [{ action: "add", actorName: "教练", changedAt: "2026-10-09T00:00:00Z", note: "" }] }] : [] } });
describe("event-scoped scout operations", () => {
  it("adds selected profile only after a matching server result and can remove with preserved history", async () => {
    mocks.roster.mockResolvedValue(roster()); const p = page(); await p.onLoad({ eventId: "e1", student: player.id });
    mocks.change.mockResolvedValueOnce(roster(true)); await p.addToEvent();
    expect(mocks.change).toHaveBeenCalledWith("e1", { expectedRevision: "a".repeat(64), action: "add", players: [{ studentId: player.id }] }); expect(p.data.included).toBe(true);
    p.manageRoster(); wx.showActionSheet.mock.calls.at(-1)[0].success({ tapIndex: 0 }); expect(wx.showModal.mock.calls.at(-1)[0].content).toContain("加入");
    mocks.change.mockResolvedValueOnce(roster()); await p.changeRoster("remove"); expect(p.data.included).toBe(false);
  });
  it("asks one explicit late participation choice; cancellation writes nothing", async () => {
    mocks.roster.mockResolvedValue(roster(false, true)); const p = page(); await p.onLoad({ eventId: "e1", student: player.id });
    const cancelled = p.addToEvent(); wx.showActionSheet.mock.calls.at(-1)[0].fail({ errMsg: "cancel" }); await cancelled; expect(mocks.change).not.toHaveBeenCalled();
    const pending = p.addToEvent(); mocks.change.mockResolvedValueOnce(roster(true, true)); wx.showActionSheet.mock.calls.at(-1)[0].success({ tapIndex: 1 }); await pending;
    expect(mocks.change.mock.calls.at(-1)[1].players[0].participated).toBe(false);
  });
  it("preserves successful registration when joining fails and requires a roster reread", async () => {
    mocks.roster.mockResolvedValue(roster()); mocks.create.mockResolvedValue({ created: true, player }); mocks.change.mockRejectedValue({ code: "roster_conflict" });
    const p = page(); await p.onLoad({ mode: "create", eventId: "e1" }); fill(p); await p.save();
    expect(p.data.player.id).toBe(player.id); expect(p.data.identityNumber).toBe(""); expect(p.data.mustReload).toBe(true); expect(p.data.message).toContain("档案已保存");
    await p.addToEvent(); expect(mocks.change).toHaveBeenCalledTimes(1); await p.retry(); expect(p.data.mustReload).toBe(false); expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("ignores a late action sheet choice after navigation and rejects foreign roster responses", async () => {
    mocks.roster.mockResolvedValue(roster(false, true)); const p = page(); await p.onLoad({ eventId: "e1", student: player.id });
    const pending = p.addToEvent(); p.onUnload(); wx.showActionSheet.mock.calls.at(-1)[0].success({ tapIndex: 0 }); await pending; expect(mocks.change).not.toHaveBeenCalled();
    mocks.roster.mockResolvedValue({ ...roster(), event: { ...roster().event, id: "other" } }); const another = page(); await another.onLoad({ eventId: "e1" }); expect(another.data.state).toBe("error");
  });
});
