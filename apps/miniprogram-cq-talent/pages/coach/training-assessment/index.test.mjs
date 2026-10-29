import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachWorkbench: vi.fn(),
  getCoachTrainingContentAssessments: vi.fn(),
  saveCoachTrainingContentAssessments: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  showToast: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachWorkbench: mocks.getCoachWorkbench,
  getCoachTrainingContentAssessments: mocks.getCoachTrainingContentAssessments,
  saveCoachTrainingContentAssessments: mocks.saveCoachTrainingContentAssessments,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatCalendarDate: () => "9月4日 周五",
  formatTimeOnly: () => "09:00",
  resolveMenuInset: () => 16,
  resolveNavInset: () => 0,
}));

globalThis.wx = { showToast: mocks.showToast, navigateBack: mocks.navigateBack };
let pageDefinition;
globalThis.Page = (definition) => { pageDefinition = definition; return definition; };

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

const workbench = {
  event: {
    id: "event-training",
    type: "training",
    title: "进攻训练",
    teamName: "U10发展队",
    venue: "九龙坡足球公园",
    startsAt: "2026-09-04T09:00:00.000Z",
    endsAt: "2026-09-04T10:30:00.000Z",
    status: "completed",
  },
  selectedTrainingProjects: [{ id: "project-passing", name: "传接球" }, { id: "project-finishing", name: "射门" }],
  roster: [
    { studentId: "student-1", name: "罗志炫", status: "present" },
    { studentId: "student-2", name: "骆啸宇", status: "absent" },
    { studentId: "student-3", name: "郭飞", status: "late" },
  ],
};

const assessmentScope = {
  revision:0,
  eventId: "event-training",
  selectedProjectIds: ["project-passing", "project-finishing"],
  presentStudentIds: ["student-1", "student-3"],
  assessments: [{ studentId: "student-1", trainingProjectId: "project-passing", score: 84, note: "传球节奏稳定" }],
};

function createPageInstance() {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach training content assessment", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset().mockResolvedValue(workbench);
    mocks.getCoachTrainingContentAssessments.mockReset().mockResolvedValue(assessmentScope);
    mocks.saveCoachTrainingContentAssessments.mockReset().mockResolvedValue({ eventId:"event-training",revision:1,assessments: [] });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    mocks.showToast.mockReset();
    mocks.navigateBack.mockReset();
  });

  it("shows only present learners across the real selected training content and restores saved values", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-training" });

    expect(mocks.getCoachWorkbench).toHaveBeenCalledWith("event-training");
    expect(mocks.getCoachTrainingContentAssessments).toHaveBeenCalledWith("event-training");
    expect(page.data).toMatchObject({ state: "ready", eventTitle: "进攻训练", presentCountLabel: "2 名已到学员" });
    expect(page.data.projects.map((item) => item.label)).toEqual(["传接球", "射门"]);
    expect(page.data.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-1", scoreInput: "84", noteInput: "传球节奏稳定" }),
      expect.objectContaining({ studentId: "student-3" }),
    ]));
    expect(page.data.rows.find((item) => item.studentId === "student-2")).toBeUndefined();
  });

  it("projects the real activity time into the classroom assessment course context", async () => {
    const page = createPageInstance();
    await page.load("event-training");

    expect(page.data).toMatchObject({
      eventDateTeam: "9月4日 周五 · U10发展队",
      eventTime: "09:00",
      eventVenue: "九龙坡足球公园",
      presentCountLabel: "2 名已到学员",
    });
    expect(template).toContain("{{eventTime}}");
    expect(template).toContain("{{eventDateTeam}}");
    expect(template).toContain("{{eventVenue}}");
  });

  it("keeps assessment values per selected content and saves only valid real student-project pairs", async () => {
    const page = createPageInstance();
    await page.load("event-training");
    page.onScoreInput({ currentTarget: { dataset: { studentId: "student-3" } }, detail: { value: "91" } });
    page.selectProject({ currentTarget: { dataset: { id: "project-finishing" } } });
    page.onScoreInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "88" } });
    page.onNoteInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "射门果断" } });
    await page.save();

    expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledWith("event-training", expect.arrayContaining([
      { studentId: "student-3", trainingProjectId: "project-passing", score: 91, note: "" },
      { studentId: "student-1", trainingProjectId: "project-finishing", score: 88, note: "射门果断" },
    ]),0);
  });

  it("is honest when a training activity has no checked-in learner or no selected content", async () => {
    mocks.getCoachTrainingContentAssessments.mockResolvedValueOnce({ ...assessmentScope, presentStudentIds: [] });
    const page = createPageInstance();
    await page.load("event-training");
    expect(page.data).toMatchObject({ state: "empty", statusTitle: "暂无可评测学员" });
    expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();
  });

  it("offers a direct link to select training content when the API reports it is missing", async () => {
    mocks.getCoachTrainingContentAssessments.mockRejectedValueOnce({ code: "training_content_required" });
    const page = createPageInstance();

    await page.load("event-training");

    expect(page.data).toMatchObject({
      state: "empty",
      statusTitle: "暂无训练内容",
      statusActionText: "去选择训练内容",
    });
    page.handleStatusAction();
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/content-select/index?eventId=event-training");
  });

  it("keeps the full-screen view WXML-safe and linked from C2 training workbench", () => {
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).toContain('bindtap="selectProject"');
    expect(template).toContain('bindchange="onScoreInput"');
    expect(template).toContain('bindchange="onNoteInput"');
    expect(template).toContain('bindsubmit="save"');
    expect(template).toContain('bindaction="handleStatusAction"');
    expect(pageConfig).toContain('"navigationStyle": "custom"');
    expect(pageConfig).not.toContain('"role-tabbar"');
    expect(controller).not.toContain("eventId: \"event-");
  });
  it("does not synthesize zero from a note-only entry, even alongside existing scores", async () => {
    const page=createPageInstance();await page.load("event-training");page.onNoteInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:"仅备注"}});await page.save();
    expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();expect(page.data.saveError).toContain("备注不能单独保存");expect(page.data.valuesByProject["project-passing"]["student-3"].scoreInput).toBe("");
  });
  it.each(["", "   "])("blocks clearing an existing score with %j and preserves the original until explicitly corrected", async (value) => {
    const page=createPageInstance();await page.load("event-training");page.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value}});await page.save();
    expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();expect(page.data.saveError).toContain("不能通过空值删除已保存分数");expect(page.data.rows.find(row=>row.studentId==="student-1").scoreInput).toBe(value);
    page.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"0"}});await page.save();expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledWith("event-training",[{studentId:"student-1",trainingProjectId:"project-passing",score:0,note:"传球节奏稳定"}],0);
  });
  it("preserves valid zero and ignores a new untouched blank instead of sending a fake result", async () => {
    mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,assessments:[]});const page=createPageInstance();await page.load("event-training");
    page.onScoreInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:""}});page.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:" 0 "}});await page.save();
    expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledWith("event-training",[{studentId:"student-1",trainingProjectId:"project-passing",score:0,note:""}],0);
  });
  it("validates all inputs before any request instead of silently skipping an invalid score", async () => {
    const page=createPageInstance();await page.load("event-training");page.onScoreInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:"101"}});await page.save();expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();expect(page.data.saveError).toContain("0至100");expect(page.data.valuesByProject["project-passing"]["student-3"].scoreInput).toBe("101");
  });
  it("keeps the just-saved zero non-deletable by a later empty input", async () => {
    mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,assessments:[]});const page=createPageInstance();await page.load("event-training");page.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"0"}});await page.save();mocks.saveCoachTrainingContentAssessments.mockClear();page.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:""}});await page.save();expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();expect(page.data.saveError).toContain("不能通过空值删除");
  });

  it("uses the GET revision and saves only changed pairs, then uses the successful response revision", async () => {
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:"0"}});await p.save();
    expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenLastCalledWith("event-training",[{studentId:"student-3",trainingProjectId:"project-passing",score:0,note:""}],0);expect(p.data.revision).toBe(1);
    p.onScoreInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:"1"}});await p.save();expect(mocks.saveCoachTrainingContentAssessments.mock.calls[1][2]).toBe(1);expect(mocks.saveCoachTrainingContentAssessments.mock.calls[1][1]).toHaveLength(1);
  });
  it("keeps an old service readable but refuses to save without a revision", async () => {
    mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:undefined});const p=createPageInstance();await p.load("event-training");expect(p.data.state).toBe("ready");p.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"0"}});await p.save();expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();expect(p.data.saveError).toContain("更新小程序");expect(p.data.rows[0].scoreInput).toBe("0");
  });
  it.each([409,428])("retains inputs and the original revision after HTTP %i without an automatic read or retry", async statusCode => {
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"75"}});mocks.saveCoachTrainingContentAssessments.mockRejectedValueOnce({statusCode,details:{revision:99}});await p.save();
    expect(p.data.valuesByProject["project-passing"]["student-1"].scoreInput).toBe("75");expect(p.data.revision).toBe(0);expect(p.data.needsReload).toBe(true);expect(p.data.saveError).toContain(statusCode===409?"其他客户端更新":"更新小程序");await p.save();expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);expect(mocks.getCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);
  });
  it("requires explicit comparison and merges only locally edited fields onto the reviewed server version", async () => {
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"85"}});mocks.saveCoachTrainingContentAssessments.mockRejectedValueOnce({statusCode:409});await p.save();
    mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:4,assessments:[{studentId:"student-1",trainingProjectId:"project-passing",score:95,note:"另一教练备注"},{studentId:"student-3",trainingProjectId:"project-passing",score:80,note:"另一个人"}]});await p.readServerForReview();
    expect(p.data.valuesByProject["project-passing"]["student-1"].scoreInput).toBe("85");expect(p.data.revision).toBe(0);expect(p.data.reviewRows[0]).toMatchObject({local:expect.stringContaining("85"),server:expect.stringContaining("95")});expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);
    p.keepLocalChanges();expect(p.data.revision).toBe(4);expect(p.data.valuesByProject["project-passing"]["student-1"]).toEqual({scoreInput:"85",noteInput:"另一教练备注"});expect(p.data.valuesByProject["project-passing"]["student-3"].scoreInput).toBe("80");expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);
    await p.save();expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenLastCalledWith("event-training",[{studentId:"student-1",trainingProjectId:"project-passing",score:85,note:"另一教练备注"}],4);
  });
  it("keeps local inputs on a failed explicit reread, and uses server values only after the user chooses them", async () => {
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"75"}});mocks.getCoachTrainingContentAssessments.mockRejectedValueOnce(new Error("offline"));await p.readServerForReview();expect(p.data.rows[0].scoreInput).toBe("75");expect(p.data.saveError).toContain("本机输入未改变");
    mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:2});await p.readServerForReview();p.closeReview();expect(p.data.rows[0].scoreInput).toBe("75");await p.readServerForReview();p.useServer();expect(p.data.rows[0].scoreInput).toBe("84");expect(p.data.revision).toBe(2);expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();
  });
  it("retries an unknown outcome with the same rows and revision and blocks edits while it is unknown", async () => {
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:"0"}});mocks.saveCoachTrainingContentAssessments.mockRejectedValueOnce(new Error("lost response"));await p.save();expect(p.data.uncertain).toBe(true);
    p.onScoreInput({currentTarget:{dataset:{studentId:"student-3"}},detail:{value:"99"}});expect(p.data.rows[1].scoreInput).toBe("0");await p.save();expect(mocks.saveCoachTrainingContentAssessments.mock.calls[1]).toEqual(mocks.saveCoachTrainingContentAssessments.mock.calls[0]);expect(mocks.getCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);
  });
  it("restores an unresolved operation for the same account even if a newer server revision now exists", async () => {
    const storage=new Map();wx.getStorageSync=key=>storage.get(key);wx.setStorageSync=(key,value)=>storage.set(key,structuredClone(value));wx.removeStorageSync=key=>storage.delete(key);mocks.requireRole.mockReturnValue({role:"coach",clubId:"club-a",userId:"coach-a"});
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"75"}});mocks.saveCoachTrainingContentAssessments.mockRejectedValueOnce(new Error("response lost"));await p.save();p.onUnload();
    mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:2});const reopened=createPageInstance();await reopened.load("event-training");expect(reopened.data.uncertain).toBe(true);expect(reopened.data.revision).toBe(0);expect(reopened.data.rows[0].scoreInput).toBe("75");await reopened.save();expect(mocks.saveCoachTrainingContentAssessments.mock.calls[1]).toEqual(mocks.saveCoachTrainingContentAssessments.mock.calls[0]);
    mocks.requireRole.mockReturnValue({role:"coach",clubId:"club-a",userId:"coach-b"});const other=createPageInstance();await other.load("event-training");expect(other.data.rows[0].scoreInput).toBe("84");
  });
  it("does not update an unloaded page when an in-flight save completes", async () => {
    const p=createPageInstance();await p.load("event-training");p.onScoreInput({currentTarget:{dataset:{studentId:"student-1"}},detail:{value:"75"}});let resolve;mocks.saveCoachTrainingContentAssessments.mockImplementationOnce(()=>new Promise(r=>resolve=r));const saving=p.save();p.onUnload();const snapshot=structuredClone(p.data);resolve({eventId:"event-training",revision:1,assessments:[]});await saving;expect(p.data).toEqual(snapshot);
  });

});

describe('CAS semantic merge and retained-scope regressions',()=>{
 let storage;
 beforeEach(()=>{
  storage=new Map();wx.getStorageSync=key=>storage.get(key);wx.setStorageSync=(key,value)=>storage.set(key,structuredClone(value));wx.removeStorageSync=key=>storage.delete(key);
  mocks.getCoachWorkbench.mockReset().mockResolvedValue(workbench);
  mocks.getCoachTrainingContentAssessments.mockReset().mockResolvedValue(assessmentScope);
  mocks.saveCoachTrainingContentAssessments.mockReset().mockResolvedValue({eventId:'event-training',revision:1,assessments:[]});
  mocks.requireRole.mockReset().mockReturnValue({role:'coach',clubId:'club-a',userId:'coach-a'});
  mocks.showToast.mockClear();
 });
 const input=(p,studentId,value)=>p.onScoreInput({currentTarget:{dataset:{studentId}},detail:{value}});
 it('preserves newer server fields when local score/note changes are only formatting-equivalent',async()=>{
  const p=createPageInstance();await p.load('event-training');
  input(p,'student-1','084');
  p.onNoteInput({currentTarget:{dataset:{studentId:'student-1'}},detail:{value:' 传球节奏稳定 '}});
  input(p,'student-3','75');
  mocks.saveCoachTrainingContentAssessments.mockRejectedValueOnce({statusCode:409});await p.save();
  expect(mocks.saveCoachTrainingContentAssessments.mock.calls[0][1]).toEqual([{studentId:'student-3',trainingProjectId:'project-passing',score:75,note:''}]);
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:4,assessments:[{studentId:'student-1',trainingProjectId:'project-passing',score:95,note:'另一教练的新备注'}]});
  await p.readServerForReview();p.keepLocalChanges();
  const merged=structuredClone(p.data.valuesByProject['project-passing']['student-1']);
  mocks.saveCoachTrainingContentAssessments.mockResolvedValue({eventId:'event-training',revision:5,assessments:[]});await p.save();
  expect(merged).toEqual({scoreInput:'95',noteInput:'另一教练的新备注'});
  expect(mocks.saveCoachTrainingContentAssessments.mock.calls[1][1]).toEqual([{studentId:'student-3',trainingProjectId:'project-passing',score:75,note:''}]);
 });
 it('retains an unsaved learner draft while that learner temporarily leaves the present-student scope',async()=>{
  const first=createPageInstance();await first.load('event-training');input(first,'student-3','77');first.onUnload();expect(storage.size).toBe(1);
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,presentStudentIds:['student-1']});
  const absent=createPageInstance();await absent.load('event-training');expect(absent.data.rows.map(r=>r.studentId)).toEqual(['student-1']);absent.onUnload();
  mocks.getCoachTrainingContentAssessments.mockResolvedValue(assessmentScope);
  const restored=createPageInstance();await restored.load('event-training');
  expect(restored.data.valuesByProject['project-passing']?.['student-3']?.scoreInput).toBe('77');
 });
 it('does not apply an old save response to a different course loaded on the same controller',async()=>{
  const p=createPageInstance();await p.load('event-training');input(p,'student-1','75');
  let resolve;mocks.saveCoachTrainingContentAssessments.mockImplementationOnce(()=>new Promise(r=>resolve=r));const pending=p.save();
  mocks.getCoachWorkbench.mockResolvedValue({...workbench,event:{...workbench.event,id:'other-course',title:'另一课'}});
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,eventId:'other-course',revision:5,assessments:[{studentId:'student-1',trainingProjectId:'project-passing',score:92}]});
  await p.load('other-course');const snapshot=structuredClone(p.data);const keys=[...storage.keys()];
  resolve({eventId:'event-training',revision:1,assessments:[]});await pending;
  expect(p.data).toEqual(snapshot);expect(p.data.eventId).toBe('other-course');expect(p.data.revision).toBe(5);expect([...storage.keys()]).toEqual(keys);
 });
 it('saves eligible edits without sending or deleting hidden drafts, then requires review on recovery',async()=>{
  const first=createPageInstance();await first.load('event-training');input(first,'student-3','77');first.onUnload();
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,presentStudentIds:['student-1']});
  const limited=createPageInstance();await limited.load('event-training');expect(limited.data.retainedNotice).toContain('暂不可提交');
  input(limited,'student-1','86');await limited.save();limited.onUnload();
  expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenLastCalledWith('event-training',[{studentId:'student-1',trainingProjectId:'project-passing',score:86,note:'传球节奏稳定'}],0);
  const stored=[...storage.values()][0];expect(stored.retainedCells[0]).toMatchObject({studentId:'student-3',value:{scoreInput:'77'},revision:0,scope:{eventId:'event-training',studentIds:['student-1','student-3']}});
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:1,assessments:[...assessmentScope.assessments,{studentId:'student-3',trainingProjectId:'project-passing',score:65,note:'服务器备注'}]});
  const recovered=createPageInstance();await recovered.load('event-training');expect(recovered.data.needsReload).toBe(true);expect(recovered.data.retainedNotice).toContain('已恢复');
  await recovered.save();expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);
  await recovered.readServerForReview();expect(recovered.data.reviewRows.find(row=>row.key==='project-passing/student-3')).toMatchObject({local:'77',server:'65 · 服务器备注'});
  recovered.keepLocalChanges();await recovered.save();expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenLastCalledWith('event-training',[{studentId:'student-3',trainingProjectId:'project-passing',score:77,note:'服务器备注'}],1);
  expect(storage.size).toBe(0);
 });
 it.each(['no-students','no-projects'])('does not erase a draft when the whole scope is unavailable: %s',async kind=>{
  const first=createPageInstance();await first.load('event-training');input(first,'student-3','77');first.onUnload();const original=structuredClone([...storage.values()][0]);
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,...(kind==='no-students'?{presentStudentIds:[]}:{selectedProjectIds:[]})});
  const empty=createPageInstance();await empty.load('event-training');expect(empty.data.state).toBe('empty');expect(empty.data.retainedNotice).toContain('草稿已保留');await empty.save();empty.onHide();empty.onUnload();
  expect([...storage.values()][0]).toEqual(original);expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();
 });
 it.each(['useServer','keepLocalChanges'])('retains newly unavailable edits during explicit review: %s',async choice=>{
  const p=createPageInstance();await p.load('event-training');input(p,'student-3','77');
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:1,presentStudentIds:['student-1']});
  await p.readServerForReview();p[choice]();p.onUnload();
  expect([...storage.values()][0].retainedCells[0]).toMatchObject({studentId:'student-3',value:{scoreInput:'77'},revision:0});
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:1});
  const restored=createPageInstance();await restored.load('event-training');expect(restored.data.valuesByProject['project-passing']['student-3'].scoreInput).toBe('77');expect(restored.data.needsReload).toBe(true);
 });
 it('includes a recovered learner in explicit review when scope returns without reopening',async()=>{
  const first=createPageInstance();await first.load('event-training');input(first,'student-3','77');first.onUnload();
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,presentStudentIds:['student-1']});
  const p=createPageInstance();await p.load('event-training');
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:2});
  await p.readServerForReview();expect(p.data.reviewRows.find(row=>row.key==='project-passing/student-3').local).toBe('77');
  p.keepLocalChanges();expect(p.data.valuesByProject['project-passing']['student-3'].scoreInput).toBe('77');expect(p.data.revision).toBe(2);await p.save();expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenLastCalledWith('event-training',[{studentId:'student-3',trainingProjectId:'project-passing',score:77,note:''}],2);
 });
 it('holds an unknown operation intact while scope is limited and retries the original operation when restored',async()=>{
  const first=createPageInstance();await first.load('event-training');input(first,'student-1','85');input(first,'student-3','77');
  mocks.saveCoachTrainingContentAssessments.mockRejectedValueOnce(new Error('lost response'));await first.save();first.onUnload();const original=mocks.saveCoachTrainingContentAssessments.mock.calls[0];
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:4,presentStudentIds:['student-1']});
  const limited=createPageInstance();await limited.load('event-training');await limited.save();await limited.readServerForReview();limited.keepLocalChanges();await limited.save();limited.onUnload();
  expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledTimes(1);expect([...storage.values()][0].heldOperation.pending).toEqual({eventId:original[0],assessments:original[1],revision:original[2]});
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:5});
  const restored=createPageInstance();await restored.load('event-training');expect(restored.data.uncertain).toBe(true);expect(restored.data.revision).toBe(0);await restored.save();expect(mocks.saveCoachTrainingContentAssessments.mock.calls[1]).toEqual(original);
 });
 it.each([{clubId:'club-a',userId:'coach-b'},{clubId:'club-b',userId:'coach-a'}])('isolates retained drafts from another identity: %j',async identity=>{
  const first=createPageInstance();await first.load('event-training');input(first,'student-3','77');first.onUnload();
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,presentStudentIds:['student-1']});const limited=createPageInstance();await limited.load('event-training');limited.onUnload();
  mocks.requireRole.mockReturnValue({role:'coach',...identity});mocks.getCoachTrainingContentAssessments.mockResolvedValue(assessmentScope);
  const other=createPageInstance();await other.load('event-training');expect(other.data.valuesByProject['project-passing']['student-3']?.scoreInput || '').toBe('');expect(other.data.retainedNotice).toBe('');other.onUnload();expect(storage.size).toBe(1);
 });
 it('keeps a removed project draft and never sends its pairs while saving an allowed project',async()=>{
  const first=createPageInstance();await first.load('event-training');first.selectProject({currentTarget:{dataset:{id:'project-finishing'}}});input(first,'student-3','71');first.onUnload();
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,selectedProjectIds:['project-passing']});
  const limited=createPageInstance();await limited.load('event-training');input(limited,'student-1','86');await limited.save();limited.onUnload();
  expect(mocks.saveCoachTrainingContentAssessments.mock.calls[0][1].every(row=>row.trainingProjectId==='project-passing')).toBe(true);
  mocks.getCoachTrainingContentAssessments.mockResolvedValue({...assessmentScope,revision:1});const restored=createPageInstance();await restored.load('event-training');expect(restored.data.valuesByProject['project-finishing']['student-3'].scoreInput).toBe('71');expect(restored.data.needsReload).toBe(true);
 });

});
