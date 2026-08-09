import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const drafts = new Map();
const mocks = vi.hoisted(() => ({
  getCoachWorkbench: vi.fn(),
  getAssessmentForm: vi.fn(),
  submitCoachAssessment: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachWorkbench: mocks.getCoachWorkbench,
  getAssessmentForm: mocks.getAssessmentForm,
  submitCoachAssessment: mocks.submitCoachAssessment,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));
vi.mock("../../../utils/assessment-draft", () => ({
  loadAssessmentDraft: (eventId, versionId) => ({ ...(drafts.get(`${eventId}:${versionId}`) ?? {}) }),
  saveAssessmentDraftEntry: (eventId, versionId, entry) => {
    const key = `${eventId}:${versionId}`;
    const next = { ...(drafts.get(key) ?? {}), [`${entry.studentId}:${entry.testItemId}`]: entry };
    drafts.set(key, next);
    return { ...next };
  },
  clearAssessmentDraftStudents: (eventId, versionId, studentIds) => {
    const key = `${eventId}:${versionId}`;
    const next = { ...(drafts.get(key) ?? {}) };
    for (const entryKey of Object.keys(next)) {
      if (studentIds.some((studentId) => entryKey.startsWith(`${studentId}:`))) delete next[entryKey];
    }
    drafts.set(key, next);
    return { ...next };
  },
  draftProgress: (draft, studentIds, testItemIds) => ({
    completed: Object.values(draft).filter((entry) =>
      studentIds.includes(entry.studentId) && testItemIds.includes(entry.testItemId) && entry.status !== "empty",
    ).length,
    total: studentIds.length * testItemIds.length,
  }),
}));

globalThis.wx = { navigateBack: mocks.navigateBack, showToast: mocks.showToast };

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

const workbench = (event = {}) => ({
  event: {
    id: "event-assessment-1",
    type: "training",
    status: "scheduled",
    title: "Actual assessment event",
    startsAt: "2026-08-10T09:00:00.000Z",
    venue: "Actual venue",
    ...event,
  },
  roster: [
    { studentId: "student-1", name: "Actual student one", status: "confirmed", note: "" },
    { studentId: "student-2", name: "Actual student two", status: "confirmed", note: "" },
  ],
  assessmentTemplateId: "template-current",
  workflow: [],
  training: [],
  selectedTrainingProjects: [],
  selectedTrainingProjectIds: [],
  match: [],
  pending: [],
});

const form = (overrides = {}) => ({
  templateId: "template-current",
  templateVersionId: "template-current-v2",
  templateName: "Actual current assessment",
  versionName: "v2",
  fields: [
    { id: "field-speed", testItemId: "item-speed", metricId: "metric-speed", groupId: "fitness", groupLabel: "Fitness", label: "Actual speed", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
    { id: "field-balance", testItemId: "item-balance", metricId: "metric-balance", groupId: "technique", groupLabel: "Technique", label: "Actual balance", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
  ],
  ...overrides,
});

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach project score entry", () => {
  beforeEach(() => {
    drafts.clear();
    mocks.getCoachWorkbench.mockReset().mockResolvedValue(workbench());
    mocks.getAssessmentForm.mockReset().mockResolvedValue(form());
    mocks.submitCoachAssessment.mockReset().mockResolvedValue({ assessment: { id: "assessment-real" } });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
    mocks.showToast.mockReset();
  });

  it("does not read or write when the coach role or real event ID is missing", async () => {
    const page = createPageInstance();
    mocks.requireRole.mockReturnValue(null);
    await page.onLoad({ eventId: "event-assessment-1" });
    await page.submitAssessment();
    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();

    mocks.requireRole.mockReturnValue({ role: "coach" });
    await page.onLoad({});
    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();
  });

  it("waits for the workbench template before requesting the form and ignores route templates", async () => {
    let resolveWorkbench;
    mocks.getCoachWorkbench.mockImplementationOnce(() => new Promise((resolve) => { resolveWorkbench = resolve; }));
    const page = createPageInstance();
    const loading = page.onLoad({ eventId: "event-assessment-1", templateId: "route-template" });

    expect(mocks.getCoachWorkbench).toHaveBeenCalledWith("event-assessment-1");
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();
    resolveWorkbench(workbench());
    await loading;
    expect(mocks.getAssessmentForm).toHaveBeenCalledWith("template-current");
  });

  it("blocks all writes for mismatched, cancelled, or incomplete workbench and form data", async () => {
    const page = createPageInstance();
    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench({ id: "other-event" }));
    await page.load("event-assessment-1");
    await page.submitAssessment();
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();

    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench({ status: "cancelled" }));
    await page.load("event-assessment-1");
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();

    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench());
    mocks.getAssessmentForm.mockResolvedValueOnce(form({ templateId: "different-template" }));
    await page.load("event-assessment-1");
    await page.submitAssessment();
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();

    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench());
    mocks.getAssessmentForm.mockResolvedValueOnce(form({ templateVersionId: undefined }));
    await page.load("event-assessment-1");
    await page.submitAssessment();
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
  });

  it("keeps every real-field draft through cross-group navigation and clears only confirmed rows after a partial submission", async () => {
    mocks.submitCoachAssessment
      .mockResolvedValueOnce({ assessment: { id: "assessment-student-1" } })
      .mockRejectedValueOnce(new Error("network outcome unknown"));
    const page = createPageInstance();
    await page.load("event-assessment-1");
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "88" } });
    page.switchGroup({ currentTarget: { dataset: { id: "technique" } } });
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "76" } });
    page.switchGroup({ currentTarget: { dataset: { id: "fitness" } } });
    expect(page.data.draftRows[0]).toMatchObject({ studentId: "student-1", rawValue: "88", status: "recorded" });

    page.switchGroup({ currentTarget: { dataset: { id: "technique" } } });
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-2" } }, detail: { value: "65" } });
    await page.submitAssessment();

    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(2);
    expect(page.data.draft["student-1:item-speed"]).toBeUndefined();
    expect(page.data.draft["student-1:item-balance"]).toBeUndefined();
    expect(page.data.draft["student-2:item-balance"]).toMatchObject({ rawValue: "65" });
    expect(page.data.submitMessage).not.toContain("已提交 2");
  });

  it("counts missing entries as real draft progress without submitting them", async () => {
    const page = createPageInstance();
    await page.load("event-assessment-1");
    page.toggleMissing({ currentTarget: { dataset: { studentId: "student-1" } } });

    expect(page.data).toMatchObject({ completedCount: 1, totalCount: 4, progressLabel: "1 / 4 已录入" });
    await page.submitAssessment();
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
  });

  it("does not submit an out-of-range real score", async () => {
    const page = createPageInstance();
    await page.load("event-assessment-1");
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "101" } });
    await page.submitAssessment();

    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledTimes(1);
  });

  it("serializes duplicate submits and keeps a safe page-local C12 shell", async () => {
    let resolveSubmission;
    mocks.submitCoachAssessment.mockImplementationOnce(() => new Promise((resolve) => { resolveSubmission = resolve; }));
    const page = createPageInstance();
    await page.load("event-assessment-1");
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "80" } });
    const saving = page.submitAssessment();
    page.submitAssessment();
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
    resolveSubmission({ assessment: { id: "assessment-student-1" } });
    await saving;

    expect(controller).not.toContain("assessment-template-cq-talent-elite");
    expect(controller).not.toContain("Promise.all([");
    expect(controller).not.toContain("return record?.message");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).not.toContain('"submit-bar"');
    expect(template).toContain('/assets/icons/c12-arrow-left.svg');
    expect(stylesheet).toMatch(/\.c12-submit-wrap\s*\{[^}]*bottom:\s*140rpx/s);
    expect(stylesheet).toMatch(/\.c12-body\s*\{[^}]*padding:\s*32rpx 32rpx 320rpx/s);
  });
});
