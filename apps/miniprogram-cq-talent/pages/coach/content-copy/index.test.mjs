import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ previewTrainingTransfer: vi.fn(), applyTrainingTransfer: vi.fn(), requireRole: vi.fn() }));
vi.mock("../../../utils/api", () => mocks);
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ formatCalendarDate: value => value.slice(0, 10), resolveMenuInset: () => 0, resolveNavInset: () => 0 }));
let definition;
globalThis.Page = value => { definition = value; };
globalThis.wx = { navigateBack: vi.fn() };
await import("./index.ts");
const source = { title: "来源", revision: "s1", count: 1, configuredMinutes: 10, items: [{ id: "a", name: "控球", configuredMinutes: 10 }], excluded: ["友谊赛"] };
const target = { eventId: "target", title: "目标", startsAt: "2099-10-01", revision: "t1", existing: [{ id: "a", name: "控球", configuredMinutes: 20 }], outcomes: { merge: { items: [{ id: "a", name: "控球", configuredMinutes: 20 }], count: 1, configuredMinutes: 20 }, replace: { items: source.items, count: 1, configuredMinutes: 10 } } };
const tap = id => ({ currentTarget: { dataset: { id } } });
function page() { return { ...definition, _eventId: "source", data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } }; }
async function selected() { const p = page(); await p.load(); p.openTargets(); p.toggleTarget(tap("target")); p.applyTargets(); return p; }
beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockReturnValue(true); mocks.previewTrainingTransfer.mockResolvedValue({ source, targets: [target] }); });
it("requires explicit targets, previews server outcomes and submits the selected mode plus both revisions", async () => {
 const p = page(); await p.load(); await p.submit(); expect(mocks.applyTrainingTransfer).not.toHaveBeenCalled();
 p.openTargets(); p.toggleTarget(tap("target")); p.applyTargets(); expect(p.data.previewRows[0].minutes).toBe(20);
 p.selectMode({ currentTarget: { dataset: { mode: "replace" } } }); expect(p.data.previewRows[0].minutes).toBe(10);
 mocks.applyTrainingTransfer.mockResolvedValue({ results: [{ eventId: "target", status: "applied" }] }); await p.submit();
 expect(mocks.applyTrainingTransfer).toHaveBeenCalledWith({ sourceEventId: "source", sourceRevision: "s1", targets: [{ eventId: "target", expectedRevision: "t1", action: "replace" }] });
 expect(p.data.results[0]).toMatchObject({ applied: true, label: "已保存" }); expect(p.data.canSubmit).toBe(false);
 await p.submit(); expect(mocks.applyTrainingTransfer).toHaveBeenCalledTimes(1);
});
it("cancels target edits without losing the applied selection", async () => {
 const p = await selected(); p.openTargets(); p.toggleTarget(tap("target")); expect(p.data.pendingCount).toBe(0); p.goBack(); expect(p.data.selectedCount).toBe(1); expect(p.data.canSubmit).toBe(true);
});
it("submits merge without replacing duplicate target configuration and reports conflicts per course", async () => {
 const p = await selected(); mocks.applyTrainingTransfer.mockResolvedValue({ results: [{ eventId: "target", status: "conflict" }] }); await p.submit();
 expect(mocks.applyTrainingTransfer.mock.calls[0][0].targets[0].action).toBe("merge"); expect(p.data.results[0].label).toContain("重新预览"); expect(p.data.needsRefresh).toBe(true);
 p.selectMode({ currentTarget: { dataset: { mode: "replace" } } }); expect(p.data.mode).toBe("merge");
 await p.load(); expect(p.data.selectedCount).toBe(0); expect(p.data.canSubmit).toBe(false);
});
it.each([null, { results: [] }, { results: [{ eventId: "other", status: "applied" }] }, { results: [{ eventId: "target", status: "unknown" }] }])("does not claim success for an incomplete or mismatched result %j", async result => {
 const p = await selected(); mocks.applyTrainingTransfer.mockResolvedValue(result); await p.submit(); expect(p.data.results).toEqual([]); expect(p.data.message).toContain("未能确认"); expect(p.data.canSubmit).toBe(false);
});
it("requires a fresh preview after transport failure and ignores callbacks after unload", async () => {
 const p = await selected(); mocks.applyTrainingTransfer.mockRejectedValueOnce(new Error("offline")); await p.submit(); expect(p.data.needsRefresh).toBe(true);
 let resolve; mocks.previewTrainingTransfer.mockReturnValueOnce(new Promise(r => { resolve = r; })); const pending = p.load(); p.onUnload(); const snapshot = structuredClone(p.data); resolve({ source, targets: [target] }); await pending; expect(p.data).toEqual(snapshot);
});
it("blocks empty sources, old servers without outcomes, and a 21st target", async () => {
 mocks.previewTrainingTransfer.mockResolvedValueOnce({ source: { ...source, count: 0 }, targets: [target] }); const empty = await selected(); expect(empty.data.canSubmit).toBe(false);
 mocks.previewTrainingTransfer.mockResolvedValueOnce({ source, targets: [] }); const noTargets = page(); await noTargets.load(); noTargets.openTargets(); expect(noTargets.data.view).toBe("targets"); expect(noTargets.data.pendingCount).toBe(0); noTargets.goBack(); expect(noTargets.data.canSubmit).toBe(false);
 mocks.previewTrainingTransfer.mockResolvedValueOnce({ source, targets: [{ ...target, outcomes: undefined }] }); const old = page(); await old.load(); expect(old.data.loadError).toContain("读取失败");
 mocks.previewTrainingTransfer.mockResolvedValueOnce({ source, targets: Array.from({ length: 21 }, (_, i) => ({ ...target, eventId: String(i) })) }); const p = page(); await p.load(); p.openTargets(); for (let i=0;i<21;i++) p.toggleTarget(tap(String(i))); p.applyTargets(); expect(p.data.selectedCount).toBe(20); expect(p.data.message).toContain("20");
});
it("does not load without coach authorization", () => { mocks.requireRole.mockReturnValue(false); const p = page(); p.onLoad({ eventId: "other" }); expect(mocks.previewTrainingTransfer).not.toHaveBeenCalled(); });
