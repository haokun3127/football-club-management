import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ children: vi.fn(), records: vi.fn(), correct: vi.fn(), session: vi.fn(), markGrowthStale: vi.fn() }));
vi.mock("../../../utils/api", () => ({ getParentChildren: mocks.children }));
vi.mock("../../../utils/training-records", () => ({ getTrainingRecords: mocks.records, correctTrainingRecord: mocks.correct }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.session }));
vi.mock("../../../utils/growth-invalidation", () => ({ markGrowthStale: mocks.markGrowthStale }));
vi.mock("../../../utils/presentation", () => ({ formatShortDate: () => "9月21日", formatDateTime: (s) => s, resolveMenuInset: () => 0, resolveNavInset: () => 0 }));
let definition;
globalThis.Page = (value) => { definition = value; };
globalThis.wx = { showToast: vi.fn(), navigateBack: vi.fn() };
await import("./index.ts");
const record = { eventId: "event-2", studentId: "student-2", title: "技术训练", counted: true, revision: 1, occurredAt: "2026-09-21T08:00:00Z", source: "automatic", history: [] };
function page() { return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockReturnValue({ role: "parent", currentStudentId: "student-2" });
  mocks.children.mockResolvedValue([{ id: "student-1", name: "甲" }, { id: "student-2", name: "乙" }]);
  mocks.records.mockResolvedValue({ total: 1, records: [record] });
});
describe("parent training facts and corrections", () => {
  it("uses the selected child and the actual server count", async () => {
    const p = page(); await p.load();
    expect(mocks.records).toHaveBeenCalledWith("student-2");
    expect(p.data.total).toBe(1);
    expect(p.data.rows[0].statusLabel).toBe("已计次");
  });
  it("retains edits after a conflict, blocks a blind retry, then uses the explicitly refreshed version", async () => {
    const p = page(); await p.load(); p.edit({ currentTarget: { dataset: { id: "event-2" } } });
    p.changeCounted({ detail: { value: false } }); p.changeReason({ detail: { value: "当天请假" } });
    mocks.correct.mockRejectedValueOnce({ code: "training_record_conflict" });
    await p.save();
    expect(p.data.reason).toBe("当天请假"); expect(p.data.draftCounted).toBe(false); expect(p.data.conflict).toBe(true);
    await p.save(); expect(mocks.correct).toHaveBeenCalledTimes(1);
    mocks.records.mockResolvedValueOnce({ total: 1, records: [{ ...record, revision: 2 }] });
    await p.refreshConflict(); expect(p.data.reason).toBe("当天请假");
    mocks.correct.mockResolvedValueOnce({ record: { ...record, counted: false, revision: 3 } });
    await p.save();
    expect(mocks.correct).toHaveBeenLastCalledWith("student-2", "event-2", { expectedRevision: 2, counted: false, reason: "当天请假" });
    expect(p.data.total).toBe(0); expect(p.data.editing).toBeNull();
  });
  it("does not submit without a reason or close the editor after a network failure", async () => {
    const p = page(); await p.load(); p.edit({ currentTarget: { dataset: { id: "event-2" } } });
    await p.save(); expect(mocks.correct).not.toHaveBeenCalled();
    p.changeReason({ detail: { value: "未参加" } }); mocks.correct.mockRejectedValueOnce({ message: "网络中断" });
    await p.save(); expect(p.data.editing.eventId).toBe("event-2"); expect(p.data.reason).toBe("未参加"); expect(p.data.saving).toBe(false);
  });
  it("marks growth stale only after a correction is actually saved", async () => {
    const p = page(); await p.load(); p.edit({ currentTarget: { dataset: { id: "event-2" } } });
    p.changeReason({ detail: { value: "当天请假" } });
    mocks.correct.mockRejectedValueOnce({ message: "网络中断" });
    await p.save();
    expect(mocks.markGrowthStale).not.toHaveBeenCalled();

    mocks.correct.mockResolvedValueOnce({ record: { ...record, counted: false, revision: 2 } });
    await p.save();
    expect(mocks.markGrowthStale).toHaveBeenCalledTimes(1);
  });
});
