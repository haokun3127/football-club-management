import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTrainingTemplates: vi.fn(), saveTrainingTemplate: vi.fn(), previewTrainingTransfer: vi.fn(), applyTrainingTransfer: vi.fn(),
  getCoachAssessmentTaskOptions: vi.fn(), getCoachAssessmentCourses: vi.fn(),
  getCoachWorkbench: vi.fn(), getCoachAssessmentTasks: vi.fn().mockResolvedValue([]),
  saveCoachAttendance: vi.fn(),
  correctTrainingRecord: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getTrainingTemplates: mocks.getTrainingTemplates, saveTrainingTemplate: mocks.saveTrainingTemplate, previewTrainingTransfer: mocks.previewTrainingTransfer, applyTrainingTransfer: mocks.applyTrainingTransfer,
    getCoachWorkbench: mocks.getCoachWorkbench, getCoachAssessmentTasks: mocks.getCoachAssessmentTasks,
    getCoachAssessmentTaskOptions: mocks.getCoachAssessmentTaskOptions, getCoachAssessmentCourses: mocks.getCoachAssessmentCourses,
    saveCoachAttendance: mocks.saveCoachAttendance,
  };
});
vi.mock("../../../utils/training-records", () => ({ correctTrainingRecord: mocks.correctTrainingRecord }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  activityStatus: (status) => ({ label: status, tone: "info" }),
  activityTypeLabel: (type) => ({ training: "Training", match: "Match" }[type] ?? "Activity"),
  formatCalendarDate: (value) => String(value).slice(0, 10),
  formatShortDate: (value) => String(value).slice(5, 10).replace("-", "月") + "日",
  formatTimeOnly: (value) => String(value).slice(11, 16),
  formatTimeRange: () => "09:00-10:00",
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn(), reLaunch: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data, ...data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

const trainingWorkbench = {
  canEditTraining: true,
  trainingRecords: [],
  event: {
    id: "event-training-1",
    type: "training",
    title: "Ball-control session",
    startsAt: "2026-08-13T09:00:00.000Z",
    endsAt: "2026-08-13T10:00:00.000Z",
    venue: "North field",
    teamName: "U11 Red",
    status: "scheduled",
  },
  roster: [
    { studentId: "student-1", name: "Athlete One", status: "confirmed" },
    { studentId: "student-2", name: "Athlete Two", status: "invited" },
  ],
  workflow: [
    { label: "点名", value: "待完成", status: "pending" },
    { label: "销课", value: "待确认", status: "pending" },
    { label: "记录完善度", value: "待同步" },
  ],
  training: [{ label: "训练项目", value: "1 项" }],
  selectedTrainingProjects: [],
  selectedTrainingProjectIds: ["training-project-1"],
  match: [{ label: "比赛记录", value: "等待比赛" }],
  assessmentTemplateId: "assessment-template-1",
  pending: [],
};

beforeEach(() => {
  mocks.getCoachAssessmentTaskOptions.mockImplementation(async eventId => ({sourceCourse:{id:eventId,teamId:"team-a",date:"2026-08-13"},tasks:(await mocks.getCoachAssessmentTasks({forceRefresh:true})).map(task=>({...task,teamId:task.teamId || "team-a"}))}));
  mocks.getCoachAssessmentCourses.mockReset().mockResolvedValue({courses:[]});
});

describe("reviewed course-copy controls", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockReturnValue({ role: "coach" }); mocks.getTrainingTemplates.mockResolvedValue([]); mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench); });
  it("opens the dedicated C06 route only with planning permission and preserves source identity", async () => {
    const page = createPageInstance({ canEditTraining: true, eventId: "course/a" });
    await page.openTransfer({ currentTarget: { dataset: { mode: "copy" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/content-copy/index?eventId=course%2Fa");
    expect(page.data.transferVisible).toBe(false);
    mocks.openPage.mockClear(); page.data.canEditTraining = false;
    await page.openTransfer({ currentTarget: { dataset: { mode: "copy" } } });
    expect(mocks.openPage).not.toHaveBeenCalled();
  });
  const preview = { source: { title: "原课程", revision: "source-v1", count: 1, configuredMinutes: 7, items: [{ id: "drill", name: "已选内容", configuredMinutes: 7 }], excluded: ["友谊赛"] }, targets: [{ eventId: "target", title: "未来课程", startsAt: "2099-10-01T00:00:00Z", revision: "target-v1", existing: [{ id: "old", name: "目标原内容", configuredMinutes: 10 }] }] };
  it("defaults to skipping existing content, then submits only explicitly chosen targets and the reviewed revisions", async () => {
    mocks.previewTrainingTransfer.mockResolvedValueOnce(preview); mocks.applyTrainingTransfer.mockResolvedValueOnce({ results: [{ eventId: "target", status: "applied" }], excluded: ["友谊赛"] });
    const page = createPageInstance({ canEditTraining: true, eventId: "target" });
    await page.openTransfer({ currentTarget: { dataset: { mode: "templates" } } }); await page.selectTemplate({ currentTarget: { dataset: { id: "template" } } });
    expect(page.data.transferTargets[0]).toMatchObject({ action: "skip", existingLabel: "目标原内容" });
    await page.confirmTransfer(); expect(mocks.applyTrainingTransfer).not.toHaveBeenCalled();
    page.toggleTransferTarget({ currentTarget: { dataset: { id: "target" } } }); await page.confirmTransfer();
    expect(mocks.applyTrainingTransfer).toHaveBeenCalledWith({ sourceTemplateId: "template", sourceRevision: "source-v1", targets: [{ eventId: "target", expectedRevision: "target-v1", action: "replace" }] });
    expect(page.data.transferResults[0].label).toBe("已保存"); expect(page.data.transferPreview).toBeNull();
  });
  it("shows a version conflict without retrying an overwrite and does not open tools without planning permission", async () => {
    const denied = createPageInstance({ canEditTraining: false }); await denied.openTransfer({ currentTarget: { dataset: { mode: "copy" } } }); expect(denied.data.transferVisible).toBe(false);
    mocks.previewTrainingTransfer.mockResolvedValueOnce(preview); mocks.applyTrainingTransfer.mockRejectedValueOnce(new Error("conflict"));
    const page = createPageInstance({ canEditTraining: true, eventId: "target" }); await page.openTransfer({ currentTarget: { dataset: { mode: "templates" } } }); await page.selectTemplate({ currentTarget: { dataset: { id: "template" } } }); page.toggleTransferTarget({ currentTarget: { dataset: { id: "target" } } }); await page.confirmTransfer();
    expect(page.data.transferMessage).toContain("重新预览"); expect(page.data.transferPreview).toBeNull(); expect(page.data.transferBusy).toBe(false);
  });
  it("saves a personal template through its own button and keeps the input on failure", async () => {
    const page = createPageInstance({ canEditTraining: true, eventId: "source", templateTitle: "我的模板" }); mocks.saveTrainingTemplate.mockRejectedValueOnce(new Error("offline"));
    await page.saveTemplate(); expect(page.data.templateTitle).toBe("我的模板"); expect(mocks.saveTrainingTemplate).toHaveBeenCalledWith("source", "我的模板");
  });
});

describe("coach activity workbench", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset();
    mocks.saveCoachAttendance.mockReset().mockResolvedValue({ eventId: "event-training-1", participants: [] });
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.reLaunch.mockReset();
  });

  it("presents real workbench data and exposes only training-content and classroom-assessment entries for a training activity", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance();

    await page.load("event-training-1");

    expect(page.data).toMatchObject({
      state: "ready",
      canWrite: true,
      hasRoster: true,
      rosterCount: 2,
      rosterRows: [
        { studentId: "student-1", name: "Athlete One", statusLabel: "待生成" },
        { studentId: "student-2", name: "Athlete Two", statusLabel: "待生成" },
      ],
      hasWorkflow: false,
      hasTraining: true,
      hasMatch: false,
      hasAssessmentTemplate: true,
    });
    expect(page.data.actionCards.map((item) => item.id)).toEqual(["training", "training-assessment", "records", "change"]);
    expect(page.data.eventView).toMatchObject({
      title: "Ball-control session",
      typeLabel: "Training",
      hasTeamName: true,
      hasVenue: true,
      sessionMeta: "U11 Red · 08月13日 09:00-10:00",
    });
    expect(page.data).toMatchObject({ attendancePresent: 0, attendanceTotal: 2, joinedNames: "" });
  });

  it("routes training roster actions to explicit corrections without mutating facts", async () => {
    const record = { studentId: "student-1", eventId: "event-training-1", revision: 2, counted: false };
    mocks.getCoachWorkbench.mockResolvedValue({ ...trainingWorkbench, trainingRecords: [record] });
    const page = createPageInstance(); await page.load("event-training-1");
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(mocks.openPage).toHaveBeenLastCalledWith("/pages/coach/lesson/index?id=event-training-1&studentId=student-1");
    expect(mocks.correctTrainingRecord).not.toHaveBeenCalled();
    expect(mocks.saveCoachAttendance).not.toHaveBeenCalled();
    expect(page.data.rosterRows[0].record).toEqual(record);
    expect(page.data.exceptionRows.map(row => row.studentId)).toEqual(["student-1"]);
    expect(page.data.pendingRecordCount).toBe(1);
  });
  it("keeps a pending course-task read alive while opening a record", async () => {
    let resolveTasks;
    mocks.getCoachAssessmentTasks.mockImplementationOnce(() => new Promise(resolve => { resolveTasks = resolve; }));
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance(); await page.load("event-training-1");
    mocks.correctTrainingRecord.mockResolvedValueOnce({ record: { studentId: page.data.rosterRows[0].studentId, eventId: "event-training-1", revision: 1, counted: true } });
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    resolveTasks([{ id: "t1", sourceEventId: "event-training-1", title: "本课测评", templateId: "tpl", completedStudents: 0, totalStudents: 2 }]);
    await vi.waitFor(()=>expect(page.data.courseTasks.map(task => task.id)).toEqual(["t1"]),{interval:1});
    expect(page.data.courseTaskMessage).toContain("可用任务 1 项");
  });
  it("does not navigate to records outside the authorized roster", async () => {
    const page = createPageInstance(); await page.load("event-training-1");
    page.openRecord({ currentTarget: { dataset: { id: "other-child" } } });
    expect(mocks.openPage).not.toHaveBeenCalled();
    expect(mocks.correctTrainingRecord).not.toHaveBeenCalled();
  });
  it("does not enable training writes against an older BFF without shared records", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({ ...trainingWorkbench, trainingRecords: undefined, canEditTraining: undefined });
    mocks.correctTrainingRecord.mockReset();
    const page = createPageInstance(); await page.load("event-training-1");
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(mocks.correctTrainingRecord).not.toHaveBeenCalled();
    expect(page.data.actionCards.map(item => item.id)).not.toContain("training");
  });

  it("keeps the workbench focused on direct attendance rather than workflow or settlement", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance();
    await page.load("event-training-1");

    expect(page.data).toMatchObject({ hasWorkflow: false, workflowRows: [] });
    expect(page.data).not.toHaveProperty("contentProgressRows");
    expect(page.data).not.toHaveProperty("hasContentProgress");
    expect(page.data.actionCards.map((item) => item.id)).not.toContain("lesson");
    expect(template).not.toContain("流程状态");
    expect(template).not.toContain("查看详情");
    expect(template).not.toContain("训练内容进度");
    expect(template).not.toContain("contentProgressRows");
    expect(template).toContain('bindtap="toggleAttendance"');
    expect(template).toContain("{{item.displayName}}");
  });

  it("uses a binary check avatar for attendance and keeps names readable below it", () => {
    expect(template).toContain('<text wx:if="{{item.present}}" class="roster-avatar__check">✓</text>');
    expect(template).toContain('<view wx:else class="roster-avatar__initial">{{item.initial}}</view>');
    expect(template).not.toContain('class="roster-status"');
    expect(stylesheet).toMatch(/\.roster-avatar__check\s*\{[^}]*width:\s*44rpx[^}]*height:\s*44rpx/s);
    expect(stylesheet).toMatch(/\.roster-name\s*\{[^}]*white-space:\s*normal/s);
  });

  it("keeps the workbench free of settlement controls for in-progress events", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...trainingWorkbench,
      event: {
        ...trainingWorkbench.event,
        status: "scheduled",
        startsAt: new Date(Date.now() + 8 * 60 * 60 * 1000 - 10 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 8 * 60 * 60 * 1000 + 42 * 60 * 1000).toISOString(),
      },
      roster: [{ studentId: "student-1", name: "Athlete One", status: "present" }],
    });
    const page = createPageInstance();
    await page.load("event-training-1");

    expect(page.data).toMatchObject({ attendancePresent: 0, attendanceTotal: 1 });
    expect(page.data).not.toHaveProperty("inProgress", true);
    expect(page.data).not.toHaveProperty("countdownText");
  });

  it("keeps missing, forbidden, and empty workbenches honest", async () => {
    const page = createPageInstance();
    await page.load("");
    expect(page.data).toMatchObject({ state: "error", message: "缺少活动 ID" });

    mocks.getCoachWorkbench.mockRejectedValue(Object.assign(new Error("server detail"), { status: 403 }));
    await page.load("event-forbidden");
    expect(page.data).toMatchObject({ state: "error", message: "活动读取失败，请稍后重试" });

    mocks.getCoachWorkbench.mockRejectedValue(Object.assign(new Error("missing detail"), { status: 404 }));
    await page.load("event-missing");
    expect(page.data).toMatchObject({ state: "error", message: "活动读取失败，请稍后重试" });

    mocks.getCoachWorkbench.mockResolvedValue({
      ...trainingWorkbench,
      roster: [],
      workflow: [],
      training: [],
      match: [],
      assessmentTemplateId: undefined,
      selectedTrainingProjectIds: [],
      event: { ...trainingWorkbench.event, type: "other", status: "cancelled" },
    });
    await page.load("event-empty");
    expect(page.data).toMatchObject({
      state: "empty",
      canWrite: false,
      hasRoster: false,
      hasWorkflow: false,
      hasActionCards: false,
    });
  });

  it("disables writes for cancelled activities and keeps every supported entry single-purpose", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...trainingWorkbench,
      event: { ...trainingWorkbench.event, status: "cancelled" },
    });
    const cancelledPage = createPageInstance();
    await cancelledPage.load("event-cancelled");
    expect(cancelledPage.data).toMatchObject({ canWrite: false, actionCards: [{ id: "records", label: "训练记录" }] });
    cancelledPage.openAction({ currentTarget: { dataset: { action: "attendance" } } });
    expect(mocks.openPage).not.toHaveBeenCalled();
    cancelledPage.openAction({ currentTarget: { dataset: { action: "records" } } });
    expect(mocks.openPage).toHaveBeenLastCalledWith("/pages/coach/lesson/index?id=event-cancelled");

    const page = createPageInstance({
      eventId: "event-1",
      canWrite: true,
      assessmentTemplateId: "template-1",
      actionCards: ["attendance", "records", "match", "tactical", "training", "training-assessment", "change"].map((id) => ({ id })),
    });
    const routes = {
      attendance: "/pages/coach/attendance/index?id=event-1",
      records: "/pages/coach/lesson/index?id=event-1",
      match: "/pages/coach/match/index?id=event-1",
      tactical: "/pages/coach/tactical-board/index?eventId=event-1",
      training: "/pages/coach/content-select/index?eventId=event-1",
      "training-assessment": "/pages/coach/training-assessment/index?eventId=event-1",
      change: "/pages/coach/event-change/index?id=event-1",
    };
    Object.entries(routes).forEach(([action, route]) => {
      page.openAction({ currentTarget: { dataset: { action } } });
      expect(mocks.openPage).toHaveBeenLastCalledWith(route);
    });
  });

  it("does not expose training or completed-workflow entries for a match without an assessment template", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...trainingWorkbench,
      event: { ...trainingWorkbench.event, type: "match" },
      workflow: [
        { label: "点名", value: "已完成", status: "ready" },
        { label: "销课", value: "已确认", status: "ready" },
      ],
      assessmentTemplateId: undefined,
    });
    const page = createPageInstance();

    await page.load("event-match-1");

    expect(page.data.actionCards.map((item) => item.id)).toEqual(["match", "tactical", "change"]);
    expect(page.data).toMatchObject({ hasTraining: false, hasMatch: true, hasAssessmentTemplate: false });
  });

  it("uses precomputed template fields and C2 in-progress affordances without unsafe WXML expressions", () => {
    expect(template).toContain('wx:if="{{hasRoster && !isTraining}}"');
    expect(template).toContain('wx:if="{{hasActionCards && !isTraining}}"');
    expect(template).toContain('bindtap="openAction"');
    expect(template).not.toContain('bindtap="finishEvent"');
    expect(template).not.toContain("结束训练");
    expect(template).toContain("{{eventView.timeLabel}}");
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("makes classroom execution the primary action and course changes secondary", () => {
    expect(template).toContain('class="course-info workbench-card"');
    expect(template).toContain("{{eventView.title}}");
    expect(template).toContain("{{eventView.timeLabel}}");
    expect(template).toContain("变更课程");
    expect(template).toContain('bindsubmit="primaryAction"');
    expect(template).toContain('bindtap="openCourseTask"');
    expect(stylesheet).toContain('background:var(--club-page)');
  });

  it("keeps names readable within the attendance grid without truncating identity", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...trainingWorkbench,
      roster: [{ studentId: "student-1", name: "测试学员名字过长", status: "present" }],
    });
    const page = createPageInstance();
    await page.load("event-training-1");

    expect(page.data.rosterRows[0]).toMatchObject({ displayName: "测试学员名字过长" });
    expect(template).toContain("{{item.displayName}}");
  });

  it("uses the coach bottom tabbar (Figma 2026-08-20: tabs moved to page bottom) and neutral icon-led action tiles", () => {
    expect(template).not.toContain('class="c2-route-tabs"');
    expect(template).toContain('<role-tabbar wx:if="{{!isTraining && !transferVisible}}" role="coach" active="schedule" />');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('src="{{item.icon}}"');
    expect(stylesheet).toMatch(/\.action-tile\s*\{[^}]*min-height:\s*200rpx/s);
    expect(stylesheet).not.toContain('.action-tile--primary');
    expect(stylesheet).not.toContain('.action-tile--match');
  });

  it("uses the current Figma glyphs for the training workbench shortcuts", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance();
    await page.load("event-training-1");

    expect(page.data.actionCards).toEqual([
      { id: "training", label: "训练内容", glyph: "✦" },
      { id: "training-assessment", label: "课堂评测", glyph: "◎" },
      { id: "records", label: "训练记录", icon: "/assets/icons/tab-calendar.svg" },
      { id: "change", label: "变更活动", glyph: "↻" },
    ]);
    expect(template).toContain('<view wx:if="{{item.glyph}}" class="action-tile__glyph">{{item.glyph}}</view>');
    expect(stylesheet).toMatch(/\.action-tile__glyph\s*\{[^}]*color:\s*#a80f1b[^}]*font-size:\s*48rpx/s);
  });

  it("places the editable training summary before the secondary action tiles", () => {
    expect(template.indexOf('class="training-card__summary"')).toBeLessThan(template.indexOf('class="action-grid"'));
  });





  it("sends the loaded status snapshot as previousStatus on inline attendance saves for non-training events", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...trainingWorkbench,
      event: { ...trainingWorkbench.event, type: "match" },
      roster: [
        { studentId: "student-1", name: "甲", status: "confirmed" },
        { studentId: "student-2", name: "乙", status: "leave_requested" },
      ],
    });
    const page = createPageInstance();
    await page.load("event-match-1");

    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(mocks.saveCoachAttendance).toHaveBeenCalledWith("event-match-1", [
      expect.objectContaining({ studentId: "student-1", status: "present", previousStatus: "confirmed" }),
      expect.objectContaining({ studentId: "student-2", status: "leave_requested", previousStatus: "leave_requested" }),
    ]);
  });

  it("refreshes the inline roster and names conflicting students after a leave 409 without auto-retrying", async () => {
    const matchWorkbench = { ...trainingWorkbench, event: { ...trainingWorkbench.event, type: "match" } };
    mocks.getCoachWorkbench
      .mockResolvedValueOnce({ ...matchWorkbench, roster: [{ studentId: "student-1", name: "甲", status: "confirmed" }] })
      .mockResolvedValueOnce({ ...matchWorkbench, roster: [{ studentId: "student-1", name: "甲", status: "leave_requested" }] });
    mocks.saveCoachAttendance.mockRejectedValueOnce({ code: "attendance_leave_conflict", errorType: "conflict", statusCode: 409 });
    const page = createPageInstance();
    await page.load("event-match-1");

    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });

    expect(mocks.saveCoachAttendance).toHaveBeenCalledTimes(1);
    expect(mocks.getCoachWorkbench).toHaveBeenCalledTimes(2);
    expect(page.data.rosterRows[0]).toMatchObject({ studentId: "student-1", status: "leave_requested", present: false, initialStatus: "leave_requested" });
    expect(page.data.attendanceError).toContain("甲");
    expect(page.data.attendanceError).toContain("请假");
    expect(page.data).toMatchObject({ attendanceSaving: false, attendanceNeedsRefresh: false });

    // 核对后确认实际到场：基于刷新后的快照显式改回 present（REQ-ATT-001）
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(mocks.saveCoachAttendance).toHaveBeenLastCalledWith("event-match-1", [
      expect.objectContaining({ studentId: "student-1", status: "present", previousStatus: "leave_requested" }),
    ]);
    expect(page.data.attendanceSaving).toBe(false);
  });
});

describe("CQ-10 classroom primary work",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.requireRole.mockReturnValue({role:"coach"});mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);mocks.getCoachAssessmentTasks.mockResolvedValue([]);wx.pageScrollTo=vi.fn();});
  it("ordinary lesson adds no attendance, assessment or performance write",async()=>{
    const p=createPageInstance();await p.load("event-training-1");await p.loadCourseTasks("event-training-1",p._loadRequest);
    expect(p.data.primaryLabel).toBe("查看训练记录");p.primaryAction();expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/lesson/index?id=event-training-1");expect(mocks.saveCoachAttendance).not.toHaveBeenCalled();expect(p.data.preparationExpanded).toBe(false);
  });
  it("uses one task directly and offers explicit selection for multiple tasks",async()=>{
    const p=createPageInstance();await p.load("event-training-1");const task={id:"real-task",title:"本课任务",templateId:"real-template",sourceEventId:"event-training-1",completedStudents:0,totalStudents:40};
    mocks.getCoachAssessmentTasks.mockResolvedValue([task]);await p.loadCourseTasks("event-training-1",p._loadRequest);p.primaryAction();expect(mocks.openPage).toHaveBeenCalledWith(expect.stringContaining("taskId=real-task&templateId=real-template"));
    mocks.getCoachAssessmentTasks.mockResolvedValue([task,{...task,id:"second"}]);await p.loadCourseTasks("event-training-1",p._loadRequest);p.primaryAction();expect(wx.pageScrollTo).toHaveBeenCalledWith(expect.objectContaining({selector:"#course-assessments"}));
  });
  it("task failure preserves classroom and retries locally",async()=>{
    const p=createPageInstance();await p.load("event-training-1");mocks.getCoachAssessmentTasks.mockRejectedValue(new Error("offline"));await p.retryCourseTasks();expect(p.data.state).toBe("ready");expect(p.data.courseTasksState).toBe("error");expect(p.data.rosterRows).toHaveLength(2);
    mocks.getCoachAssessmentTasks.mockResolvedValue([]);await p.retryCourseTasks();expect(p.data.courseTasksState).toBe("ready");
  });
  it("distinguishes collection, review, and already-confirmed tasks without suggesting repeated entry", async () => {
    const p=createPageInstance();await p.load("event-training-1");
    const base={id:"task-a",title:"本课测评",sourceEventId:"event-training-1",templateId:"template-a",status:"in_progress",totalStudents:19,completedStudents:0,workflow:{canEdit:true,totalStudents:19,completedStudents:0,publishedStudents:0,readyStudents:0}};
    mocks.getCoachAssessmentTasks.mockResolvedValue([base]);await p.retryCourseTasks();expect(p.data.primaryLabel).toBe("继续采集测评");
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...base,workflow:{...base.workflow,readyStudents:1,completedStudents:1}}]);await p.retryCourseTasks();expect(p.data.primaryLabel).toBe("核对测评成绩");p.primaryAction();expect(mocks.openPage).toHaveBeenLastCalledWith(expect.stringContaining("&review=1"));
    const done={...base,status:"completed",completedStudents:19,workflow:{...base.workflow,completedStudents:19,publishedStudents:19}};
    mocks.getCoachAssessmentTasks.mockResolvedValue([done]);await p.retryCourseTasks();expect(p.data.courseTasks).toHaveLength(1);expect(p.data.courseTasks[0].actionLabel).toBe("查看已确认测评");expect(p.data.primaryTaskIds).toEqual([]);expect(p.data.primaryLabel).toBe("查看训练记录");p.primaryAction();expect(mocks.openPage).toHaveBeenLastCalledWith("/pages/coach/lesson/index?id=event-training-1");
    p.openCourseTask({currentTarget:{dataset:{id:"task-a"}}});expect(mocks.openPage).toHaveBeenLastCalledWith(expect.stringContaining("taskId=task-a"));expect(mocks.openPage.mock.calls.at(-1)[0]).not.toContain("review=1");
    mocks.getCoachAssessmentTasks.mockResolvedValue([done,{...base,id:"unfinished"}]);await p.retryCourseTasks();expect(p.data.courseTasks).toHaveLength(2);expect(p.data.primaryTaskIds).toEqual(["unfinished"]);p.primaryAction();expect(mocks.openPage).toHaveBeenLastCalledWith(expect.stringContaining("taskId=unfinished"));
  });
  it("keeps read-only, future legacy and completed legacy tasks in the associated list without making them pending", async () => {
    const p=createPageInstance();await p.load("event-training-1");
    const base={id:"readonly",title:"历史任务",sourceEventId:"event-training-1",templateId:"template-a",status:"in_progress",totalStudents:40,completedStudents:0};
    mocks.getCoachAssessmentTasks.mockResolvedValue([{...base,workflow:{canEdit:false,totalStudents:40,completedStudents:0,publishedStudents:0,readyStudents:2}},{...base,id:"future",status:"not_started",startsOn:"2099-01-01"},{...base,id:"legacy-done",status:"completed",completedStudents:40}]);
    await p.retryCourseTasks();expect(p.data.courseTasks).toHaveLength(3);expect(p.data.primaryTaskIds).toEqual([]);expect(p.data.primaryLabel).toBe("查看训练记录");expect(p.data.courseTasks.find(t=>t.id==="future").reason).toContain("2099-01-01");
    mocks.openPage.mockClear();p.openCourseTask({currentTarget:{dataset:{id:"future"}}});expect(mocks.openPage).not.toHaveBeenCalled();p.openCourseTask({currentTarget:{dataset:{id:"legacy-done"}}});expect(mocks.openPage).toHaveBeenCalledWith(expect.stringContaining("taskId=legacy-done"));
  });

  it("lists legal periodic tasks as optional and keeps completed tasks viewable without a forced lesson action", async () => {
    const p=createPageInstance();await p.load("event-training-1");
    const periodic={id:"periodic",teamId:"team-a",title:"周期任务",startsOn:"2026-08-01",dueOn:"2026-08-31",templateId:"template-a",status:"in_progress",completedStudents:0,totalStudents:40,workflow:{canEdit:true,totalStudents:40,completedStudents:0,publishedStudents:0,readyStudents:0}};
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({sourceCourse:{id:"event-training-1",teamId:"team-a",date:"2026-08-13"},tasks:[periodic,{...periodic,id:"done",status:"completed",completedStudents:40,workflow:{...periodic.workflow,completedStudents:40,publishedStudents:40}},{...periodic,id:"wrong-team",teamId:"team-b"},{...periodic,id:"expired",dueOn:"2026-08-12"}]});
    mocks.getCoachAssessmentCourses.mockResolvedValue({courses:[{id:"event-training-1",studentIds:["student-1"]}]});await p.retryCourseTasks();
    expect(p.data.courseTasks.map(task=>task.id)).toEqual(["periodic","done"]);expect(p.data.courseTasks[0].contextLabel).toBe("周期任务 · 按需进入");expect(p.data.primaryTaskIds).toEqual([]);expect(p.data.primaryLabel).toBe("查看训练记录");
    p.openCourseTask({currentTarget:{dataset:{id:"done"}}});expect(mocks.openPage).toHaveBeenLastCalledWith(expect.stringContaining("taskId=done"));expect(mocks.openPage.mock.calls.at(-1)[0]).not.toContain("review=1");
    expect(mocks.getCoachAssessmentCourses.mock.calls.map(call=>call[0])).toEqual(["periodic","done"]);
  });
  it("shows three content items across groups and keeps total duration and all content accessible", async () => {
    const group=(id,n)=>({id,label:id,items:Array.from({length:n},(_,i)=>({id:`${id}-${i}`,name:`${id}内容${i}`,configuredMinutes:10}))});
    mocks.getCoachWorkbench.mockResolvedValue({...trainingWorkbench,contentSummary:{count:8,configuredMinutes:80,groups:[group("first",2),group("second",6)]}});
    const p=createPageInstance();await p.load("event-training-1");
    expect(p.data.contentGroups.flatMap(group=>group.items)).toHaveLength(3);expect(p.data.hiddenContentCount).toBe(5);expect(p.data.contentCount).toBe(8);expect(p.data.contentMinutesLabel).toContain("80 分钟");
    p.toggleContent();expect(p.data.contentGroups.flatMap(group=>group.items)).toHaveLength(8);p.toggleContent();expect(p.data.contentGroups.flatMap(group=>group.items)).toHaveLength(3);
    expect(template).toContain('theme="default" t-class="course-change"');expect(stylesheet).toContain('--td-button-default-color: var(--color-text-secondary)');expect(stylesheet).toContain('min-height:44px');
  });
  it("keeps a later local task retry authoritative over an older pending read", async () => {
    const p=createPageInstance();await p.load("event-training-1");let resolve;
    mocks.getCoachAssessmentTaskOptions.mockImplementationOnce(()=>new Promise(r=>resolve=r)).mockRejectedValueOnce(new Error("newer failed"));
    const earlier=p.retryCourseTasks();await p.retryCourseTasks();expect(p.data.courseTasksState).toBe("error");
    resolve({sourceCourse:{id:"event-training-1",teamId:"team-a",date:"2026-08-13"},tasks:[]});await earlier;expect(p.data.courseTasksState).toBe("error");
  });

  it("keeps a not-yet-started course unavailable for periodic entry when its legal course list is empty", async () => {
    const p=createPageInstance();await p.load("event-training-1");
    const task={id:"periodic",teamId:"team-a",title:"周期任务",startsOn:"2020-01-01",dueOn:"2099-12-31",templateId:"tpl",status:"in_progress",completedStudents:0,totalStudents:19,workflow:{canEdit:true,totalStudents:19,completedStudents:0,publishedStudents:0,readyStudents:0}};
    mocks.getCoachAssessmentTaskOptions.mockResolvedValue({sourceCourse:{id:"event-training-1",teamId:"team-a",date:"2026-10-30",startsAt:"2026-10-30T01:00:00Z"},tasks:[task]});mocks.getCoachAssessmentCourses.mockResolvedValue({courses:[]});await p.retryCourseTasks();
    expect(p.data.courseTasks).toEqual([]);expect(p.data.primaryLabel).toBe("查看训练记录");expect(p.data.courseTaskMessage).toContain("可用于本课录入");expect(mocks.saveCoachAttendance).not.toHaveBeenCalled();
  });

});
