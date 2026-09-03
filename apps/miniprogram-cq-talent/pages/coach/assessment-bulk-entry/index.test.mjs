import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();
const mocks = vi.hoisted(() => ({
  getAssessmentForm: vi.fn(),
  getCoachAssessmentTasks: vi.fn(),
  getCoachTeam: vi.fn(),
  getCoachAssessmentEntries: vi.fn(),
  submitCoachAssessment: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getAssessmentForm: mocks.getAssessmentForm,
  getCoachAssessmentTasks: mocks.getCoachAssessmentTasks,
  getCoachTeam: mocks.getCoachTeam,
  getCoachAssessmentEntries: mocks.getCoachAssessmentEntries,
  submitCoachAssessment: mocks.submitCoachAssessment,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 0, resolveNavInset: () => 0 }));

globalThis.wx = {
  navigateBack: vi.fn(),
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  showToast: mocks.showToast,
};
let pageDefinition;
globalThis.Page = (definition) => { pageDefinition = definition; return definition; };

await import("./index.ts");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

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

describe("C12.1 team batch assessment entry", () => {
  beforeEach(() => {
    storage.clear();
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.getCoachAssessmentTasks.mockReset().mockResolvedValue([task]);
    mocks.getAssessmentForm.mockReset().mockResolvedValue({
      templateId: "template-real", templateName: "体能综合测评", versionName: "v1", templateVersionId: "version-real", pending: [],
      fields: [{ id: "speed", testItemId: "item-speed", metricId: "metric-speed", groupId: "fitness", groupLabel: "速度耐力", label: "30米冲刺", valueKind: "duration_seconds", inputType: "number", required: true, unit: "秒" }],
    });
    mocks.getCoachTeam.mockReset().mockResolvedValue({
      team: { id: "team-real", name: "U10发展队", season: "2026" }, stats: { memberCount: 2, trainingCount: 0, completedTrainingCount: 0, attendanceRate: null },
      members: [{ id: "student-1", name: "罗志炫" }, { id: "student-2", name: "骆啸宇" }],
    });
    mocks.getCoachAssessmentEntries.mockReset().mockResolvedValue({ savedValuesByStudent: {} });
    mocks.submitCoachAssessment.mockReset().mockResolvedValue({ assessment: { id: "saved" } });
    mocks.openPage.mockReset();
    mocks.showToast.mockReset();
  });

  it("loads every real team member and keeps the draft scoped to task plus project", async () => {
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", projectTitle: "30米冲刺录入", teamName: "U10发展队", filledLabel: "已填写 0 人 · 未填写 2 人" });
    expect(page.data.rows).toHaveLength(2);
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.92" } });
    expect(page.data.rows[0]).toMatchObject({ studentId: "student-1", rawInputValue: "4.92", scoreLabel: "待提交" });
    expect(storage.has("coach-assessment-bulk:task-real:fitness")).toBe(true);
  });

  it("submits each filled student through the real assessment contract and keeps saved values visible", async () => {
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.92" } });
    await page.saveProject();

    expect(mocks.submitCoachAssessment).toHaveBeenCalledWith(expect.objectContaining({ studentId: "student-1", assessmentTaskId: "task-real", templateId: "template-real", rawResults: [expect.objectContaining({ testItemId: "item-speed" })] }));
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
    expect(page.data.rows[0]).toMatchObject({ studentId: "student-1", rawInputValue: "4.92", statusLabel: "已保存" });
    expect(page.data.filledLabel).toBe("已填写 1 人 · 未填写 1 人");
    expect(storage.has("coach-assessment-bulk:task-real:fitness")).toBe(false);
    await page.saveProject();
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
  });

  it("hydrates saved server values when the project is opened again", async () => {
    mocks.getCoachAssessmentEntries.mockResolvedValueOnce({
      savedValuesByStudent: { "student-1": { "item-speed": { kind: "duration_seconds", seconds: 4.92 } } },
    });
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });

    expect(page.data.rows[0]).toMatchObject({ studentId: "student-1", rawInputValue: "4.92", statusLabel: "已保存" });
    expect(page.data.lastSavedLabel).toBe("已恢复已保存成绩");
  });

  it("keeps a completed task readable while preventing further score edits", async () => {
    mocks.getCoachAssessmentTasks.mockResolvedValueOnce([{ ...task, status: "completed", completedStudents: 2 }]);
    mocks.getCoachAssessmentEntries.mockResolvedValueOnce({
      savedValuesByStudent: {
        "student-1": { "item-speed": { kind: "duration_seconds", seconds: 4.92 } },
        "student-2": { "item-speed": { kind: "duration_seconds", seconds: 5.14 } },
      },
    });
    const page = createPageInstance();
    await page.onLoad({ taskId: "task-real", templateId: "template-real", projectId: "fitness", title: "体能综合测评" });

    expect(page.data).toMatchObject({ state: "ready", readOnly: true, lastSavedLabel: "已恢复已保存成绩" });
    expect(page.data.rows.map((row) => row.statusLabel)).toEqual(["已保存", "已保存"]);
    page.onRawInput({ currentTarget: { dataset: { studentId: "student-1", fieldId: "speed" } }, detail: { value: "4.50" } });
    await page.saveProject();
    expect(page.data.rows[0]).toMatchObject({ rawInputValue: "4.92", statusLabel: "已保存" });
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
    expect(template).toContain('disabled="{{readOnly}}"');
  });

  it("keeps save and next actions in a full-screen WXML page without array methods", () => {
    expect(template).toContain('bindtap="saveProject"');
    expect(template).toContain('bindtap="nextProject"');
    expect(template).toContain("草稿按任务 + 项目保存，切换项目不丢失");
    expect(template).toContain('>{{projectTitle}}</view>');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });

  it("keeps V7 save before next and removes the extra top-right action", () => {
    expect(template).not.toContain("保存草稿");
    expect(template.indexOf('bindtap="saveProject"')).toBeLessThan(template.indexOf('bindtap="nextProject"'));
  });

  it("uses the V7 compact project summary and one-line student entry rows", () => {
    expect(template).toContain('class="bulk-context-line"');
    expect(template).toContain('class="bulk-summary"');
    expect(template).toContain("保存后同步标准分");
    expect(template).toContain('class="bulk-row__identity"');
    expect(template).toContain('class="bulk-row__metrics"');
    expect(template).not.toContain('class="bulk-row__head"');
    expect(template).not.toContain('class="bulk-hint"');
    expect(stylesheet).toMatch(/\.bulk-row\s*\{[^}]*display:\s*flex[^}]*align-items:\s*center/s);
    expect(stylesheet).toMatch(/\.bulk-metric\s*\{[^}]*display:\s*flex[^}]*border-bottom:/s);
  });
});
