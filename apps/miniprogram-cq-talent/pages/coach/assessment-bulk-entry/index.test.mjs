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
  const instance = { ...pageDefinition, data: structuredClone(pageDefinition.data) };
  instance.patches = [];
  instance.setData = (patch) => {
    instance.patches.push(structuredClone(patch));
    for (const [path, value] of Object.entries(patch)) {
      const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
      let target = instance.data;
      for (const key of parts.slice(0, -1)) target = target[key];
      target[parts.at(-1)] = value;
    }
  };
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

    expect(page.data).toMatchObject({ state: "ready", projectTitle: "30米冲刺", teamName: "U10发展队", filledLabel: "已填 0/2 项 · 0/2 人完整" });
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
    expect(page.data.filledLabel).toBe("已填 1/2 项 · 1/2 人完整");
    expect(storage.has("cqTalent:develop:coach-assessment-bulk:task-real:fitness")).toBe(false);
    await page.saveProject();
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
  });

  it("reuses one assessedAt per failed save retry and regenerates it after edits", async () => {
    mocks.submitCoachAssessment
      .mockRejectedValueOnce(new Error("network outcome unknown"))
      .mockRejectedValueOnce(new Error("network outcome unknown"))
      .mockResolvedValue({ assessment: { id: "saved" } });
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.92" } });

    let tick = 0;
    const stamps = vi.spyOn(Date.prototype, "toISOString").mockImplementation(() => `2026-10-21T08:${String(tick++).padStart(2, "0")}:00.000Z`);
    try {
      // 同一笔提交失败重试两次后成功：assessedAt（以及请求体、幂等键）必须保持不变
      await page.saveProject();
      await page.saveProject();
      await page.saveProject();
      let assessedAt = mocks.submitCoachAssessment.mock.calls.map((call) => call[0].assessedAt);
      expect(assessedAt).toHaveLength(3);
      expect(new Set(assessedAt).size).toBe(1);

      // 修改成绩后重新提交：属于新的业务事实，assessedAt 重新生成
      page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.95" } });
      await page.saveProject();
      assessedAt = mocks.submitCoachAssessment.mock.calls.map((call) => call[0].assessedAt);
      expect(assessedAt).toHaveLength(4);
      expect(assessedAt[3]).not.toBe(assessedAt[0]);
    } finally {
      stamps.mockRestore();
    }
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

    expect(page.data).toMatchObject({ state: "ready", readOnly: true, projectTitle: "30米冲刺", filledLabel: "已填 2/2 项 · 2/2 人完整", lastSavedLabel: "已恢复已保存成绩" });
    expect(page.data.rows.map((row) => row.statusLabel)).toEqual(["已保存", "已保存"]);
    expect(template).toContain("{{item.statusLabel}}");
    expect(template).toContain('class="bulk-metric__readonly"');
    expect(template).toContain('wx:if="{{readOnly}}" class="bulk-metric__readonly"');
    expect(template).not.toContain('{{metric.scoreLabel}}');
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.50" } });
    await page.saveProject();
    expect(page.data.rows[0]).toMatchObject({ rawInputValue: "4.92", statusLabel: "已保存" });
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
    expect(template).toContain('disabled="{{submitting}}" type="{{metric.inputType}}"');
  });

  it("separates saving from publication and exposes accessible inputs", () => {
    expect(template).toContain('bindsecondary="saveProject"');
    expect(template).toContain('bindsubmit="saveAndContinue"');
    expect(template).toContain('bindenter="advanceInput"');
    expect(template).toContain('aria-label="{{item.name}} {{metric.label}} {{metric.unitLabel}}"');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
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
  it("supports configured raw times in the existing managed workflow", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce({templateId:"template-real",templateVersionId:"version-pinned",fields:[{id:"score",testItemId:"item-score",groupId:"technical",label:"跑动时间",valueKind:"duration_seconds",inputType:"number",required:true,minValue:0,maxValue:600,unit:"s"}]});
    const page=await load();input(page,"185.25");await page.saveProject();
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledWith(task.id,"student-1",expect.objectContaining({entries:[expect.objectContaining({value:{kind:"duration_seconds",seconds:185.25}})]}));
  });
  it("saves before continuing and stays on the current project when a draft fails", async () => {
    const page=await load();input(page,"70");mocks.openPage.mockClear();
    mocks.saveCoachAssessmentEntries.mockRejectedValueOnce(new Error("网络暂时不可用"));await page.saveAndContinue();
    expect(mocks.openPage).not.toHaveBeenCalled();expect(page.data.valuesByStudent["student-1"].score).toBe("70");
    mocks.saveCoachAssessmentEntries.mockResolvedValueOnce({revision:1,publications:[]});await page.saveAndContinue();
    expect(mocks.openPage).toHaveBeenLastCalledWith(expect.stringContaining("&review=1"));
  });
  it("retains a conflicting draft and blocks stale retries until explicit reload", async () => {
    const page = await load(); input(page, "70"); mocks.openPage.mockClear();
    mocks.saveCoachAssessmentEntries.mockRejectedValueOnce({code:"assessment_revision_conflict",statusCode:409,message:"revision changed"});
    await page.saveAndContinue();
    expect(page.data.hasConflict).toBe(true);
    expect(page.data.valuesByStudent["student-1"].score).toBe("70");
    expect(page.data.studentStates["student-1"].revision).toBe(0);
    await page.saveAndContinue();
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledTimes(1);
    expect(mocks.openPage).not.toHaveBeenCalled();
    wx.showModal = ({success}) => success({confirm:false}); await page.reloadServer();
    expect(page.data.valuesByStudent["student-1"].score).toBe("70");
    wx.showModal = ({success}) => success({confirm:true}); await page.reloadServer();
    expect(page.data.hasConflict).toBe(false);
    expect(page.data.valuesByStudent["student-1"]?.score || "").toBe("");
  });
  it("keeps an empty correction editable without deleting a saved result or navigating past it", async () => {
    mocks.getCoachAssessmentEntries.mockResolvedValue({savedValuesByStudent:{"student-1":{"item-score":{score:70}}},studentStates:{"student-1":{revision:1,publishedRevision:null}}});
    const page=await load(); input(page, ""); mocks.openPage.mockClear();
    expect(page.data.rows[0]).toMatchObject({statusLabel:"待保存",rawInputValue:""});
    await page.saveAndContinue();
    expect(mocks.saveCoachAssessmentEntries).not.toHaveBeenCalled(); expect(mocks.openPage).not.toHaveBeenCalled();
    expect(page.data.saveError).toContain("不能通过空值删除");
    const restored=await load(); expect(restored.data.rows[0].rawInputValue).toBe("");
    input(restored,"0"); await restored.saveProject();
    expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledWith(task.id,"student-1",expect.objectContaining({entries:[expect.objectContaining({value:{kind:"score_0_100",score:0}})]}));
  });
  it("marks edited saved values as pending and moves keyboard focus by field identity", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({team:{name:"U10"},members:[{id:"student-1",name:"甲"},{id:"student-2",name:"乙"}]});
    mocks.getCoachAssessmentEntries.mockResolvedValueOnce({savedValuesByStudent:{"student-1":{"item-score":{score:70}}},studentStates:{"student-1":{revision:1,publishedRevision:null}}});
    const page=await load();expect(page.data.rows[0].statusLabel).toBe("已保存");input(page,"71");expect(page.data.rows[0].statusLabel).toBe("待保存");
    page.advanceInput({currentTarget:{dataset:{studentId:"student-1",fieldId:"score"}}});expect(page.data.focusKey).toBe("student-2/score");
    page.onRawInput({currentTarget:{dataset:{studentId:"foreign",fieldId:"score"}},detail:{value:"90"}});expect(page.data.valuesByStudent.foreign).toBeUndefined();
  });

  it.each([19, 40])("keeps each keystroke within one student row for a %i-person, two-field roster", async (size) => {
    const members=Array.from({length:size},(_,i)=>({id:`student-${i+1}`,name:i===0?"测试长姓名球员甲乙丙丁戊己庚辛":`球员${i+1}`}));
    const form=await mocks.getAssessmentForm();
    mocks.getAssessmentForm.mockResolvedValue({...form,fields:[form.fields[0],{id:"time",testItemId:"item-time",groupId:"technical",label:"跑动时间",valueKind:"duration_seconds",inputType:"number",required:true,unit:"秒"}]});
    mocks.getCoachTeam.mockResolvedValue({team:{name:"U10"},members});
    mocks.getCoachAssessmentEntries.mockResolvedValue({savedValuesByStudent:{},studentStates:Object.fromEntries(members.map(m=>[m.id,{revision:0,publishedRevision:null}]))});
    const page=createPageInstance();await page.onLoad({taskId:task.id,templateId:task.templateId,projectId:"technical"});
    page.focusInput({currentTarget:{dataset:{studentId:"student-1",fieldId:"score"}}});
    page.patches=[];
    input(page,"0");
    const inputBytes=Buffer.byteLength(JSON.stringify(page.patches));
    const fullBytes=Buffer.byteLength(JSON.stringify({valuesByStudent:page.data.valuesByStudent,rows:page.data.rows,filledLabel:page.data.filledLabel}));
    expect(inputBytes).toBeLessThan(fullBytes/5);
    expect(page.patches.flatMap(p=>Object.keys(p)).filter(key=>key.startsWith("rows"))).toEqual(["rows[0]"]);
    expect(page.patches.some(p=>"valuesByStudent" in p)).toBe(false);
    expect(page.data.focusKey).toBe("student-1/score");
    console.info(`CQ-11 bridge fixture: roster=${size}, fields=2, rowPatchBytes=${inputBytes}, equivalentWholeListBytes=${fullBytes}`);
    page.advanceInput({currentTarget:{dataset:{studentId:"student-1",fieldId:"score"}}});expect(page.data.focusKey).toBe("student-1/time");
    for(const member of members){
      page.onRawInput({currentTarget:{dataset:{studentId:member.id,fieldId:"score"}},detail:{value:"0"}});
      page.onRawInput({currentTarget:{dataset:{studentId:member.id,fieldId:"time"}},detail:{value:"4.92"}});
    }
    expect(page.data.filledLabel).toBe(`已填 ${size*2}/${size*2} 项 · ${size}/${size} 人完整`);
    page.advanceInput({currentTarget:{dataset:{studentId:`student-${size}`,fieldId:"time"}}});expect(page.data.focusKey).toBe("");
    await page.saveProject();expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledTimes(size);expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
    expect(mocks.saveCoachAssessmentEntries.mock.calls.every(call=>call[2].entries.length===2 && call[2].entries[0].value.score===0 && call[2].entries[1].value.seconds===4.92)).toBe(true);
    expect(page.data.rows.every(r=>r.statusLabel==="已保存")).toBe(true);
  });
  it("shows correction tools only for a changed published student and restores reason/conflict on reopen", async () => {
    const first=await load();expect(first.data.needsCorrection).toBe(false);expect(first.data.rows[0].hasHistory).toBe(false);
    input(first,"0");expect(first.data.needsCorrection).toBe(false);
    expect(template).toContain("managed && !readOnly && (needsCorrection || hasConflict || saveError)");
    expect(template).toContain('wx:if="{{needsCorrection}}" value="{{correctionReason}}"');
    expect(template).toContain('wx:if="{{managed && item.hasHistory}}"');
    storage.clear();mocks.getCoachAssessmentEntries.mockResolvedValue({savedValuesByStudent:{"student-1":{"item-score":{score:80}}},studentStates:{"student-1":{revision:3,publishedRevision:3}}});
    const page=await load();expect(page.data.needsCorrection).toBe(false);expect(page.data.rows[0].hasHistory).toBe(true);
    input(page,"81");expect(page.data.needsCorrection).toBe(true);page.onReasonInput({detail:{value:"核对原始记录"}});
    mocks.saveCoachAssessmentEntries.mockRejectedValueOnce({statusCode:409});await page.saveProject();page.onHide();
    const reopened=await load();expect(reopened.data).toMatchObject({hasConflict:true,needsCorrection:true,correctionReason:"核对原始记录"});
    await reopened.saveProject();expect(mocks.saveCoachAssessmentEntries).toHaveBeenCalledTimes(1);
  });
  it("retains an unknown save outcome across hide/reopen and retries the same revision and body", async () => {
    const page=await load();input(page,"0");mocks.saveCoachAssessmentEntries.mockRejectedValueOnce(new Error("response unknown"));await page.saveProject();page.onHide();page.onUnload();
    const reopened=await load();expect(reopened.data.rows[0].rawInputValue).toBe("0");await reopened.saveProject();
    expect(mocks.saveCoachAssessmentEntries.mock.calls[1]).toEqual(mocks.saveCoachAssessmentEntries.mock.calls[0]);
    expect(mocks.openPage).not.toHaveBeenCalledWith(expect.stringContaining("assessment-submit"));
  });
  it("flushes unsaved state at lifecycle boundaries and ignores an in-flight save after unload", async () => {
    const page=await load();input(page,"75");let resolve;
    mocks.saveCoachAssessmentEntries.mockImplementationOnce(()=>new Promise(r=>resolve=r));const pending=page.saveProject();
    page.onUnload();const before=structuredClone(page.data);resolve({revision:1,publications:[]});await pending;
    expect(page.data).toEqual(before);expect([...storage.values()][0].valuesByStudent["student-1"].score).toBe("75");
  });
  it("keeps local data until an explicitly confirmed server reread succeeds", async () => {
    const page=await load();input(page,"70");wx.showModal=({success})=>success({confirm:true});
    mocks.getCoachAssessmentEntries.mockRejectedValueOnce(new Error("offline"));await page.reloadServer();
    expect(page.data.state).toBe("error");expect([...storage.values()][0].valuesByStudent["student-1"].score).toBe("70");
    await page.retry();expect(page.data.rows[0].rawInputValue).toBe("70");
    await page.reloadServer();expect(storage.size).toBe(0);expect(page.data.rows[0].rawInputValue).toBe("");
  });
  it("keeps valid values editable when local storage fails and reports the persistence gap", async () => {
    const page=await load();const original=wx.setStorageSync;wx.setStorageSync=()=>{throw new Error("quota");};
    try {input(page,"0");expect(page.data.rows[0].rawInputValue).toBe("0");expect(page.data.lastSavedLabel).toContain("本机草稿保存失败");}
    finally {wx.setStorageSync=original;}
    await page.saveProject();expect(page.data.savedValuesByStudent["student-1"].score).toBe("0");
  });

  it("keeps only the failed student's draft after a partial save and retries only that student", async () => {
    mocks.getCoachTeam.mockResolvedValue({team:{name:"U10"},members:[{id:"student-1",name:"甲"},{id:"student-2",name:"乙"}]});
    mocks.getCoachAssessmentEntries.mockResolvedValue({savedValuesByStudent:{},studentStates:{"student-1":{revision:0,publishedRevision:null},"student-2":{revision:0,publishedRevision:null}}});
    const page=await load();input(page,"0");page.onRawInput({currentTarget:{dataset:{studentId:"student-2",fieldId:"score"}},detail:{value:"75"}});
    mocks.saveCoachAssessmentEntries.mockResolvedValueOnce({revision:1,publications:[]}).mockRejectedValueOnce(new Error("response unknown"));await page.saveProject();
    expect(page.data.rows.map(row=>row.statusLabel)).toEqual(["已保存","待保存"]);
    expect(Object.keys([...storage.values()][0].valuesByStudent)).toEqual(["student-2"]);
    await page.saveProject();expect(mocks.saveCoachAssessmentEntries.mock.calls.map(call=>call[1])).toEqual(["student-1","student-2","student-2"]);
    expect(storage.size).toBe(0);
  });
  it("updates only the chosen student's course and preserves the keyboard target", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,workflow:{templateVersionId:"version-pinned",canEdit:true,courseSelectionRequired:true}}]);
    mocks.getCoachTeam.mockResolvedValue({team:{name:"U10"},members:[{id:"student-1",name:"甲"},{id:"student-2",name:"乙"}]});
    mocks.getCoachAssessmentCourses.mockResolvedValue({courses:[{id:"course-a",title:"第一课",occurredAt:"2026-09-01T08:00:00Z",studentIds:["student-1","student-2"]},{id:"course-b",title:"第二课",occurredAt:"2026-09-02T08:00:00Z",studentIds:["student-1"]}]});
    const page=await load();page.selectCourse({currentTarget:{dataset:{}},detail:{value:"0"}});input(page,"75");
    page.focusInput({currentTarget:{dataset:{studentId:"student-1",fieldId:"score"}}});page.patches=[];
    page.selectCourse({currentTarget:{dataset:{studentId:"student-1",fieldId:"score"}},detail:{value:"1"}});
    expect(page.patches.flatMap(p=>Object.keys(p)).filter(key=>key.startsWith("rows"))).toEqual(["rows[0]"]);
    expect(page.data.courseIds).toEqual({"student-1":{score:"course-b"},"student-2":{score:"course-a"}});expect(page.data.focusKey).toBe("student-1/score");
    expect([...storage.values()][0].courseIds["student-1"].score).toBe("course-b");
  });
  it("does not restore another coach's managed draft for the same task", async () => {
    const page=await load();input(page,"75");page.onHide();
    mocks.requireRole.mockReturnValue({role:"coach",clubId:"club-1",userId:"coach-2"});const other=await load();
    expect(other.data.rows[0].rawInputValue).toBe("");expect(other.data.draftTaskKey).not.toBe(page.data.draftTaskKey);
  });

});
