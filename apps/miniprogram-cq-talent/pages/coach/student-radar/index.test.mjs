import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getCoachTeam: vi.fn(), getCoachStudentProfile: vi.fn(), requireRole: vi.fn(), openPage: vi.fn() }));
vi.mock("../../../utils/api", () => mocks);
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0, resolveMenuInset: () => 0 }));
globalThis.wx = { navigateBack: vi.fn() };
let definition; globalThis.Page = value => { definition = value; };
await import("./index.ts");
const profile = {
 student: { id: "s1", name: "超过四个字的姓名", age: 10, school: null, dominantFoot: "left", level: null, teams: [{ id: "t2", name: "第二队", joinedAt: "2026-01-01" }] },
 attendance: { expected: 3, present: 2, absent: 1, leave: 0, late: 1, unrecorded: 0, effectiveLessons: 1, earlyLeave: null },
 records: [{ eventId: "e1", title: "训练", occurredAt: "2026-09-20T18:00:00Z", status: "present", counted: false, source: "correction", revision: 2, history: [{ revision: 2, counted: false, source: "correction", reason: "重复排课", changedAt: "2026-09-23T00:00:00Z" }] }],
 training: { modules: [{ label: "后台分类", courses: 1, configuredMinutes: 20 }], participation: 2, formalMatches: 0, friendlyMatches: null, completionTargets: null },
};
const result = { profile, radar: [{ metricId: "one", label: "后台能力一", value: 0, maxValue: 100, occurredAt: "2026-09-20T18:00:00Z" }, { metricId: "two", label: "后台能力二", maxValue: 100 }], overall: null, modelName: "后台配置模型" };
function page() { return { ...definition, data: structuredClone(definition.data), setData(value) { Object.assign(this.data, value); } }; }
beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockReturnValue(true); mocks.getCoachStudentProfile.mockResolvedValue(result); mocks.getCoachTeam.mockResolvedValue({ team: { id: "t2" }, members: [{ id: "s1", name: "长姓名" }, { id: "s2", name: "第二学员" }] }); });
describe("three-region student teaching profile", () => {
 it("uses the requested child directly, keeps full names, zero and missing dimensions, and never invents an overall score", async () => {
  const p = page(); await p.onLoad({ student: "s1" });
  expect(mocks.getCoachTeam).not.toHaveBeenCalled(); expect(mocks.getCoachStudentProfile).toHaveBeenCalledWith("s1");
  expect(p.data.activeStudentName).toBe("超过四个字的姓名"); expect(p.data.state).toBe("ready"); expect(p.data.hasRadar).toBe(false);
  expect(p.data.dimensions.map(x => x.value)).toEqual(["0", "未测评"]); expect(p.data.overall).toBe("未形成完整结果");
  expect(p.data.records[0]).toMatchObject({ date: "2026-09-21", countLabel: "不计次", revised: true });
  expect(p.data.attendance.find(x => x.label === "早退").value).toBe("未记录");
  p.showHistory({ currentTarget: { dataset: { id: "e1" } } }); expect(p.data.history[0].reason).toBe("重复排课");
 });
 it("opens summary drilldowns with the exact student and team and safely defaults unknown sections", async () => {
  const p = page(); await p.onLoad({ student: "s1", team: "t2", section: "unsafe" });
  expect(p.data.section).toBe("summary");
  p.openSection({ currentTarget: { dataset: { section: "training" } } });
  expect(mocks.openPage).toHaveBeenLastCalledWith("/pages/coach/student-radar/index?student=s1&team=t2&section=training");
  const detail = page(); await detail.onLoad({ student: "s1", team: "t2", section: "training" });
  expect(detail.data.section).toBe("training"); expect(detail.data.pageTitle).toBe("学员训练记录");
  expect(detail.data.records[0].countLabel).toBe("不计次");
 });
 it("counts confirmed tasks rather than individual raw items and keeps unavailable distinct from empty", async () => {
  const p = page(); await p.load("s1"); expect(p.data.confirmedSummary).toBe("已确认成绩暂不可用");
  mocks.getCoachStudentProfile.mockResolvedValueOnce({ ...result, confirmedResults: [{ taskId: "t1" }, { taskId: "t1" }, { taskId: "t2" }] });
  await p.load("s1"); expect(p.data.confirmedSummary).toBe("已确认测评 2次");
 });
 it("preserves every configured dimension rather than six fixed axes", async () => {
  mocks.getCoachStudentProfile.mockResolvedValueOnce({ ...result, radar: Array.from({ length: 8 }, (_, i) => ({ metricId: String(i), label: `能力${i}`, value: i, maxValue: 100 })) });
  const p = page(); await p.load("s1"); expect(p.data.radar).toHaveLength(8); expect(p.data.hasRadar).toBe(true);
 });
 it("uses explicit team context and loads another child without growing the navigation stack", async () => {
  const p = page(); await p.onLoad({ student: "s1", team: "t2" }); expect(mocks.getCoachTeam).toHaveBeenCalledWith("t2");
  await p.selectStudent({ currentTarget: { dataset: { id: "s2" } } }); expect(mocks.getCoachStudentProfile).toHaveBeenLastCalledWith("s2"); expect(mocks.openPage).not.toHaveBeenCalled();
 });
 it("ignores an old request after a newer selection and after unload", async () => {
  let resolve; mocks.getCoachStudentProfile.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const p = page(); const old = p.load("s1"); await p.load("s2"); const current = structuredClone(p.data); resolve({ ...result, profile: { ...profile, student: { ...profile.student, name: "旧数据" } } }); await old; expect(p.data).toEqual(current);
  let next; mocks.getCoachStudentProfile.mockImplementationOnce(() => new Promise(r => { next = r; })); const pending = p.load("s1"); p.onUnload(); const unloaded = structuredClone(p.data); next(result); await pending; expect(p.data).toEqual(unloaded);
 });
 it("does not silently replace a forbidden child with a default child", async () => {
  mocks.getCoachStudentProfile.mockRejectedValueOnce(new Error("forbidden private details")); const p = page(); await p.load("forbidden"); expect(p.data.state).toBe("error"); expect(mocks.getCoachTeam).not.toHaveBeenCalled(); expect(p.data.message).not.toContain("private");
 });
});
