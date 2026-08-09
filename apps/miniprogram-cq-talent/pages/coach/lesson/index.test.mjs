import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmCoachLesson: vi.fn(),
  getCoachLessonConfirmation: vi.fn(),
  getCoachWorkbench: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  confirmCoachLesson: mocks.confirmCoachLesson,
  getCoachLessonConfirmation: mocks.getCoachLessonConfirmation,
  getCoachWorkbench: mocks.getCoachWorkbench,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  formatCalendarDate: (value) => String(value).slice(0, 10),
  formatTimeRange: () => "09:00-10:00",
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = {
  navigateBack: vi.fn(),
  showToast: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
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

const workbench = {
  event: {
    id: "event-1",
    type: "training",
    title: "Ball-control session",
    startsAt: "2026-08-13T09:00:00.000Z",
    endsAt: "2026-08-13T10:00:00.000Z",
    teamName: "U11 Red",
    status: "scheduled",
  },
  roster: [
    { studentId: "student-1", name: "Athlete One", status: "present" },
    { studentId: "student-2", name: "Athlete Two", status: "late" },
    { studentId: "student-workbench-only", name: "No Ledger", status: "present" },
  ],
  workflow: [],
  training: [],
  selectedTrainingProjects: [],
  selectedTrainingProjectIds: [],
  match: [],
  pending: [],
};

const confirmation = {
  participants: [
    { studentId: "student-1", name: "Different API Name", status: "present" },
    { studentId: "student-2", name: "Another API Name", status: "late" },
    { studentId: "student-confirmation-only", name: "Outside Workbench", status: "present" },
  ],
  ledgers: [
    { studentId: "student-1", remainingLessons: 7 },
    { studentId: "student-2", balance: 5 },
  ],
  pending: [],
};

async function loadReadyPage() {
  mocks.getCoachWorkbench.mockResolvedValue(workbench);
  mocks.getCoachLessonConfirmation.mockResolvedValue(confirmation);
  const page = createPageInstance();
  await page.onLoad({ id: "event-1" });
  return page;
}

describe("coach lesson confirmation", () => {
  beforeEach(() => {
    mocks.confirmCoachLesson.mockReset().mockResolvedValue({ ledgers: [] });
    mocks.getCoachLessonConfirmation.mockReset();
    mocks.getCoachWorkbench.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("does not request either endpoint without an event ID", async () => {
    const page = createPageInstance();
    await page.onLoad({});

    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();
    expect(mocks.getCoachLessonConfirmation).not.toHaveBeenCalled();
    expect(page.data).toMatchObject({ state: "empty", canConfirm: false, roster: [] });
  });

  it("hides confirmation when either read fails", async () => {
    mocks.getCoachWorkbench.mockRejectedValue(new Error("internal backend detail"));
    mocks.getCoachLessonConfirmation.mockResolvedValue(confirmation);
    const workbenchFailure = createPageInstance();
    await workbenchFailure.onLoad({ id: "event-1" });
    expect(workbenchFailure.data).toMatchObject({ state: "error", canConfirm: false, hasRoster: false, message: "课时记录读取失败，请稍后重试。" });

    mocks.getCoachWorkbench.mockResolvedValue(workbench);
    mocks.getCoachLessonConfirmation.mockRejectedValue(Object.assign(new Error("forbidden internals"), { status: 403 }));
    const confirmationFailure = createPageInstance();
    await confirmationFailure.onLoad({ id: "event-1" });
    expect(confirmationFailure.data).toMatchObject({ state: "error", canConfirm: false, hasRoster: false });
  });

  it("renders only the validated participant intersection with real merged ledger balances", async () => {
    const page = await loadReadyPage();

    expect(mocks.getCoachWorkbench).toHaveBeenCalledWith("event-1");
    expect(mocks.getCoachLessonConfirmation).toHaveBeenCalledWith("event-1");
    expect(page.data).toMatchObject({
      state: "ready",
      eventTitle: "Ball-control session",
      eventDate: "2026-08-13",
      rosterCount: 2,
      selectedStudentIds: ["student-1", "student-2"],
      roster: [
        { studentId: "student-1", name: "Athlete One", balanceText: "剩余 7 课时" },
        { studentId: "student-2", name: "Athlete Two", balanceText: "剩余 5 课时" },
      ],
    });
    expect(page.data.roster.map((student) => student.studentId)).not.toContain("student-workbench-only");
    expect(page.data.roster.map((student) => student.studentId)).not.toContain("student-confirmation-only");
  });

  it("blocks an empty selection and keeps a failed POST editable without a success toast", async () => {
    const zeroPage = createPageInstance({ state: "ready", eventId: "event-1", selectedStudentIds: [], canConfirm: false });
    await zeroPage.confirmLesson();
    expect(mocks.confirmCoachLesson).not.toHaveBeenCalled();
    expect(zeroPage.data).toMatchObject({ hasSubmitError: true, submitError: "没有可确认的学员。" });

    mocks.confirmCoachLesson.mockRejectedValueOnce(new Error("raw API details must not surface"));
    const page = await loadReadyPage();
    page.onLessonNoteInput({ detail: { value: "Coach note" } });
    await page.confirmLesson();
    expect(mocks.confirmCoachLesson).toHaveBeenCalledWith("event-1", ["student-1", "student-2"], "Coach note");
    expect(page.data).toMatchObject({ state: "ready", saving: false, hasSubmitError: true, submitError: "课时确认失败，请稍后重试。" });
    expect(page.data.roster).toHaveLength(2);
    expect(globalThis.wx.showToast).not.toHaveBeenCalled();
  });

  it("submits once and rereads the real records after a successful confirmation", async () => {
    let resolveConfirmation;
    mocks.confirmCoachLesson.mockReturnValue(new Promise((resolve) => {
      resolveConfirmation = resolve;
    }));
    const page = await loadReadyPage();

    const first = page.confirmLesson();
    const second = page.confirmLesson();
    expect(mocks.confirmCoachLesson).toHaveBeenCalledTimes(1);

    resolveConfirmation({ ledgers: [] });
    await Promise.all([first, second]);
    expect(mocks.getCoachWorkbench).toHaveBeenCalledTimes(2);
    expect(mocks.getCoachLessonConfirmation).toHaveBeenCalledTimes(2);
    expect(globalThis.wx.showToast).toHaveBeenCalledWith({ title: "课时确认已提交", icon: "success" });
  });

  it("uses a page-owned confirmation bar and contains no inline correction or Figma sample data", () => {
    expect(template).toContain('class="c5-confirm-bar"');
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(styles).toContain("bottom: 140rpx");
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"submit-bar"');
    expect(template).not.toContain("submit-bar");
    expect(template).not.toContain("lesson-correction");
    expect(template).not.toContain("返还");
    expect(template).not.toContain("补扣");
    expect(template).not.toContain("1.5");
    expect(template).not.toContain("技术专项训练");
    expect(template).not.toContain("U10精英队");
    expect(controller).not.toContain("correctCoachLesson");
    expect(controller).not.toContain("correctLesson");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
