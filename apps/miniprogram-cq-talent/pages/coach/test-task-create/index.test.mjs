import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachAssessmentTaskOptions: vi.fn(),
  createCoachAssessmentTask: vi.fn(),
  requireRole: vi.fn(),
  showToast: vi.fn(),
  navigateBack: vi.fn(), redirectTo: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachAssessmentTaskOptions: mocks.getCoachAssessmentTaskOptions,
  createCoachAssessmentTask: mocks.createCoachAssessmentTask,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
  formatShortDate: (value) => value,
  formatTimeRange: (start,end) => `${start}–${end}`,
}));

globalThis.wx = {
  showToast: mocks.showToast,
  navigateBack: mocks.navigateBack, redirectTo:mocks.redirectTo,
};

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance() {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach test-task create", () => {
  beforeEach(() => {
    mocks.getCoachAssessmentTaskOptions.mockReset().mockResolvedValue({
      tasks: [], publicationEnabled:true,sourceCourse:{id:"course-a",title:"训练",teamId:"team-u10-dev",date:"2026-08-21",studentIds:["student-1","student-2"]},
      courseOptions:[{id:"course-a",title:"训练",teamId:"team-u10-dev",date:"2026-08-21"}],
      templates: [{ id: "assessment-template-technical", name: "技术测评模板", testItems:[{id:"item-a",name:"传球"},{id:"item-b",name:"接球"}] }],
      teams: [{ id: "team-u10-dev", name: "U10 发展队",students:[{id:"student-1",name:"张同学"},{id:"student-2",name:"李同学"}] }],
    });
    mocks.createCoachAssessmentTask.mockReset().mockResolvedValue({ id: "task-new" });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.showToast.mockReset();
    mocks.navigateBack.mockReset(); mocks.redirectTo.mockReset();
  });

  it("loads real coach teams and enables submit only with title, team, term, template and valid period", async () => {
    const page = createPageInstance();
    page.onLoad({eventId:"course-a"});
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(page.data.templateNames).toEqual(["技术测评模板"]);
    expect(page.data.teamNames).toEqual(["U10 发展队"]);
    expect(page.data.canSubmit).toBe(false);

    page.onTitleInput({ detail: { value: "月度技术测评" } });
    page.onTermLabelInput({ detail: { value: "2026 秋季学期" } });
    expect(page.data.canSubmit).toBe(true);

    page.onDueDateChange({ detail: { value: "2020-01-01" } });
    expect(page.data.canSubmit).toBe(false);
  });

  it("submits the fixed selection and opens the new task", async () => {
    const page = createPageInstance();
    page.onLoad({eventId:"course-a"});
    await new Promise((resolve) => setTimeout(resolve, 0));

    page.onTitleInput({ detail: { value: "月度技术测评" } });
    page.onTermLabelInput({ detail: { value: "2026 秋季学期" } });
    page.onStartDateChange({ detail: { value: "2026-08-21" } });
    page.onDueDateChange({ detail: { value: "2026-08-31" } });
    await page.submit();

    expect(mocks.createCoachAssessmentTask).toHaveBeenCalledWith({
      sourceEventId:"course-a",studentIds:["student-1","student-2"], testItemIds:["item-a","item-b"],
      title: "月度技术测评",
      templateId: "assessment-template-technical",
      teamId: "team-u10-dev",
      termLabel: "2026 秋季学期",
      startsOn: "2026-08-21",
      dueOn: "2026-08-31",
    },expect.stringMatching(/^assessment-task-/));
    expect(mocks.redirectTo).toHaveBeenCalledWith({url:"/pages/coach/assessment-projects/index?taskId=task-new&templateId=assessment-template-technical"});
  });

  it("keeps the form honest on save failure", async () => {
    mocks.createCoachAssessmentTask.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad({eventId:"course-a"});
    await new Promise((resolve) => setTimeout(resolve, 0));

    page.onTitleInput({ detail: { value: "月度技术测评" } });
    page.onTermLabelInput({ detail: { value: "2026 秋季学期" } });
    await page.submit();

    expect(mocks.navigateBack).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalled();
    expect(page.data.submitting).toBe(false);
  });

  it("keeps course context, restricts its roster, and submits explicit project/student selection", async () => {
    const options=await mocks.getCoachAssessmentTaskOptions();
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({...options,sourceCourse:{id:"course-a",title:"周二训练",teamId:"team-u10-dev",date:"2026-09-22",studentIds:["student-1"]}});
    const page=createPageInstance();page.onLoad({eventId:"course-a"});await new Promise((r)=>setTimeout(r,0));
    expect(mocks.getCoachAssessmentTaskOptions).toHaveBeenLastCalledWith("course-a");
    expect(page.data.students.map((s)=>s.id)).toEqual(["student-1"]);
    expect(page.data).toMatchObject({startsOn:"2026-09-22",dueOn:"2026-09-22"});
    page.onTermLabelInput({detail:{value:"秋季"}});
    page.toggleProject({currentTarget:{dataset:{id:"item-b"}}});
    page.toggleStudent({currentTarget:{dataset:{id:"student-1"}}});expect(page.data.canSubmit).toBe(false);
    page.toggleStudent({currentTarget:{dataset:{id:"student-1"}}});await page.submit();
    expect(mocks.createCoachAssessmentTask).toHaveBeenCalledWith(expect.objectContaining({sourceEventId:"course-a",testItemIds:["item-a"],studentIds:["student-1"]}),expect.any(String));
  });

  it("requires a course when opened independently and offers exact-scope existing tasks without merging", async () => {
    const options=await mocks.getCoachAssessmentTaskOptions();
    mocks.getCoachAssessmentTaskOptions.mockResolvedValueOnce({...options,sourceCourse:undefined});
    const page=createPageInstance();page.onLoad();await new Promise((r)=>setTimeout(r,0));
    page.onTitleInput({detail:{value:"本次测评"}});page.onTermLabelInput({detail:{value:"秋季"}});
    expect(page.data.canSubmit).toBe(false);
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({...options,tasks:[{id:"existing",sourceEventId:"course-a",templateId:"assessment-template-technical",teamId:"team-u10-dev",startsOn:"2026-08-21",dueOn:"2026-08-21",title:"原任务",studentIds:["student-2","student-1"],testItemIds:["item-a","item-b"]}]});
    await page.chooseCourse({detail:{value:"0"}});
    expect(page.data.matchingTasks.map((t)=>t.id)).toEqual(["existing"]);
    page.continueTask({currentTarget:{dataset:{id:"existing"}}});
    expect(mocks.redirectTo).toHaveBeenCalledWith({url:"/pages/coach/assessment-projects/index?taskId=existing&templateId=assessment-template-technical"});
    expect(mocks.createCoachAssessmentTask).not.toHaveBeenCalled();
    page.toggleProject({currentTarget:{dataset:{id:"item-b"}}});
    expect(page.data.matchingTasks).toEqual([]);
  });

  it("renders the form affordances without template JS", () => {
    expect(template).toContain('bindinput="onTitleInput"');
    expect(template).toContain('bindchange="onTemplateChange"');
    expect(template).toContain('bindinput="onTermLabelInput"');
    expect(template).toContain('mode="date"');
    expect(template).toContain('bindtap="primaryAction"');
    expect(template).not.toMatch(/\{\{item\.(?:map|filter|slice|indexOf)/);
  });

  it("lets a course-preselected entry switch courses and never submits the old roster after a failed switch", async () => {
    const options=await mocks.getCoachAssessmentTaskOptions();
    const page=createPageInstance();page.onLoad({eventId:"course-a"});await new Promise((r)=>setTimeout(r,0));
    page.onTermLabelInput({detail:{value:"秋季"}});
    page.setData({courseOptions:[...page.data.courseOptions,{id:"course-b",title:"另一堂训练",date:"2026-08-22",teamId:"team-u10-dev"}]});
    page.openCourses();page.selectCourse({currentTarget:{dataset:{id:"course-b"}}});
    mocks.getCoachAssessmentTaskOptions.mockRejectedValueOnce(new Error("network"));
    await page.applyCourse();
    expect(page.data.sourceEventId).toBe("course-a");expect(page.data.canSubmit).toBe(false);
    await page.primaryAction();expect(mocks.createCoachAssessmentTask).not.toHaveBeenCalled();
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({...options,sourceCourse:{...options.sourceCourse,id:"course-b",date:"2026-08-22",studentIds:["student-2"]}});
    await page.applyCourse();
    expect(page.data).toMatchObject({sourceEventId:"course-b",startsOn:"2026-08-22",dueOn:"2026-08-22",view:"summary",canSubmit:true});
    await page.primaryAction();
    expect(mocks.createCoachAssessmentTask).toHaveBeenCalledWith(expect.objectContaining({sourceEventId:"course-b",studentIds:["student-2"]}),expect.any(String));
  });

  it("retains absence as a hint, preserves hidden selections in search, and cancels scope edits", async () => {
    const options=await mocks.getCoachAssessmentTaskOptions();
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({...options,sourceCourse:{...options.sourceCourse,attendance:[{studentId:"student-2",status:"leave_requested"}]}});
    const page=createPageInstance();await page.load("course-a");page.openScope();
    expect(page.data.attendanceNotes).toEqual(["李同学 · 请假"]);
    expect(page.data.students[1]).toMatchObject({selected:true,attendanceWarning:true});
    page.onStudentSearch({detail:{value:"张"}});
    expect(page.data.visibleStudents.map(s=>s.id)).toEqual(["student-1"]);
    page.toggleStudent({currentTarget:{dataset:{id:"student-1"}}});
    expect(page.data.selectedStudentCount).toBe(1);
    page.goBack();expect(page.data.selectedStudentCount).toBe(2);expect(page.data.view).toBe("summary");
    page.openScope();page.toggleProject({currentTarget:{dataset:{id:"item-b"}}});page.applyScope();
    expect(page.data.selectedProjectCount).toBe(1);expect(page.data.view).toBe("summary");
  });

  it("continues a matching task without creating, and only creates after choosing independent retest", async () => {
    const options=await mocks.getCoachAssessmentTaskOptions();
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({...options,tasks:[{id:"existing",sourceEventId:"course-a",templateId:"assessment-template-technical",teamId:"team-u10-dev",startsOn:"2026-08-21",dueOn:"2026-08-21",title:"原任务",studentIds:["student-1","student-2"],testItemIds:["item-a","item-b"]}]});
    const page=createPageInstance();await page.load("course-a");
    expect(page.data.canSubmit).toBe(false);await page.primaryAction();
    expect(mocks.redirectTo).toHaveBeenCalledWith(expect.objectContaining({url:expect.stringContaining("taskId=existing")}));
    expect(mocks.createCoachAssessmentTask).not.toHaveBeenCalled();
    page.selectTaskMode({currentTarget:{dataset:{mode:"create"}}});await page.primaryAction();
    expect(mocks.createCoachAssessmentTask).not.toHaveBeenCalled();
    page.openSettings();page.onTermLabelInput({detail:{value:"秋季"}});page.applySettings();
    expect(page.data.taskMode).toBe("create");await page.primaryAction();
    expect(mocks.createCoachAssessmentTask).toHaveBeenCalledTimes(1);
  });

  it("cancels task settings without losing the applied name, dates or project choices", async () => {
    const page=createPageInstance();await page.load("course-a");
    page.onTermLabelInput({detail:{value:"秋季"}});page.toggleProject({currentTarget:{dataset:{id:"item-b"}}});
    const title=page.data.title;page.openSettings();page.onTitleInput({detail:{value:"改名"}});page.onDueDateChange({detail:{value:"2020-01-01"}});
    page.applySettings();expect(page.data.view).toBe("settings");page.goBack();
    expect(page.data).toMatchObject({title,dueOn:"2026-08-21",selectedProjectCount:1,canSubmit:true});
  });

  it("ignores a superseded options response and callbacks after leaving", async () => {
    const options=await mocks.getCoachAssessmentTaskOptions();let finishFirst;
    mocks.getCoachAssessmentTaskOptions.mockImplementationOnce(()=>new Promise(resolve=>{finishFirst=resolve;}));
    const page=createPageInstance();const first=page.load("course-a");
    mocks.getCoachAssessmentTaskOptions.mockResolvedValueOnce({...options,sourceCourse:{...options.sourceCourse,id:"course-b",studentIds:["student-2"]}});
    await page.load("course-b");finishFirst(options);await first;
    expect(page.data.sourceEventId).toBe("course-b");expect(page.data.students.map(s=>s.id)).toEqual(["student-2"]);
    let finishLast;mocks.getCoachAssessmentTaskOptions.mockImplementationOnce(()=>new Promise(resolve=>{finishLast=resolve;}));
    const last=page.load("course-a");page.onUnload();finishLast(options);await last;
    expect(page.data.sourceEventId).toBe("course-b");
  });

  it("keeps the title at the Figma top-nav offset", () => {
    expect(styles).toMatch(/\.page-nav__title\s*\{[^}]*margin-left:\s*8rpx;/s);
  });
  it("reuses the creation key after an uncertain response, but starts a new attempt after editing", async () => {
    mocks.createCoachAssessmentTask.mockRejectedValue(new Error("response lost"));
    const page=createPageInstance();await page.load("course-a");page.onTermLabelInput({detail:{value:"秋季"}});
    await page.submit();await page.submit();
    const calls=mocks.createCoachAssessmentTask.mock.calls;
    expect(calls[0][1]).toEqual(calls[1][1]);expect(calls[0][1]).toMatch(/^assessment-task-/);
    page.onTitleInput({detail:{value:"独立复测"}});await page.submit();
    expect(calls[2][1]).not.toEqual(calls[0][1]);
  });
  it("offers temporary course players without selecting them by default", async () => {
    const fixture = await mocks.getCoachAssessmentTaskOptions();
    fixture.sourceCourse.temporaryStudents = [{ id: "temp-1", name: "临时学员" }]; fixture.sourceCourse.studentIds.push("temp-1");
    mocks.getCoachAssessmentTaskOptions.mockResolvedValueOnce(fixture);
    const page = createPageInstance(); await page.load("course-a");
    expect(page.data.students.find(s=>s.id==="temp-1")).toMatchObject({selected:false,name:"临时学员 · 临时"});
    page.toggleStudent({currentTarget:{dataset:{id:"temp-1"}}}); expect(page.data.students.find(s=>s.id==="temp-1").selected).toBe(true);
    page.onTermLabelInput({detail:{value:"秋季"}});await page.submit();expect(mocks.createCoachAssessmentTask.mock.calls[0][0].studentIds).toContain("temp-1");
  });

});
