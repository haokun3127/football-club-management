import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();
const mocks = vi.hoisted(() => ({
  getAssessmentForm: vi.fn(),
  getCoachAssessmentTasks: vi.fn(),
  getCoachTeam: vi.fn(),
  getCoachAssessmentEntries: vi.fn(),
  submitCoachAssessment: vi.fn(),
  saveCoachAssessmentEntries: vi.fn(),
  getCoachAssessmentHistory: vi.fn(),
  getCoachAssessmentCourses: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getAssessmentForm: mocks.getAssessmentForm,
  getCoachAssessmentTasks: mocks.getCoachAssessmentTasks,
  getCoachTeam: mocks.getCoachTeam,
  getCoachAssessmentEntries: mocks.getCoachAssessmentEntries,
  submitCoachAssessment: mocks.submitCoachAssessment,
  saveCoachAssessmentEntries: mocks.saveCoachAssessmentEntries,
  getCoachAssessmentHistory: mocks.getCoachAssessmentHistory,
  getCoachAssessmentCourses: mocks.getCoachAssessmentCourses,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 0, resolveNavInset: () => 0 }));

globalThis.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: "develop" } }),
  navigateBack: vi.fn(),
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  showToast: mocks.showToast,
};
let pageDefinition;
globalThis.Page = (definition) => { pageDefinition = definition; return definition; };

await import("./index.ts");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

const task = {
  id: "task-real", teamId: "team-real", teamName: "U10发展队", termLabel: "2026秋季学期",
  title: "体能综合测评", templateId: "template-real", startsOn: "2026-09-01", dueOn: "2026-09-30",
  status: "in_progress", completedStudents: 0, totalStudents: 2,
};

function createPageInstance() {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("C12.1 team batch assessment entry", () => {
  beforeEach(() => {
    storage.clear();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.getCoachAssessmentTasks.mockReset().mockResolvedValue([task]);
    mocks.getAssessmentForm.mockReset().mockResolvedValue({
      templateId: "template-real", templateName: "体能综合测评", versionName: "v1", templateVersionId: "version-real", pending: [],
      fields: [{ id: "speed", testItemId: "item-speed", metricId: "metric-speed", groupId: "fitness", groupLabel: "速度耐力", label: "30米冲刺", valueKind: "duration_seconds", inputType: "number", required: true, unit: "秒" }],
    });
    mocks.getCoachTeam.mockReset().mockResolvedValue({
      team: { id: "team-real", name: "U10发展队", season: "2026" }, stats: { memberCount: 2, trainingCount: 0, completedTrainingCount: 0, attendanceRate: null },
      members: [{ id: "student-1", name: "罗志炫" }, { id: "student-2", name: "骆啸宇" }],
    });
    mocks.getCoachAssessmentEntries.mockReset().mockResolvedValue({ savedValuesByStudent: {} });
    mocks.submitCoachAssessment.mockReset().mockResolvedValue({ assessment: { id: "saved" } });
    mocks.openPage.mockReset();
    mocks.showToast.mockReset();
  });

  it("uses the frozen roster and project scope after a student has left the live team", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,studentIds:["student-1"],testItemIds:["item-speed"],sourceEventId:"course-a",workflow:{canEdit:true,templateVersionId:"version-real",courseSelectionRequired:true,students:[{studentId:"student-1",name:"任务原学员"}]}}]);
    mocks.getCoachTeam.mockResolvedValue({team:{id:"team-real",name:"U10发展队"},members:[{id:"student-new",name:"新入队学员"}]});
    const form=await mocks.getAssessmentForm();mocks.getAssessmentForm.mockResolvedValue({...form,fields:[...form.fields,{...form.fields[0],id:"other",testItemId:"item-other"}]});
    mocks.getCoachAssessmentCourses.mockResolvedValue({courses:[{id:"course-a",title:"任务来源课",occurredAt:"2026-09-22T08:00:00Z",studentIds:["student-1"]}]});
    const page=createPageInstance();await page.onLoad({taskId:"task-real",templateId:"template-real",projectId:"fitness"});
    expect(page.data.rows.map((r)=>r.studentId)).toEqual(["student-1"]);
    expect(page.data.fields.map((f)=>f.testItemId)).toEqual(["item-speed"]);
    expect(page.data.courseIds).toEqual({"student-1":{speed:"course-a"}});
  });

  it("loads every real team member and keeps the draft scoped to task plus project", async () => {
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", projectTitle: "30米冲刺", teamName: "U10发展队", filledLabel: "已填写 0 人 · 未填写 2 人" });
    expect(page.data.rows).toHaveLength(2);
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.92" } });
    expect(page.data.rows[0]).toMatchObject({ studentId: "student-1", rawInputValue: "4.92", scoreLabel: "待提交" });
    expect(storage.has("cqTalent:develop:coach-assessment-bulk:task-real:fitness")).toBe(true);
  });

  it("submits each filled student through the real assessment contract and keeps saved values visible", async () => {
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.92" } });
    await page.saveProject();

    expect(mocks.submitCoachAssessment).toHaveBeenCalledWith(expect.objectContaining({ studentId: "student-1", assessmentTaskId: "task-real", templateId: "template-real", rawResults: [expect.objectContaining({ testItemId: "item-speed" })] }));
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
    expect(page.data.rows[0]).toMatchObject({ studentId: "student-1", rawInputValue: "4.92", statusLabel: "已保存" });
    expect(page.data.filledLabel).toBe("已填写 1 人 · 未填写 1 人");
    expect(storage.has("cqTalent:develop:coach-assessment-bulk:task-real:fitness")).toBe(false);
    await page.saveProject();
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
  });

  it("hydrates saved server values when the project is opened again", async () => {
    mocks.getCoachAssessmentEntries.mockResolvedValueOnce({
      savedValuesByStudent: { "student-1": { "item-speed": { kind: "duration_seconds", seconds: 4.92 } } },
    });
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });

    expect(page.data.rows[0]).toMatchObject({ studentId: "student-1", rawInputValue: "4.92", statusLabel: "已保存" });
    expect(page.data.lastSavedLabel).toBe("已恢复已保存成绩");
  });

  it("scores only the projects selected for this assessment session", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce({
      templateId: "template-real", templateName: "体能综合测评", versionName: "v1", templateVersionId: "version-real", pending: [],
      fields: [
        { id: "speed", testItemId: "item-speed", metricId: "metric-speed", groupId: "fitness", groupLabel: "速度耐力", label: "30米冲刺", valueKind: "duration_seconds", inputType: "number", required: true, unit: "秒" },
        { id: "passing", testItemId: "item-passing", metricId: "metric-passing", groupId: "technical", groupLabel: "传接球", label: "短传准确率", valueKind: "score", inputType: "number", required: true, unit: "分" },
        { id: "shooting", testItemId: "item-shooting", metricId: "metric-shooting", groupId: "technical", groupLabel: "射门", label: "射门力量", valueKind: "score", inputType: "number", required: true, unit: "分" },
      ],
    });
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "item-speed", projectIds: "item-speed,item-passing", title: "体能综合测评" });

    expect(page.data.projectIds).toEqual(["item-speed", "item-passing"]);
    page.nextProject();
    expect(mocks.openPage).toHaveBeenCalledWith(expect.stringContaining("projectId=item-passing"));
    expect(mocks.openPage).not.toHaveBeenCalledWith(expect.stringContaining("projectId=item-shooting"));
  });

  it("keeps a completed task readable while preventing further score edits", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValueOnce([{ ...task, status: "completed", completedStudents: 2 }]);
    mocks.getCoachAssessmentEntries.mockResolvedValueOnce({
      savedValuesByStudent: {
        "student-1": { "item-speed": { kind: "duration_seconds", seconds: 4.92 } },
        "student-2": { "item-speed": { kind: "duration_seconds", seconds: 5.14 } },
      },
    });
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", readOnly: true, projectTitle: "30米冲刺", filledLabel: "全队 2 人已完成 · 成绩已保存", lastSavedLabel: "已恢复已保存成绩" });
    expect(page.data.rows.map((row) => row.statusLabel)).toEqual(["已保存", "已保存"]);
    expect(template).toContain("{{readOnly ? '已保存' : item.statusLabel}}");
    expect(template).toContain('class="bulk-metric__readonly"');
    expect(template).toContain("class=\"bulk-metric {{readOnly ? 'bulk-metric--readonly' : ''}}\"");
    expect(template).not.toContain('{{metric.scoreLabel}}');
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.50" } });
    await page.saveProject();
    expect(page.data.rows[0]).toMatchObject({ rawInputValue: "4.92", statusLabel: "已保存" });
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
    expect(template).toContain('wx:else class="bulk-metric__input"');
  });

  it("keeps save and next actions in a full-screen WXML page without array methods", () => {
    expect(template).toContain('bindtap="saveProject"');
    expect(template).toContain('bindtap="nextProject"');
    expect(template).toContain("草稿按任务 + 项目保存，切换项目不丢失");
    expect(template).toContain('>{{projectTitle}}</view>');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("keeps V7 save before next and removes the extra top-right action", () => {
    expect(template).not.toContain("保存草稿");
    expect(template.indexOf('bindtap="saveProject"')).toBeLessThan(template.indexOf('bindtap="nextProject"'));
  });

  it("uses the V7 compact project summary and one-line student entry rows", () => {
    expect(template).toContain('class="bulk-context-line"');
    expect(template).toContain('class="bulk-summary"');
    expect(template).toContain("保存后同步标准分");
    expect(template).toContain('class="bulk-row__identity"');
    expect(template).toContain('class="bulk-row__metrics"');
    expect(template).not.toContain('class="bulk-row__head"');
    expect(template).not.toContain('class="bulk-hint"');
    expect(stylesheet).toMatch(/\.bulk-row\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center/s);
    expect(stylesheet).toMatch(/\.bulk-metric\s*\{[^}]*display:\s*flex[^}]*border-bottom:/s);
    expect(stylesheet).toMatch(/\.bulk-metric--readonly\s*\{[^}]*border-bottom:\s*0/s);
  });

  it("keeps the completed project summary on one line at the native 375px layout", () => {
    expect(stylesheet).toMatch(/\.bulk-summary__count\s*\{[^}]*min-width:\s*0[^}]*flex:\s*1[^}]*white-space:\s*nowrap/s);
    expect(stylesheet).toMatch(/\.bulk-summary__rule\s*\{[^}]*margin-left:\s*22rpx/s);
  });
});


describe("revisioned project drafts", () => {
  beforeEach(() => {
    storage.clear();
    mocks.requireRole.mockReturnValue({ role: "coach", clubId: "club-1", userId: "coach-1" });
    mocks.getCoachAssessmentTasks.mockResolvedValue([{ ...task, workflow: { templateVersionId: "version-pinned", canEdit: true } }]);
    mocks.getAssessmentForm.mockResolvedValue({ templateId: "template-real", templateVersionId: "version-pinned", fields: [
      { id: "score", testItemId: "item-score", metricId: "metric-score", groupId: "technical", label: "运控球", valueKind: "score_0_100", inputType: "number", required: true },
    ] });
    mocks.getCoachTeam.mockResolvedValue({ team: { name: "U10" }, members: [{ id: "student-1", name: "球员甲" }] });
    mocks.getCoachAssessmentEntries.mockResolvedValue({ savedValuesByStudent: {}, studentStates: { "student-1": { revision: 0, publishedRevision: null } } });
    mocks.saveCoachAssessmentEntries.mockReset().mockResolvedValue({ revision: 1, publications: [] });
    mocks.submitCoachAssessment.mockClear();
  });
  async function load() {
    const page = createPageInstance();
    await page.onLoad({ taskId: task.id, templateId: task.templateId, projectId: "item-score" });
    return page;
  }
  function input(page, value) { page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "score" } }, detail: { value } }); }

  it("requires a valid course, keeps a course-only correction in the draft and saves it with the same score", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,workflow:{templateVersionId:"version-pinned",canEdit:true,courseSelectionRequired:true}}]);
    mocks.getCoachAssessmentCourses.mockResolvedValue({courses:[{id:"course-a",title:"第一课",occurredAt:"2026-07-01T09:00:00Z",studentIds:["student-1"]},{id:"course-b",title:"第二课",occurredAt:"2026-07-02T09:00:00Z",studentIds:["student-1"]}]});
    const page=await load();input(page,"75");await page.saveProject();expect(mocks.saveCoachAssessmentEntries).not.toHaveBeenCalled();expect(page.data.saveError).toContain("所属训练课");
    page.selectCourse({currentTarget:{dataset:{}},detail:{value:"0"}});await page.saveProject();
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenLastCalledWith(task.id,"student-1",expect.objectContaining({entries:[expect.objectContaining({eventId:"course-a",value:{kind:"score_0_100",score:75}})]}));
    page.selectCourse({currentTarget:{dataset:{studentId:"student-1",fieldId:"score"}},detail:{value:"1"}});
    expect([...storage.values()][0].courseIds["student-1"].score).toBe("course-b");await page.saveProject();
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenLastCalledWith(task.id,"student-1",expect.objectContaining({entries:[expect.objectContaining({eventId:"course-b",value:{kind:"score_0_100",score:75}})]}));
    expect(page.data.rows[0].metrics[0].courseLabel).toContain("2026-07-02 17:00");
  });

  it("saves zero as a revisioned draft and pins the form without invoking legacy publication", async () => {
    const page = await load();
    input(page, "0");
    await page.saveProject();
    expect(mocks.getAssessmentForm).toHaveBeenCalledWith("template-real", "version-pinned");
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledWith(task.id, "student-1", expect.objectContaining({ expectedRevision: 0, entries: [expect.objectContaining({ value: { kind: "score_0_100", score: 0 } })] }));
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
    expect(page.data.studentStates["student-1"].revision).toBe(1);
    expect(page.data.savedValuesByStudent["student-1"].score).toBe("0");
  });
  it("rejects out-of-range scores instead of silently clamping them", async () => {
    const page = await load(); input(page, "101"); await page.saveProject();
    expect(mocks.saveCoachAssessmentEntries).not.toHaveBeenCalled();
    expect(page.data.valuesByStudent["student-1"].score).toBe("101");
    expect(page.data.saveError).toContain("0–100");
  });
  it("retains the original revision of a failed local edit when reopening", async () => {
    const page = await load(); input(page, "70");
    mocks.saveCoachAssessmentEntries.mockRejectedValue(new Error("成绩已被更新"));
    await page.saveProject();
    mocks.getCoachAssessmentEntries.mockResolvedValue({ savedValuesByStudent: { "student-1": { "item-score": { score: 80 } } }, studentStates: { "student-1": { revision: 2, publishedRevision: null } } });
    const reopened = await load();
    expect(reopened.data.valuesByStudent["student-1"].score).toBe("70");
    expect(reopened.data.studentStates["student-1"].revision).toBe(0);
    expect(page.data.saveError).toContain("已被更新");
  });
  it("requires a correction reason and prevents edits while saving", async () => {
    mocks.getCoachAssessmentEntries.mockResolvedValue({ savedValuesByStudent: {}, studentStates: { "student-1": { revision: 3, publishedRevision: 3 } } });
    const page = await load(); input(page, "75"); await page.saveProject();
    expect(mocks.saveCoachAssessmentEntries).not.toHaveBeenCalled();
    expect(page.data.saveError).toContain("更正原因");
    page.onReasonInput({ detail: { value: "核对更正" } });
    let resolve;
    mocks.saveCoachAssessmentEntries.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const saving = page.saveProject(); input(page, "90");
    expect(page.data.valuesByStudent["student-1"].score).toBe("75");
    resolve({ revision: 4, publications: [{ revision: 3 }] }); await saving;
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledWith(task.id, "student-1", expect.objectContaining({ expectedRevision: 3, reason: "核对更正" }));
  });
  it("keeps a disabled managed task read-only even when its legacy status is in progress", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValue([{ ...task, workflow: { templateVersionId: "version-pinned", canEdit: false } }]);
    const page = await load(); input(page, "75"); await page.saveProject();
    expect(page.data.readOnly).toBe(true);
    expect(mocks.saveCoachAssessmentEntries).not.toHaveBeenCalled();
  });
});
