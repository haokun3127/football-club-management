import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachLessonConfirmation: vi.fn(),
  getCoachWorkbench: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachLessonConfirmation: mocks.getCoachLessonConfirmation,
  getCoachWorkbench: mocks.getCoachWorkbench,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatCalendarDate: () => "8月21日 周五",
  formatTimeRange: () => "09:00–10:30",
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn() };

await import("./index.ts");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const page = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  page.setData = (patch) => { page.data = { ...page.data, ...patch }; };
  return page;
}

const workbench = {
  event: {
    id: "event-1",
    type: "training",
    title: "真实训练课",
    startsAt: "2026-08-21T09:00:00.000Z",
    endsAt: "2026-08-21T10:30:00.000Z",
    venue: "真实场地",
    teamName: "真实队伍",
    status: "completed",
  },
  roster: [
    { studentId: "student-1", name: "真实学员一", status: "present" },
    { studentId: "student-2", name: "真实学员二", status: "late" },
    { studentId: "student-workbench-only", name: "不应展示", status: "present" },
  ],
  workflow: [],
  training: [{ label: "训练项目", value: "2 项" }],
  selectedTrainingProjects: [
    { id: "project-1", name: "真实训练项目", tags: [], metricIds: [], durationMinutes: 30 },
  ],
  selectedTrainingProjectIds: ["project-1"],
  match: [],
  pending: [],
};

const confirmation = {
  participants: [
    { studentId: "student-1", name: "API 名称一", status: "present" },
    { studentId: "student-2", name: "API 名称二", status: "late" },
    { studentId: "student-confirmation-only", name: "不应展示", status: "present" },
  ],
  ledgers: [
    { studentId: "student-1", balance: 8, sourceIds: ["app-client-lesson-event-1-student-1"] },
    { studentId: "student-2", balance: 7, sourceIds: ["app-client-lesson-event-1-student-2"] },
  ],
  pending: [],
};

describe("coach lesson detail", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset().mockResolvedValue(workbench);
    mocks.getCoachLessonConfirmation.mockReset().mockResolvedValue(confirmation);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    globalThis.wx.navigateBack.mockReset();
  });

  it("renders the real event and only the validated participant intersection", async () => {
    const page = createPageInstance();
    await page.onLoad({ id: "event-1" });

    expect(page.data).toMatchObject({
      state: "ready",
      eventTitle: "训练课 · 销课详情",
      eventTeam: "真实队伍",
      eventVenue: "真实场地",
      rosterCount: 2,
      rows: [
        expect.objectContaining({ studentId: "student-1", name: "真实学员一", lessonLabel: "8课时 · 已确认" }),
        expect.objectContaining({ studentId: "student-2", name: "真实学员二", lessonLabel: "7课时 · 已确认" }),
      ],
      trainingProjects: [expect.objectContaining({ id: "project-1", name: "真实训练项目" })],
    });
    expect(page.data.rows.map((row) => row.studentId)).not.toContain("student-workbench-only");
    expect(page.data.rows.map((row) => row.studentId)).not.toContain("student-confirmation-only");
  });

  it("navigates to correction and preserves safe error behavior", async () => {
    const page = createPageInstance();
    await page.onLoad({ id: "event-1" });
    page.openCorrection();
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/lesson-correction/index?id=event-1");

    mocks.getCoachWorkbench.mockRejectedValueOnce(new Error("raw backend detail"));
    await page.retry();
    expect(page.data).toMatchObject({ state: "error", rows: [], message: "销课详情读取失败，请稍后重试。" });
    expect(page.data.message).not.toContain("raw backend detail");
  });

  it("keeps the detail board full-screen and does not embed Figma sample names", () => {
    expect(template).toContain('<app-header theme="soft" title="销课详情" title-align="left" show-back />');
    expect(template).toContain("出勤与课时");
    expect(template).toContain("查看训练内容");
    expect(template).toContain("更正本次销课");
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(template).not.toContain("陈小宇");
    expect(template).not.toContain("周亦辰");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(styles).toContain("padding: 22rpx 44rpx 0;");
  });
});
