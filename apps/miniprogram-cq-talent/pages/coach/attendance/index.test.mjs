import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachWorkbench: vi.fn(),
  saveCoachAttendance: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachWorkbench: mocks.getCoachWorkbench,
  saveCoachAttendance: mocks.saveCoachAttendance,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  activityStatus: (status) => ({ label: status, tone: "info" }),
  formatCalendarDate: (value) => String(value).slice(0, 10),
  formatTimeRange: () => "09:00-10:00",
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = {
  navigateBack: vi.fn(),
  redirectTo: vi.fn(),
  showToast: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

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

const workbench = {
  event: {
    id: "event-1",
    type: "training",
    title: "Ball-control session",
    startsAt: "2026-08-13T09:00:00.000Z",
    endsAt: "2026-08-13T10:00:00.000Z",
    venue: "North field",
    teamName: "U11 Red",
    status: "scheduled",
  },
  roster: [
    { studentId: "student-late", name: "Athlete Late", status: "late", note: "Traffic" },
    { studentId: "student-leave", name: "Athlete Leave", status: "leave_requested", note: "School" },
    { studentId: "student-excused", name: "Athlete Excused", status: "excused" },
  ],
  workflow: [],
  training: [],
  selectedTrainingProjects: [],
  selectedTrainingProjectIds: [],
  match: [],
  pending: [],
};

async function loadReadyPage() {
  mocks.getCoachWorkbench.mockResolvedValue(workbench);
  const page = createPageInstance();
  await page.load("event-1");
  return page;
}

describe("coach attendance", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset();
    mocks.saveCoachAttendance.mockReset().mockResolvedValue({ eventId: "event-1", participants: [] });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.redirectTo.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("maps backend roster statuses without losing late, leave_requested, or excused", async () => {
    const page = await loadReadyPage();

    expect(page.data).toMatchObject({
      state: "ready",
      eventId: "event-1",
      hasRoster: true,
      roster: [
        { studentId: "student-late", status: "late", statusLabel: "迟到", note: "Traffic" },
        { studentId: "student-leave", status: "leave_requested", statusLabel: "请假", note: "School" },
        { studentId: "student-excused", status: "excused", statusLabel: "免扣" },
      ],
    });
    expect(page.data.summary).toMatchObject({ total: 3, present: 1, absent: 2, pendingCount: 0 });
  });

  it("normalizes RSVP statuses and precomputes the real roster footer plus present confirmation", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...workbench,
      roster: [
        { studentId: "student-confirmed", name: "Athlete Confirmed", status: "confirmed" },
        { studentId: "student-invited", name: "Athlete Invited", status: "invited" },
        { studentId: "student-present", name: "Athlete Present", status: "present" },
      ],
    });
    const page = createPageInstance();
    await page.load("event-1");

    expect(page.data).toMatchObject({
      rosterFooter: "共 3 名学员",
      roster: [
        { studentId: "student-confirmed", status: "pending", statusIsPresent: false },
        { studentId: "student-invited", status: "pending", statusIsPresent: false },
        { studentId: "student-present", status: "present", statusIsPresent: true },
      ],
    });
  });

  it("renders a one-tap binary attendance control and treats late as arrived", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...workbench,
      roster: [
        { studentId: "student-late", name: "Athlete Late", status: "late" },
        { studentId: "student-absent", name: "Athlete Absent", status: "absent" },
      ],
    });
    const page = createPageInstance();
    await page.load("event-1");

    expect(page.data.roster).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-late", statusIsPresent: true }),
      expect.objectContaining({ studentId: "student-absent", statusIsPresent: false }),
    ]));
    expect(template).toContain('class="attendance-row" data-index="{{index}}" bindtap="toggleAttendance"');
    expect(template).not.toContain('<picker mode="selector"');
    expect(template).not.toContain("<status-chip");
    expect(template).toContain('class="attendance-confirmation attendance-confirmation--present"');
    expect(stylesheet).toMatch(/\.attendance-confirmation--present\s*\{[^}]*border-radius:\s*50%[^}]*background:\s*#188754/s);

    page.toggleAttendance({ currentTarget: { dataset: { index: 0 } } });
    expect(page.data.roster[0]).toMatchObject({ status: "absent", statusIsPresent: false });
    page.toggleAttendance({ currentTarget: { dataset: { index: 1 } } });
    expect(page.data.roster[1]).toMatchObject({ status: "present", statusIsPresent: true });
  });

  it("blocks pending attendance, keeps binary edits after a failed PUT, and submits at most one PUT", async () => {
    mocks.getCoachWorkbench.mockResolvedValue({
      ...workbench,
      roster: [...workbench.roster, { studentId: "student-pending", name: "Athlete Pending", status: "pending" }],
    });
    const pendingPage = createPageInstance();
    await pendingPage.load("event-1");
    await pendingPage.saveAttendance();
    expect(mocks.saveCoachAttendance).not.toHaveBeenCalled();
    expect(pendingPage.data).toMatchObject({ hasSaveError: true, saving: false });

    let resolveSave;
    mocks.saveCoachAttendance.mockReturnValue(new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const page = await loadReadyPage();
    page.toggleAttendance({ currentTarget: { dataset: { index: 0 } } });
    page.toggleAttendance({ currentTarget: { dataset: { index: 0 } } });
    page.onNoteInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: "Updated traffic" } });

    const first = page.saveAttendance();
    const second = page.saveAttendance();
    expect(mocks.saveCoachAttendance).toHaveBeenCalledTimes(1);
    expect(mocks.saveCoachAttendance).toHaveBeenCalledWith("event-1", expect.arrayContaining([
      expect.objectContaining({ studentId: "student-late", status: "present", note: "Updated traffic" }),
      expect.objectContaining({ studentId: "student-leave", status: "leave_requested" }),
      expect.objectContaining({ studentId: "student-excused", status: "excused" }),
    ]));

    resolveSave({ eventId: "event-1", participants: [] });
    await Promise.all([first, second]);
    expect(globalThis.wx.redirectTo).toHaveBeenCalledWith({ url: "/pages/coach/attendance-success/index?eventId=event-1" });

    mocks.saveCoachAttendance.mockRejectedValueOnce(Object.assign(new Error("forbidden"), { status: 403 }));
    const failedPage = await loadReadyPage();
    failedPage.onNoteInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: "Keep this edit" } });
    await failedPage.saveAttendance();
    expect(failedPage.data).toMatchObject({ saving: false, hasSaveError: true });
    expect(failedPage.data.roster[0]).toMatchObject({ note: "Keep this edit" });
  });

  it("ignores retired correction query aliases and keeps point attendance as the only flow", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(workbench);
    const page = createPageInstance();

    await page.onLoad({ id: "event-1", correction: "1" });
    expect(page.data).not.toHaveProperty("correctionMode");
    expect(page.data).not.toHaveProperty("correctionNote");

    const legacyPage = createPageInstance();
    await legacyPage.onLoad({ id: "event-1", mode: "correction" });
    expect(legacyPage.data).not.toHaveProperty("correctionMode");
    expect(template).not.toContain("出勤记录需要修改");
    expect(template).not.toContain("重新提交");
    expect(template).not.toContain("lesson-state");
    expect(controller).not.toContain("lessonAction");
    expect(controller).not.toContain("onCorrectionNoteInput");
  });

  it("keeps missing IDs, empty rosters, and workbench failures as safe page states", async () => {
    const missingPage = createPageInstance();
    await missingPage.load("");
    expect(missingPage.data).toMatchObject({ state: "empty", message: "缺少活动 ID" });
    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();

    mocks.getCoachWorkbench.mockResolvedValue({ ...workbench, roster: [] });
    const emptyPage = createPageInstance();
    await emptyPage.load("event-empty");
    expect(emptyPage.data).toMatchObject({ state: "empty", hasRoster: false });

    mocks.getCoachWorkbench.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    const failedPage = createPageInstance();
    await failedPage.load("event-missing");
    expect(failedPage.data).toMatchObject({ state: "error", message: "点名名单读取失败，请稍后重试。" });
  });

  it("uses precomputed template fields and excludes Figma sample people, teams, counts, and unsafe expressions", () => {
    expect(template).toContain('wx:for="{{roster}}"');
    expect(template).toContain("hasRoster");
    expect(template).toContain('wx:if="{{hasSaveError}}"');
    expect(template).toContain('<status-view wx:if="{{state !== \'ready\' && state !== \'idle\'}}"');
    expect(template).toContain('class="roster-footer"');
    expect(template).toContain('{{rosterFooter}}');
    expect(template).toContain('wx:if="{{item.statusIsPresent}}"');
    expect(template).toContain("点名即扣课");
    expect(template).not.toContain("技术专项训练");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("陈小宇");
    expect(template).not.toContain("林一诺");
    expect(template).not.toContain("共 20 名学员");
    expect(template).not.toContain("课时更正");
    expect(template).not.toContain("待确认");
    expect(template).not.toContain("家长异议");
    expect(controller).not.toContain("disputedCount");
    expect(controller).not.toContain("correctionMode");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("uses the shared 88px Figma header and coach tab bar without an overlapping submit bar", () => {
    expect(template).toContain('<app-header theme="soft"');
    expect(template).not.toContain('title-align="left" large-title');
    expect(template).toContain('action-text="{{canSave && !saving ? \'提交\' : \'\'}}"');
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(template).not.toContain("<submit-bar");
    expect(template).toContain('style="background: {{item.avatarColor}}"');
    expect(template).not.toContain("correctionMode");
    expect(controller).toContain("function avatarColor");
    expect(template).not.toContain("c4-correction-submit");
  });

  it("does not render the retired parent-dispute or lesson-correction flow", () => {
    expect(template).not.toContain('src="/assets/icons/c4-2-alert-triangle.svg"');
    expect(template).not.toContain("家长对出勤记录提出异议，请核实后重新提交");
    expect(template).not.toContain("重新提交");
  });
});
