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
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
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

  it("blocks pending attendance, keeps edits after a failed PUT, and submits at most one PUT", async () => {
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
    const lateIndex = page.data.statusOptions.findIndex((option) => option.value === "late");
    page.onStatusChange({ currentTarget: { dataset: { index: 0 } }, detail: { value: String(lateIndex) } });
    page.onNoteInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: "Updated traffic" } });

    const first = page.saveAttendance();
    const second = page.saveAttendance();
    expect(mocks.saveCoachAttendance).toHaveBeenCalledTimes(1);
    expect(mocks.saveCoachAttendance).toHaveBeenCalledWith("event-1", expect.arrayContaining([
      expect.objectContaining({ studentId: "student-late", status: "late", note: "Updated traffic" }),
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

  it("uses correction mode to revise the real roster without inventing a parent dispute", async () => {
    mocks.getCoachWorkbench.mockResolvedValue(workbench);
    mocks.saveCoachAttendance.mockRejectedValueOnce(Object.assign(new Error("forbidden"), { status: 403 }));
    const page = createPageInstance();

    await page.onLoad({ id: "event-1", mode: "correction" });
    expect(page.data).toMatchObject({
      correctionMode: true,
      roster: [
        { studentId: "student-late", status: "late" },
        { studentId: "student-leave", status: "leave_requested" },
        { studentId: "student-excused", status: "excused" },
      ],
    });

    await page.saveAttendance();
    expect(mocks.saveCoachAttendance).toHaveBeenCalledWith("event-1", expect.arrayContaining([
      expect.objectContaining({ studentId: "student-late", status: "late" }),
      expect.objectContaining({ studentId: "student-leave", status: "leave_requested" }),
      expect.objectContaining({ studentId: "student-excused", status: "excused" }),
    ]));
    expect(page.data).toMatchObject({ saving: false, hasSaveError: true });
    expect(globalThis.wx.redirectTo).not.toHaveBeenCalled();
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
    expect(template).toContain('loading="{{saving}}"');
    expect(template).not.toContain("技术专项训练");
    expect(template).not.toContain("U10精英队");
    expect(template).not.toContain("陈小宇");
    expect(template).not.toContain("林一诺");
    expect(template).not.toContain("共 20 名学员");
    expect(template).toContain("请核对当前名单中的出勤状态和备注，再重新提交。");
    expect(template).not.toContain("异常");
    expect(template).not.toContain("家长异议");
    expect(controller).not.toContain("disputedCount");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("keeps C4 submit clear of the system menu without adding vertical header padding", () => {
    expect(controller).toContain("resolveMenuInset");
    expect(template).toContain('padding-right:{{menuInset}}px');
    expect(stylesheet).toMatch(/\.c4-nav\s*\{[^}]*padding:\s*0\s+44rpx/s);
    expect(stylesheet).toMatch(/\.c4-nav\s*\{[^}]*box-sizing:\s*border-box/s);
  });
});
