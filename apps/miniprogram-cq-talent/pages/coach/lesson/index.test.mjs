import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ workbench: vi.fn(), records: vi.fn(), correct: vi.fn(), session: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getCoachWorkbench: mocks.workbench }));
vi.mock("../../../utils/training-records", () => ({ getTrainingRecords: mocks.records, correctTrainingRecord: mocks.correct }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.session }));
vi.mock("../../../utils/presentation", () => ({ formatShortDate: () => "9月21日", formatDateTime: (s) => s, resolveMenuInset: () => 0, resolveNavInset: () => 0 }));
let definition;
globalThis.Page = (value) => { definition = value; };
globalThis.wx = { showToast: vi.fn(), navigateBack: vi.fn() };
await import("./index.ts");
const record = { eventId: "event-2", studentId: "student-2", title: "技术训练", counted: true, revision: 1, occurredAt: "2026-09-21T08:00:00Z", source: "automatic", history: [] };
function page() { return { ...definition, data: { ...structuredClone(definition.data), eventId: "event-2" }, setData(patch) { Object.assign(this.data, patch); } }; }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockReturnValue({ role: "coach" });
  mocks.workbench.mockResolvedValue({ event: { title: "技术训练", type: "training", startsAt: record.occurredAt }, roster: [{ studentId: "student-2", name: "乙" }], trainingRecords: [record] });
  mocks.records.mockResolvedValue({ total: 1, records: [record] });
});
describe("coach training facts and corrections", () => {
  it("uses the authorized event roster and actual training facts", async () => {
    const p = page(); await p.load();
    expect(mocks.records).not.toHaveBeenCalled();
    expect(p.data.total).toBe(1);
    expect(p.data.rows[0].statusLabel).toBe("已计课次");
  });
  it("retains edits after a conflict, blocks a blind retry, then uses the explicitly refreshed version", async () => {
    const p = page(); await p.load(); p.edit({ currentTarget: { dataset: { id: "student-2" } } });
    p.changeCounted({ detail: { value: false } }); p.changeReason({ detail: { value: "当天请假" } });
    mocks.correct.mockRejectedValueOnce({ code: "training_record_conflict" });
    await p.save();
    expect(p.data.reason).toBe("当天请假"); expect(p.data.draftCounted).toBe(false); expect(p.data.conflict).toBe(true);
    await p.save(); expect(mocks.correct).toHaveBeenCalledTimes(1);
    mocks.workbench.mockResolvedValueOnce({ event: { type: "training" }, roster: [{ studentId: "student-2" }], trainingRecords: [{ ...record, revision: 2 }] });
    await p.refreshConflict(); expect(p.data.reason).toBe("当天请假");
    mocks.correct.mockResolvedValueOnce({ record: { ...record, counted: false, revision: 3 } });
    await p.save();
    expect(mocks.correct).toHaveBeenLastCalledWith("student-2", "event-2", { expectedRevision: 2, counted: false, reason: "当天请假" });
    expect(p.data.total).toBe(0); expect(p.data.editing).toBeNull();
  });
  it("does not submit without a reason or close the editor after a network failure", async () => {
    const p = page(); await p.load(); p.edit({ currentTarget: { dataset: { id: "student-2" } } });
    await p.save(); expect(mocks.correct).not.toHaveBeenCalled();
    p.changeReason({ detail: { value: "未参加" } }); mocks.correct.mockRejectedValueOnce({ message: "网络中断" });
    await p.save(); expect(p.data.editing.eventId).toBe("event-2"); expect(p.data.reason).toBe("未参加"); expect(p.data.saving).toBe(false);
  });
  it("includes unrecorded roster members, filters locally, and shows actor plus before/after history", async () => {
    mocks.workbench.mockResolvedValueOnce({ event: { type: "training", title: "训练", startsAt: record.occurredAt }, roster: [{ studentId: "student-2", name: "乙" }, { studentId: "student-3", name: "丙" }], trainingRecords: [{ ...record, history: [{ revision: 1, counted: false, source: "automatic", changedAt: "10:00", reason: "请假" }, { revision: 2, counted: true, previousCounted: false, source: "correction", actorUserId: "coach", actorDisplayName: "张教练", changedAt: "10:01", reason: "实际参加" }] }] });
    const p = page(); await p.load();
    expect(p.data.rows[1]).toMatchObject({ revision: 0, counted: false, sourceLabel: "尚未生成" });
    expect(p.data.rows[0].historyLabels[1]).toContain("张教练 · 不计课次 → 已计课次");
    p.changeFilter({ currentTarget: { dataset: { filter: "pending" } } });
    expect(p.data.visibleRows.map(row => row.studentId)).toEqual(["student-3"]);
  });
  it("blocks unknown mutation outcomes and ignores loads after unload", async () => {
    const p = page(); await p.load(); p.edit({ currentTarget: { dataset: { id: "student-2" } } }); p.changeReason({ detail: { value: "核对" } });
    mocks.correct.mockResolvedValueOnce({ record: { ...record, studentId: "other", revision: 2 } });
    await p.save(); expect(p.data.conflict).toBe(true); expect(p.data.editing).not.toBeNull();
    let resolve; mocks.workbench.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const q = page(); const pending = q.load(); q.onUnload(); resolve({ event: { type: "training" }, roster: [], trainingRecords: [] }); await pending;
    expect(q.data.state).toBe("loading");
  });

});

it("combines name search with actual recorded status, keeping pending distinct", async () => {
  mocks.workbench.mockResolvedValueOnce({ event: { type: "training", startsAt: record.occurredAt }, roster: [{ studentId: "student-2", name: "王乙" }, { studentId: "student-3", name: "王丙" }], trainingRecords: [{ ...record, counted: false }] });
  const p = page(); await p.load();
  p.searchRows({ detail: { value: " 王 " } });
  p.changeFilter({ currentTarget: { dataset: { filter: "uncounted" } } });
  expect(p.data.visibleRows.map(row => row.studentId)).toEqual(["student-2"]);
  p.changeFilter({ currentTarget: { dataset: { filter: "pending" } } });
  expect(p.data.visibleRows.map(row => row.studentId)).toEqual(["student-3"]);
  p.searchRows({ detail: { value: "无此人" } }); expect(p.data.visibleRows).toEqual([]);
});
