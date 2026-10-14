import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTrainingTemplates: vi.fn(), saveTrainingTemplate: vi.fn(), previewTrainingTransfer: vi.fn(), applyTrainingTransfer: vi.fn(),
  getCoachWorkbench: vi.fn(), getCoachAssessmentTasks: vi.fn().mockResolvedValue([]),
  saveCoachAttendance: vi.fn(),
  correctTrainingRecord: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getTrainingTemplates: mocks.getTrainingTemplates, saveTrainingTemplate: mocks.saveTrainingTemplate, previewTrainingTransfer: mocks.previewTrainingTransfer, applyTrainingTransfer: mocks.applyTrainingTransfer,
  getCoachWorkbench: mocks.getCoachWorkbench, getCoachAssessmentTasks: mocks.getCoachAssessmentTasks,
  saveCoachAttendance: mocks.saveCoachAttendance,
}));
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
        { studentId: "student-1", name: "Athlete One", statusLabel: "未到" },
        { studentId: "student-2", name: "Athlete Two", statusLabel: "未到" },
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

  it("uses the shared fact instead of participant status, only mutates the tapped student, and waits for success", async () => {
    const record = { studentId: "student-1", eventId: "event-training-1", revision: 2, counted: false };
    mocks.getCoachWorkbench.mockResolvedValue({ ...trainingWorkbench, trainingRecords: [record], roster: [{ studentId: "student-1", name: "甲", status: "present" }, { studentId: "student-2", name: "乙", status: "confirmed" }] });
    const page = createPageInstance(); await page.load("event-training-1");
    expect(page.data.rosterRows[0].present).toBe(false);
    let resolve; mocks.correctTrainingRecord.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const saving = page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(page.data.rosterRows[0].present).toBe(false);
    resolve({ record: { ...record, revision: 3, counted: true } }); await saving;
    expect(mocks.correctTrainingRecord).toHaveBeenLastCalledWith("student-1", "event-training-1", { expectedRevision: 2, counted: true, reason: "教练快捷更正为已出勤" });
    expect(mocks.saveCoachAttendance).not.toHaveBeenCalled();
    expect(page.data.rosterRows.map(row => row.present)).toEqual([true, false]);
  });
  it("keeps a pending course-task read alive while saving one training fact", async () => {
    let resolveTasks;
    mocks.getCoachAssessmentTasks.mockImplementationOnce(() => new Promise(resolve => { resolveTasks = resolve; }));
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance(); await page.load("event-training-1");
    mocks.correctTrainingRecord.mockResolvedValueOnce({ record: { studentId: page.data.rosterRows[0].studentId, eventId: "event-training-1", revision: 1, counted: true } });
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    resolveTasks([{ id: "t1", sourceEventId: "event-training-1", title: "本课测评", templateId: "tpl", completedStudents: 0, totalStudents: 2 }]);
    await Promise.resolve();
    expect(page.data.courseTasks.map(task => task.id)).toEqual(["t1"]);
    expect(page.data.courseTaskMessage).toBe("");
  });
  it("blocks blind retries after a conflict or unknown result and refreshes the server fact", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance(); await page.load("event-training-1");
    mocks.correctTrainingRecord.mockReset().mockRejectedValueOnce({ code: "training_record_conflict" });
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(page.data.attendanceNeedsRefresh).toBe(true);
    expect(page.data.attendancePresent).toBe(0);
    await page.toggleAttendance({ currentTarget: { dataset: { index: "0" } } });
    expect(mocks.correctTrainingRecord).toHaveBeenCalledTimes(1);
    await page.load("event-training-1"); expect(page.data.attendanceNeedsRefresh).toBe(false);
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
    expect(template).toContain('wx:if="{{hasRoster}}"');
    expect(template).toContain('wx:if="{{hasActionCards && !isTraining}}"');
    expect(template).toContain('bindtap="openAction"');
    expect(template).not.toContain('bindtap="finishEvent"');
    expect(template).not.toContain("结束训练");
    expect(template).toContain("{{eventView.timeLabel}}");
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("uses approved C03 compact course information and a fixed change action", () => {
    expect(template).toContain('class="course-info workbench-card"');
    expect(template).toContain("{{eventView.title}}");
    expect(template).toContain("{{eventView.timeLabel}}");
    expect(template).toContain("变更本次训练");
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

  it("matches the live Figma C2 top navigation geometry", () => {
    expect(template).toContain('class="c2-nav__back" src="/assets/icons/chevron-left.svg"');
    expect(template).toContain('style="padding-top:{{navInset}}px;padding-right:{{menuInset}}px"');
    expect(stylesheet).toMatch(/\.c2-nav__left\s*\{[^}]*gap:\s*0/s);
    expect(stylesheet).toMatch(/\.c2-nav__back\s*\{[^}]*width:\s*48rpx[^}]*height:\s*48rpx/s);
    expect(stylesheet).toMatch(/\.c2-nav__title\s*\{[^}]*font-size:\s*36rpx[^}]*line-height:\s*44rpx/s);
    expect(stylesheet).not.toContain(".c2-nav__finish");
    expect(stylesheet).not.toContain(".progress-row");
    expect(stylesheet).toMatch(/\.c2-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
  });

  it("keeps the live Figma C2 course-context label on the right side of the top navigation", () => {
    expect(template).toContain('class="c2-nav__today"');
    expect(template).toContain('>本次课程</view>');
    expect(stylesheet).toMatch(/\.c2-nav__today\s*\{[^}]*color:\s*#a80f1b[^}]*font-size:\s*24rpx/s);
  });
});
