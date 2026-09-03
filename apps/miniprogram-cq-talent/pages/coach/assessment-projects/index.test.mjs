import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAssessmentForm: vi.fn(),
  getCoachAssessmentTasks: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getAssessmentForm: mocks.getAssessmentForm,
  getCoachAssessmentTasks: mocks.getCoachAssessmentTasks,
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
        { id: "speed", testItemId: "item-speed", groupId: "fitness", groupLabel: "速度耐力", label: "30米冲刺", valueKind: "duration_seconds", inputType: "number", required: true },
        { id: "run", testItemId: "item-run", groupId: "fitness", groupLabel: "速度耐力", label: "折返跑", valueKind: "duration_seconds", inputType: "number", required: true },
        { id: "passing", testItemId: "item-passing", groupId: "technical", groupLabel: "球感技术", label: "传接球", valueKind: "count", inputType: "number", required: true },
      ],
    });
    mocks.openPage.mockReset();
  });

  it("groups real assessment fields into selectable projects and opens the selected project", async () => {
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", taskTitle: "体能综合测评", teamContextLabel: "U10发展队 · 2026秋季学期" });
    expect(page.data.projects).toEqual([
      expect.objectContaining({ id: "fitness", title: "速度耐力", itemCountLabel: "2个指标", statusLabel: "待录入" }),
      expect.objectContaining({ id: "technical", title: "球感技术", itemCountLabel: "1个指标", statusLabel: "待录入" }),
    ]);

    page.openProject({ currentTarget: { dataset: { id: "fitness" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/assessment-bulk-entry/index?taskId=task-real&templateId=template-real&projectId=fitness&title=%E4%BD%93%E8%83%BD%E7%BB%BC%E5%90%88%E6%B5%8B%E8%AF%84");
  });

  it("keeps a completed task available for saved-score review", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValueOnce([{ ...task, status: "completed", completedStudents: 2 }]);
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", progressLabel: "2/2名学员已完成" });
    expect(page.data.projects).toHaveLength(2);
  });

  it("keeps the page WXML free of array method calls", () => {
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
