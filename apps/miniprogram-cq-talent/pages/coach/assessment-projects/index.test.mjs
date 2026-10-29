import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAssessmentForm: vi.fn(),
  getCoachAssessmentWorkflow: vi.fn(),
  getCoachAssessmentHistory: vi.fn(),
  publishCoachAssessments: vi.fn(),
  getCoachTrainingProjectTree: vi.fn(),
  getCoachAssessmentTasks: vi.fn(),
  getCoachAssessmentEntries: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getAssessmentForm: mocks.getAssessmentForm,
  getCoachAssessmentWorkflow: mocks.getCoachAssessmentWorkflow,
  getCoachAssessmentHistory: mocks.getCoachAssessmentHistory,
  publishCoachAssessments: mocks.publishCoachAssessments,
  getCoachTrainingProjectTree: mocks.getCoachTrainingProjectTree,
  getCoachAssessmentTasks: mocks.getCoachAssessmentTasks,
  getCoachAssessmentEntries: mocks.getCoachAssessmentEntries,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 0, resolveNavInset: () => 0 }));

globalThis.wx = { navigateBack: vi.fn() };
let pageDefinition;
globalThis.Page = (definition) => { pageDefinition = definition; return definition; };

await import("./index.ts");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

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

describe("C12 assessment project selection", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.getCoachAssessmentTasks.mockReset().mockResolvedValue([task]);
    mocks.getAssessmentForm.mockReset().mockResolvedValue({
      templateId: "template-real", templateName: "体能综合测评", versionName: "v1", templateVersionId: "version-real", pending: [],
      fields: [
        { id: "speed", metricId: "metric-speed-leaf", testItemId: "item-speed", groupId: "fitness", groupLabel: "速度耐力", label: "30米冲刺", valueKind: "duration_seconds", inputType: "number", required: true },
        { id: "run", metricId: "metric-speed-leaf", testItemId: "item-run", groupId: "fitness", groupLabel: "速度耐力", label: "折返跑", valueKind: "duration_seconds", inputType: "number", required: true },
        { id: "passing", metricId: "metric-technical-leaf", testItemId: "item-passing", groupId: "technical", groupLabel: "球感技术", label: "传接球", valueKind: "count", inputType: "number", required: true },
      ],
    });
    mocks.getCoachTrainingProjectTree.mockResolvedValue({
      groups: [], projects: [], pending: [],
      contentTree: {
        viewId: "view-real", viewName: "完整能力模型", nodes: [
          { id: "root-fitness", metricId: "metric-fitness-root", label: "身体素质", level: 1, children: [{ id: "speed", metricId: "metric-speed", label: "速度", level: 2, children: [{ id: "speed-leaf", metricId: "metric-speed-leaf", label: "速度耐力", level: 3, children: [], drills: [] }], drills: [] }], drills: [] },
          { id: "root-technical", metricId: "metric-technical-root", label: "技术能力", level: 1, children: [{ id: "ball", metricId: "metric-ball", label: "球感", level: 2, children: [{ id: "ball-leaf", metricId: "metric-technical-leaf", label: "球感技术", level: 3, children: [], drills: [] }], drills: [] }], drills: [] },
        ],
      },
    });
    mocks.getCoachAssessmentEntries.mockReset().mockImplementation(async (_taskId, projectId) => ({
      savedValuesByStudent: projectId === "item-speed" ? { "student-1": { "item-speed": { seconds: 4.92 } } } : {},
    }));
    mocks.openPage.mockReset();
  });

  it("uses the training-content multi-select flow and opens the first selected project after confirmation", async () => {
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", title: "体能综合测评" });

    expect(page.data).toMatchObject({
      state: "ready",
      taskTitle: "体能综合测评",
      teamContextLabel: "U10发展队 · 2026秋季学期",
      projectProgressLabel: "测评项目 3 项 · 全员录完 0 项",
      taskStatusLabel: "进行中",
    });
    expect(page.data.primaryNodes.map((node) => node.label)).toEqual(["身体素质", "技术能力"]);
    expect(page.data.secondaryNodes.map((node) => node.label)).toEqual(["速度"]);
    expect(page.data.tertiaryGroups.map((group) => group.label)).toEqual(["速度耐力"]);
    expect(page.data.tertiaryGroups[0].cards).toEqual([
      expect.objectContaining({ id: "item-speed", title: "30米冲刺" }),
      expect.objectContaining({ id: "item-run", title: "折返跑" }),
    ]);
    expect(page.data.projects).toEqual([
      expect.objectContaining({ id: "item-speed", title: "30米冲刺", itemCountLabel: "1个指标", statusLabel: "已录 1/2" }),
      expect.objectContaining({ id: "item-run", title: "折返跑", itemCountLabel: "1个指标", statusLabel: "待录入" }),
      expect.objectContaining({ id: "item-passing", title: "传接球", itemCountLabel: "1个指标", statusLabel: "待录入" }),
    ]);

    page.selectPrimary({ currentTarget: { dataset: { id: "root-technical" } } });
    expect(page.data.secondaryNodes.map((node) => node.label)).toEqual(["球感"]);
    expect(page.data.tertiaryGroups.map((group) => group.label)).toEqual(["球感技术"]);
    expect(page.data.tertiaryGroups[0].cards[0]).toEqual(expect.objectContaining({ id: "item-passing", isSelected: false }));

    page.selectPrimary({ currentTarget: { dataset: { id: "root-fitness" } } });
    expect(page.data.secondaryNodes.map((node) => node.label)).toEqual(["速度"]);

    page.toggleProject({ currentTarget: { dataset: { id: "item-speed" } } });
    page.toggleProject({ currentTarget: { dataset: { id: "item-passing" } } });
    expect(page.data).toMatchObject({ selectedIds: ["item-speed", "item-passing"], selectedCount: 2, confirmLabel: "开始录入（2项）" });
    expect(page.data.projects[0]).toEqual(expect.objectContaining({ isSelected: true }));
    expect(page.data.projects[2]).toEqual(expect.objectContaining({ isSelected: true }));
    expect(mocks.openPage).not.toHaveBeenCalled();

    page.confirmSelection();
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/assessment-bulk-entry/index?taskId=task-real&templateId=template-real&projectId=item-speed&projectIds=item-speed%2Citem-passing&title=%E4%BD%93%E8%83%BD%E7%BB%BC%E5%90%88%E6%B5%8B%E8%AF%84");
  });

  it("shows a retryable error instead of zero progress when a project read fails", async () => {
    mocks.getCoachAssessmentEntries.mockRejectedValueOnce(new Error("offline"));
    const page = createPageInstance();
    await page.onLoad({taskId:"task-real",templateId:"template-real"});
    expect(page.data.state).toBe("error");
    expect(page.data.projects).toEqual([]);
    await page.load("task-real", "template-real", "测评");
    expect(page.data.state).toBe("ready");
  });

  it("only exposes the task's selected project even when the template has more fields", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,testItemIds:["item-speed"]}]);
    const page=createPageInstance();await page.onLoad({taskId:"task-real",templateId:"template-real"});
    expect(page.data.projects.map((p)=>p.id)).toEqual(["item-speed"]);
  });

  it("keeps a completed task available for saved-score review", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValueOnce([{ ...task, status: "completed", completedStudents: 2 }]);
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", progressLabel: "2/2名学员已完成", taskStatusLabel: "已完成" });
    expect(page.data.projects).toHaveLength(3);
  });

  it("keeps a real assessment dimension visible when its metric is not in the training tree", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce({
      templateId: "template-real", templateName: "技术能力测评", versionName: "v1", templateVersionId: "version-real", pending: [],
      fields: [
        { id: "finishing", metricId: "metric-finishing", testItemId: "item-finishing", groupId: "dimension-technical", groupLabel: "技术能力", label: "射门终结评分", valueKind: "rating_1_5", inputType: "number", required: true },
      ],
    });
    mocks.getCoachTrainingProjectTree.mockResolvedValueOnce({
      groups: [], projects: [], pending: [],
      contentTree: {
        viewId: "view-real", viewName: "完整能力模型", nodes: [
          { id: "root-empty", metricId: "metric-empty", label: "身体素质", level: 1, children: [{ id: "empty-secondary", metricId: "metric-empty-secondary", label: "速度", level: 2, children: [{ id: "empty-tertiary", metricId: "metric-empty-tertiary", label: "速度耐力", level: 3, children: [], drills: [] }], drills: [] }], drills: [] },
          { id: "root-technical", metricId: "metric-technical-root", label: "技术能力", level: 1, children: [{ id: "technical-secondary", metricId: "metric-technical-secondary", label: "球感", level: 2, children: [{ id: "technical-tertiary", metricId: "metric-technical-tertiary", label: "传接球", level: 3, children: [], drills: [] }], drills: [] }], drills: [] },
        ],
      },
    });

    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", title: "技术能力测评" });

    expect(page.data.primaryNodes.map((node) => node.label)).toEqual(["技术能力"]);
    expect(page.data.secondaryNodes.map((node) => node.label)).toEqual(["测评项目"]);
    expect(page.data.tertiaryGroups.map((group) => group.label)).toEqual(["技术能力"]);
    expect(page.data.tertiaryGroups[0].cards).toEqual([
      expect.objectContaining({ id: "item-finishing", title: "射门终结评分" }),
    ]);
    expect(page.data.primaryNodes.map((node) => node.label)).not.toContain("其他");
  });

  it("keeps the page WXML free of array method calls", () => {
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("keeps task progress and project status in the V7 progress card", () => {
    expect(template).toContain('class="projects-progress__status {{taskStatusClass}}"');
    expect(template).toContain("{{projectProgressLabel}}");
    expect(template).not.toContain('class="projects-context">{{teamContextLabel}}<text wx:if="{{progressLabel}}"');
    expect(template).not.toContain('class="project-card__count"');
    expect(template).toContain("请选择本次需要测评的项目");
    expect(template).toContain('bindtap="toggleProject"');
    expect(template).toContain('bindsubmit="confirmSelection"');
    expect(template).toContain("{{confirmLabel}}");
    expect(template).toContain("{{item.isSelected}}");
    expect(template).toContain("{{item.itemCountLabel}}");
  });

  it("uses the same three-level selection hierarchy as training content", () => {
    expect(template).toContain('class="content-primary-strip"');
    expect(template).toContain('class="content-secondary-rail"');
    expect(template).toContain('class="content-action-grid"');
    expect(template).toContain('bindtap="selectPrimary"');
    expect(template).toContain('bindtap="selectSecondary"');
  });

  it("keeps the tertiary project selection control at the right edge of each card", () => {
    const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(stylesheet).toContain(".content-action-card__select");
    expect(stylesheet).toContain("right: 24rpx;");
  });
  it("keeps a first-entry 19-student, 62-project task focused on selection without an empty publication action",async()=>{
    const fields=Array.from({length:62},(_,i)=>({id:`f-${i}`,testItemId:`item-${i}`,label:`项目${i}`,groupId:"all",valueKind:"score_0_100",inputType:"number",required:true}));
    mocks.getAssessmentForm.mockResolvedValue({templateId:task.templateId,templateVersionId:"v1",fields});mocks.getCoachAssessmentEntries.mockResolvedValue({savedValuesByStudent:{}});
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,totalStudents:19,workflow:{canEdit:true,templateVersionId:"v1",readyStudents:0,publishedStudents:0,totalStudents:19,students:Array.from({length:19},(_,i)=>({studentId:`s-${i}`,revision:0,publishedRevision:null,completedFields:0,totalFields:62,canPublish:false}))}}]);
    const p=createPageInstance();await p.onLoad({taskId:task.id,templateId:task.templateId});expect(p.data.canPublish).toBe(false);expect(p.data.showReviewEntry).toBe(false);expect(p.data.publicationLabel).toContain("先选择项目");expect(p.data.projects).toHaveLength(62);expect(template).toContain('wx:if="{{showReviewEntry}}"');
  });
  it.each([{ready:1,published:0,canEdit:true,expected:true},{ready:0,published:1,canEdit:false,expected:false}])("emphasizes only truly publishable students and keeps existing records reachable: %j",async({ready,published,canEdit,expected})=>{
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,workflow:{canEdit,templateVersionId:"v1",readyStudents:ready,publishedStudents:published,totalStudents:2,students:[{studentId:"a",revision:2,publishedRevision:published?2:null,completedFields:2,totalFields:2,canPublish:ready>0}]}}]);const p=createPageInstance();await p.onLoad({taskId:task.id,templateId:task.templateId});expect(p.data.canPublish).toBe(expected);expect(p.data.showReviewEntry).toBe(true);expect(p.data.reviewEntryLabel).toBe(expected?"核对 1 人的成绩":"查看已保存成绩");
  });
  it("keeps an older confirmation reachable even if no current revision is counted as confirmed",async()=>{
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...task,workflow:{canEdit:false,templateVersionId:"v1",readyStudents:0,publishedStudents:0,totalStudents:2,students:[{studentId:"a",revision:1,publishedRevision:0,completedFields:1,totalFields:2,canPublish:false}]}}]);const p=createPageInstance();await p.onLoad({taskId:task.id,templateId:task.templateId});expect(p.data.canPublish).toBe(false);expect(p.data.showReviewEntry).toBe(true);
  });

});


describe("reviewed per-student publication", () => {
  beforeEach(()=>{
    globalThis.wx.showModal=({success})=>success({confirm:true});
    mocks.publishCoachAssessments.mockReset().mockResolvedValue({results:[{studentId:"a",success:true}]});
    mocks.getCoachAssessmentWorkflow.mockResolvedValue({templateVersionId:"v1",canEdit:true,readyStudents:1,publishedStudents:0,totalStudents:2,students:[{studentId:"a",name:"甲",revision:2,canPublish:true,completedFields:2,totalFields:2},{studentId:"b",name:"乙",revision:0,canPublish:false,completedFields:0,totalFields:2}]});
    mocks.getCoachAssessmentHistory.mockResolvedValue({revision:2,entries:{first:{testItemId:"first",value:{kind:"score_0_100",score:0},occurredAt:"2026-07-01T09:00:00Z",recordedAt:"2026-09-28T06:00:00Z"},second:{testItemId:"second",value:{kind:"score_0_100",score:80},occurredAt:"2026-07-02T09:00:00Z"}}});
    mocks.getAssessmentForm.mockResolvedValue({fields:[{id:"first",testItemId:"first",label:"第一项"},{id:"second",testItemId:"second",label:"第二项"},{id:"missing",label:"未测项目"}]});
  });
  it("shows each course date, separates zero from missing and publishes only the displayed revision",async()=>{
    const page=createPageInstance();page.setData({taskId:task.id,templateId:task.templateId});await page.openReviewList();
    expect(page.data.reviewRows[0]).toMatchObject({value:"0 分",course:"课程：2026-07-01 17:00",recorded:"录入：2026-09-28 14:00"});
    expect(page.data.reviewRows[1].course).toContain("2026-07-02");expect(page.data.reviewRows[2].value).toBe("未测");
    expect(mocks.publishCoachAssessments).not.toHaveBeenCalled();await page.confirmReviewedStudent();
    expect(mocks.publishCoachAssessments).toHaveBeenCalledWith(task.id,[{studentId:"a",expectedRevision:2}]);expect(page.data.reviewCanPublish).toBe(false);
  });
  it("keeps reviewed values on a server conflict and does not publish on cancellation",async()=>{
    const page=createPageInstance();page.setData({taskId:task.id,templateId:task.templateId});await page.openReviewList();
    globalThis.wx.showModal=({success})=>success({confirm:false});await page.confirmReviewedStudent();expect(mocks.publishCoachAssessments).not.toHaveBeenCalled();
    globalThis.wx.showModal=({success})=>success({confirm:true});mocks.publishCoachAssessments.mockResolvedValue({results:[{studentId:"a",success:false,error:{message:"成绩已更新"}}]});
    await page.confirmReviewedStudent();expect(page.data.reviewMessage).toBe("成绩已更新");expect(page.data.reviewRows[0].value).toBe("0 分");expect(page.data.publishing).toBe(false);
  });
});
