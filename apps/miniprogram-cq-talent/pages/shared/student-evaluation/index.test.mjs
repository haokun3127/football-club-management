import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), session: vi.fn(), role: vi.fn() }));
vi.mock("../../../utils/student-evaluations", async original => ({ ...await original(), getStudentEvaluations: mocks.list, saveStudentEvaluation: mocks.save }));
vi.mock("../../../utils/store", () => ({ getSession: mocks.session }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.role }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0, resolveMenuInset: () => 0 }));
let definition; globalThis.Page = value => { definition = value; };
globalThis.wx = { showToast: vi.fn(), showModal: vi.fn(), navigateBack: vi.fn() };
await import("./index.ts");
const phrase = { id: "observe-teammates", text: "主动观察队友" };
const evaluation = (revision = 1) => ({ clubId: "club", studentId: "s1", teamId: "t1", revision, history: [{ revision, phrases: [phrase], note: "建议", actorDisplayName: "陈教练", changedAt: "2026-10-05T02:00:00Z" }] });
const list = () => ({ studentId: "s1", studentName: "林予安", phrases: [phrase], teams: [{ id: "t1", name: "U10", canEdit: true, evaluation: evaluation() }, { id: "t2", name: "U12", canEdit: true, evaluation: null }] });
function page() { return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockReturnValue({ role: "coach" }); mocks.role.mockReturnValue(true); mocks.list.mockResolvedValue(list()); });
describe("team evaluation controller", () => {
  it("keeps explicit team scope, preloads current values and reflects only a confirmed save", async () => {
    const p = page(); await p.onLoad({ student: "s1", team: "t1", mode: "edit" });
    expect(p.data.note).toBe("建议"); expect(p.data.phrases[0].selected).toBe(true);
    p.inputNote({ detail: { value: "进步" } });
    const saved = evaluation(2); saved.history[0].note = "进步"; mocks.save.mockResolvedValue({ evaluation: saved });
    await p.save(); expect(mocks.save).toHaveBeenCalledWith("s1", "t1", { expectedRevision: 1, phraseIds: [phrase.id], note: "进步" });
    expect(p.data.mode).toBe("current"); expect(p.data.revision).toBe(2); expect(p.data.history[0].date).toBe("2026-10-05 10:00");
  });
  it("preserves edit input after unknown outcome, requires explicit refresh and prevents repeated writes", async () => {
    const p = page(); await p.onLoad({ student: "s1", team: "t1", mode: "edit" });
    p.inputNote({ detail: { value: "未丢失" } }); mocks.save.mockRejectedValue(new Error("409")); await p.save();
    expect(p.data.note).toBe("未丢失"); expect(p.data.mustReload).toBe(true); await p.save(); expect(mocks.save).toHaveBeenCalledTimes(1);
    p.reload(); wx.showModal.mock.calls.at(-1)[0].success({ confirm: false }); expect(mocks.list).toHaveBeenCalledTimes(1);
    await p.load(); expect(p.data.mustReload).toBe(false); expect(p.data.note).toBe("建议");
  });
  it("rejects mismatched save identity, stale responses and missing team instead of switching teams", async () => {
    const p = page(); await p.onLoad({ student: "s1", team: "t1", mode: "edit" });
    mocks.save.mockResolvedValue({ evaluation: { ...evaluation(2), teamId: "t2" } }); await p.save(); expect(p.data.mustReload).toBe(true);
    await p.onLoad({ student: "s1", team: "inaccessible" }); expect(p.data.state).toBe("error");
    let resolve; mocks.list.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const pending = p.onLoad({ student: "s1", team: "t1" }); p.onUnload(); resolve(list()); await pending; expect(p.data.state).toBe("loading");
  });
  it("makes parent readonly even when query requests edit and payload claims edit capability", async () => {
    mocks.session.mockReturnValue({ role: "parent", currentStudentId: "s1" });
    const p = page(); await p.onLoad({ mode: "edit" }); expect(p.data.canEdit).toBe(false); expect(p.data.mode).toBe("current");
    p.edit(); await p.save(); expect(mocks.save).not.toHaveBeenCalled();
    p.changeTeam({ detail: { value: "1" } }); expect(p.data.current).toBe(null); expect(p.data.teamId).toBe("t2");
  });
  it("shows actual additions, removals and cleared text in history", async () => {
    const response = list(); response.teams[0].evaluation.history.push({ revision: 2, phrases: [], note: "", actorDisplayName: "李教练", changedAt: "2026-10-06T02:00:00Z" }); response.teams[0].evaluation.revision = 2; mocks.list.mockResolvedValueOnce(response);
    const p = page(); await p.onLoad({ student: "s1", team: "t1", mode: "history" });
    expect(p.data.history[0].changes).toEqual(["移除：主动观察队友", "已清除补充评价"]); expect(p.data.current.note).toBe("");
  });
  it("ignores an in-flight write after unload without toast or navigation", async () => {
    const p = page(); await p.onLoad({ student: "s1", team: "t1", mode: "edit" });
    let resolve; mocks.save.mockImplementationOnce(() => new Promise(r => { resolve = r; })); const pending = p.save(); p.onUnload(); resolve({ evaluation: evaluation(2) }); await pending;
    expect(wx.showToast).not.toHaveBeenCalled(); expect(p.data.mode).toBe("edit");
  });
});
