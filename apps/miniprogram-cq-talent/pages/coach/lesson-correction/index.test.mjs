import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  correctCoachLesson: vi.fn(),
  getCoachLessonConfirmation: vi.fn(),
  getCoachWorkbench: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  correctCoachLesson: mocks.correctCoachLesson,
  getCoachLessonConfirmation: mocks.getCoachLessonConfirmation,
  getCoachWorkbench: mocks.getCoachWorkbench,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));

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
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

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
    status: "scheduled",
  },
  roster: [
    { studentId: "student-1", name: "Athlete One", status: "present" },
    { studentId: "student-2", name: "Athlete Two", status: "late" },
    { studentId: "student-workbench-only", name: "Not in confirmation", status: "present" },
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
    { studentId: "student-1", name: "Different name", status: "present" },
    { studentId: "student-2", name: "Another name", status: "late" },
    { studentId: "student-confirmation-only", name: "Not in workbench", status: "present" },
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

function setDelta(page, studentId, direction) {
  page.adjustDelta({ currentTarget: { dataset: { studentId, direction } } });
}

describe("coach lesson correction", () => {
  beforeEach(() => {
    mocks.correctCoachLesson.mockReset().mockResolvedValue({ ledger: {} });
    mocks.getCoachLessonConfirmation.mockReset();
    mocks.getCoachWorkbench.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("does not load without an event ID and hides all corrections when either read fails", async () => {
    const missing = createPageInstance();
    await missing.onLoad({});
    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();
    expect(mocks.getCoachLessonConfirmation).not.toHaveBeenCalled();
    expect(missing.data).toMatchObject({ state: "empty", canSubmit: false, rows: [] });

    mocks.getCoachWorkbench.mockRejectedValue(new Error("raw backend detail"));
    mocks.getCoachLessonConfirmation.mockResolvedValue(confirmation);
    const failed = createPageInstance();
    await failed.onLoad({ id: "event-1" });
    expect(failed.data).toMatchObject({ state: "error", canSubmit: false, rows: [] });
    expect(failed.data.message).not.toContain("raw backend detail");
  });

  it("renders only the truthful dual-read intersection and fixed half-lesson edits", async () => {
    const page = await loadReadyPage();
    expect(page.data.rows).toEqual([
      expect.objectContaining({ studentId: "student-1", name: "Athlete One", balanceText: "剩余 7 课时", delta: 0 }),
      expect.objectContaining({ studentId: "student-2", name: "Athlete Two", balanceText: "剩余 5 课时", delta: 0 }),
    ]);

    setDelta(page, "student-1", 1);
    setDelta(page, "student-1", 1);
    setDelta(page, "student-2", -1);
    expect(page.data.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-1", delta: 0.5, deltaLabel: "+0.5" }),
      expect.objectContaining({ studentId: "student-2", delta: -0.5, deltaLabel: "-0.5" }),
    ]));
  });

  it("blocks zero selection and keeps a failed row's operation key for an explicit retry", async () => {
    const zero = await loadReadyPage();
    await zero.submit();
    expect(mocks.correctCoachLesson).not.toHaveBeenCalled();
    expect(zero.data).toMatchObject({ hasSubmitError: true, canSubmit: false });

    mocks.correctCoachLesson.mockRejectedValue({ code: "network_error" });
    const page = await loadReadyPage();
    setDelta(page, "student-1", 1);
    await page.submit();
    const firstKey = mocks.correctCoachLesson.mock.calls[0][4];
    expect(page.data).toMatchObject({ state: "ready", submitting: false, hasSubmitError: true });
    expect(globalThis.wx.navigateBack).not.toHaveBeenCalled();

    mocks.correctCoachLesson.mockRejectedValue({ code: "network_error" });
    await page.submit();
    expect(mocks.correctCoachLesson.mock.calls[1][4]).toBe(firstKey);
  });

  it("saves serially, stops after a partial failure, rereads, and only returns after full success", async () => {
    const page = await loadReadyPage();
    setDelta(page, "student-1", 1);
    setDelta(page, "student-2", -1);
    mocks.correctCoachLesson
      .mockResolvedValueOnce({ ledger: {} })
      .mockRejectedValueOnce({ code: "bad_request" });

    await page.submit();
    expect(mocks.correctCoachLesson).toHaveBeenCalledTimes(2);
    expect(mocks.correctCoachLesson.mock.calls[0][1]).toBe("student-1");
    expect(mocks.correctCoachLesson.mock.calls[1][1]).toBe("student-2");
    expect(mocks.getCoachWorkbench).toHaveBeenCalledTimes(2);
    expect(mocks.getCoachLessonConfirmation).toHaveBeenCalledTimes(2);
    expect(page.data).toMatchObject({ state: "ready", hasSubmitError: true, submitting: false });
    expect(globalThis.wx.navigateBack).not.toHaveBeenCalled();

    mocks.correctCoachLesson.mockReset().mockResolvedValue({ ledger: {} });
    await page.submit();
    expect(globalThis.wx.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("uses safe precomputed template data without a fabricated anomaly source or Figma samples", () => {
    expect(template).toContain('<app-header theme="soft" title="课时更正" title-align="left" show-back />');
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(template).not.toContain("系统差异");
    expect(template).toContain("课时记录需要更正");
    expect(template).not.toContain("课时记录异常");
    expect(template).not.toContain("陈小宇");
    expect(template).not.toContain("王一涵");
    expect(template).not.toContain("1.5");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("error.message");
  });

  it("uses the C5.1 Figma soft header and fixed correction action above the coach tab bar", () => {
    const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(template).toContain('<app-header theme="soft" title="课时更正" title-align="left" show-back />');
    expect(template).toContain('<status-view wx:if="{{state !== \'ready\' && state !== \'idle\'}}"');
    expect(template).toContain('class="lesson-correction-submit"');
    expect(styles).toContain("bottom: 140rpx");
    expect(styles).toMatch(/\.lesson-correction-submit__button\s*\{[^}]*height:\s*104rpx/s);
    expect(styles).not.toMatch(/\.lesson-correction-submit\s*\{[^}]*box-shadow/s);
  });

  it("renders Figma-like compact correction rows from precomputed real student identity fields", () => {
    const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
    expect(template).toContain('class="student-row__avatar"');
    expect(template).toContain('{{item.avatarLetter}}');
    expect(template).toContain('background: {{item.avatarColor}}');
    expect(template).toContain('class="student-row__adjustment"');
    expect(template).toContain('class="student-row__adjustment-arrow student-row__adjustment-arrow--up"');
    expect(template).toContain('class="student-row__adjustment-arrow student-row__adjustment-arrow--down"');
    expect(template).toContain("需要更正的学员");
    expect(template).not.toContain('class="reason-card"');
    expect(controller).toContain("avatarColor");
    expect(styles).toMatch(/\.correction-page__body\s*\{[^}]*gap:\s*40rpx/s);
    expect(styles).toMatch(/\.student-row__avatar\s*\{[^}]*width:\s*80rpx/s);
    expect(styles).toMatch(/\.student-row__adjustment\s*\{[^}]*width:\s*160rpx[^}]*height:\s*80rpx/s);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
