import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachWorkbench: vi.fn(),
  openPage: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachWorkbench: mocks.getCoachWorkbench }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  activityStatus: (status) => ({ label: status, tone: "info" }),
  activityTypeLabel: (type) => ({ training: "Training", match: "Match" }[type] ?? "Activity"),
  formatCalendarDate: (value) => String(value).slice(0, 10),
  formatTimeRange: () => "09:00-10:00",
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

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

describe("coach activity workbench", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset();
    mocks.openPage.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
  });

  it("presents real workbench data and exposes entries only for the event type, workflow, and assessment template", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(trainingWorkbench);
    const page = createPageInstance();

    await page.load("event-training-1");

    expect(page.data).toMatchObject({
      state: "ready",
      canWrite: true,
      hasRoster: true,
      rosterCount: 2,
      rosterRows: [
        { studentId: "student-1", name: "Athlete One", statusLabel: "已确认" },
        { studentId: "student-2", name: "Athlete Two", statusLabel: "待确认" },
      ],
      hasWorkflow: true,
      hasTraining: true,
      hasMatch: false,
      hasAssessmentTemplate: true,
    });
    expect(page.data.actionCards.map((item) => item.id)).toEqual(["attendance", "lesson", "training", "assessment", "change"]);
    expect(page.data.eventView).toMatchObject({
      title: "Ball-control session",
      typeLabel: "Training",
      hasTeamName: true,
      hasVenue: true,
    });
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
    expect(cancelledPage.data).toMatchObject({ canWrite: false, actionCards: [] });
    cancelledPage.openAction({ currentTarget: { dataset: { action: "attendance" } } });
    expect(mocks.openPage).not.toHaveBeenCalled();

    const page = createPageInstance({
      eventId: "event-1",
      canWrite: true,
      assessmentTemplateId: "template-1",
      actionCards: ["attendance", "lesson", "match", "tactical", "training", "assessment", "change"].map((id) => ({ id })),
    });
    const routes = {
      attendance: "/pages/coach/attendance/index?id=event-1",
      lesson: "/pages/coach/lesson/index?id=event-1",
      match: "/pages/coach/match/index?id=event-1",
      tactical: "/pages/coach/tactical-board/index?eventId=event-1",
      training: "/pages/coach/content-select/index?eventId=event-1",
      assessment: "/pages/coach/test-entry/index?eventId=event-1&templateId=template-1",
      change: "/pages/coach/event-change/index?id=event-1",
    };
    Object.entries(routes).forEach(([action, route]) => {
      page.openAction({ currentTarget: { dataset: { action } } });
      expect(mocks.openPage).toHaveBeenLastCalledWith(route);
    });
  });

  it("does not expose training, assessment, or completed-workflow entries for a match without an assessment template", async () => {
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

  it("uses precomputed template fields and excludes unsupported timer, finish, sample attendance, and unsafe WXML expressions", () => {
    expect(template).toContain('wx:if="{{hasRoster}}"');
    expect(template).toContain('wx:if="{{hasWorkflow}}"');
    expect(template).toContain('wx:if="{{hasActionCards}}"');
    expect(template).toContain('bindtap="openAction"');
    expect(template).not.toContain("finishSession");
    expect(template).not.toContain("elapsed");
    expect(template).not.toContain("结束训练");
    expect(template).not.toContain("18/20");
    expect(template).not.toContain("凤凰山");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
