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
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 0 }));
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

  it("projects at most four real fields into each student card and keeps later fields reachable", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce(form({
      fields: [
        { id: "field-speed", testItemId: "item-speed", metricId: "metric-speed", groupId: "fitness", groupLabel: "Fitness", label: "Actual speed", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
        { id: "field-endurance", testItemId: "item-endurance", metricId: "metric-endurance", groupId: "fitness", groupLabel: "Fitness", label: "Actual endurance", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
        { id: "field-strength", testItemId: "item-strength", metricId: "metric-strength", groupId: "fitness", groupLabel: "Fitness", label: "Actual strength", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
        { id: "field-agility", testItemId: "item-agility", metricId: "metric-agility", groupId: "fitness", groupLabel: "Fitness", label: "Actual agility", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
        { id: "field-balance", testItemId: "item-balance", metricId: "metric-balance", groupId: "fitness", groupLabel: "Fitness", label: "Actual balance", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
      ],
    }));
    const page = createPageInstance();
    await page.load("event-assessment-1");

    expect(page.data.draftRows[0].metricCells.map((cell) => cell.testItemId)).toEqual([
      "item-speed", "item-endurance", "item-strength", "item-agility",
    ]);
    expect(page.data.draftRows[0].metricCells.every((cell) => cell.rawValue === "")).toBe(true);

    page.nextField();
    expect(page.data.draftRows[0].metricCells.map((cell) => cell.testItemId)).toEqual([
      "item-endurance", "item-strength", "item-agility", "item-balance",
    ]);
  });

  it("precomputes a compact label for long real assessment metrics", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce(form({
      fields: [
        { id: "field-juggling", testItemId: "item-juggling", metricId: "metric-juggling", groupId: "fitness", groupLabel: "Fitness", label: "1分钟颠球次数", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
      ],
    }));
    const page = createPageInstance();
    await page.load("event-assessment-1");

    expect(page.data.draftRows[0].metricCells[0]).toMatchObject({
      label: "1分钟颠球次数",
      displayLabel: "1分钟颠球…",
    });
  });

  it("keeps the compact missing toggle label truthful after its state changes", async () => {
    const page = createPageInstance();
    await page.load("event-assessment-1");

    expect(page.data.draftRows[0].missingActionLabel).toBe("缺测");
    page.toggleMissing({ currentTarget: { dataset: { studentId: "student-1" } } });
    expect(page.data.draftRows[0].missingActionLabel).toBe("恢复");
  });

  it("writes compact card inputs against the cell's real test item rather than the first field", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce(form({
      fields: [
        { id: "field-speed", testItemId: "item-speed", metricId: "metric-speed", groupId: "fitness", groupLabel: "Fitness", label: "Actual speed", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
        { id: "field-balance", testItemId: "item-balance", metricId: "metric-balance", groupId: "fitness", groupLabel: "Fitness", label: "Actual balance", valueKind: "score_0_100", inputType: "number", minValue: 0, maxValue: 100, unit: "score" },
      ],
    }));
    const page = createPageInstance();
    await page.load("event-assessment-1");
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-1", testItemId: "item-balance" } }, detail: { value: "76" } });

    expect(page.data.draft["student-1:item-speed"]).toBeUndefined();
    expect(page.data.draft["student-1:item-balance"]).toMatchObject({ status: "recorded", rawValue: "76" });
  });

  it("renders the Figma C12 student-card grid with only precomputed field cells", () => {
    expect(template).toContain('class="c12-student-card"');
    expect(template).toContain('wx:for="{{item.metricCells}}"');
    expect(template).toContain('data-test-item-id="{{cell.testItemId}}"');
    expect(template).toContain('class="c12-submit-wrap"');
    expect(template).not.toContain('c12-field-card');
    expect(stylesheet).toMatch(/\.c12-student-card__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s);
    expect(stylesheet).toMatch(/\.c12-submit-wrap\s*\{[^}]*bottom:\s*140rpx[^}]*min-height:\s*140rpx/s);
  });

  it("keeps the Figma C12 first viewport focused on learner cards before field navigation", () => {
    const studentsIndex = template.indexOf('class="c12-students"');
    const navigationIndex = template.indexOf('class="c12-field-navigation"');
    const progressIndex = template.indexOf('class="c12-progress"');

    expect(template).toContain("{{cell.displayLabel}}");
    expect(studentsIndex).toBeGreaterThan(-1);
    expect(navigationIndex).toBeGreaterThan(studentsIndex);
    expect(progressIndex).toBeGreaterThan(studentsIndex);
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
    expect(template).toContain("{{navTitle}}");
    expect(stylesheet).toMatch(/\.c12-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(stylesheet).toMatch(/\.c12-body\s*\{[^}]*padding:\s*32rpx 44rpx 320rpx/s);
    expect(stylesheet).toMatch(/\.c12-students\s*\{[^}]*margin-top:\s*40rpx/s);
    expect(stylesheet).toMatch(/\.c12-task-header\s*\{(?=[^}]*height:\s*192rpx)(?=[^}]*overflow:\s*hidden)/s);
    expect(stylesheet).toMatch(/\.c12-students\s*\{[^}]*padding:\s*16rpx 32rpx 0/s);
    expect(stylesheet).toMatch(/\.c12-submit-wrap\s*\{[^}]*padding:\s*14rpx 44rpx 18rpx/s);
  });

  it("offers only the latest valid local draft and blocks the underlying assessment until continuing", async () => {
    drafts.set("event-assessment-1:template-current-v2", {
      "student-1:item-speed": { studentId: "student-1", testItemId: "item-speed", status: "recorded", rawValue: "80", updatedAt: "2026-08-10T09:12:00.000Z" },
      "student-2:item-balance": { studentId: "student-2", testItemId: "item-balance", status: "missing", rawValue: "", updatedAt: "2026-08-10T10:12:00.000Z" },
      "student-other:item-speed": { studentId: "student-other", testItemId: "item-speed", status: "recorded", rawValue: "66", updatedAt: "2026-08-10T12:12:00.000Z" },
      "student-1:item-other": { studentId: "student-1", testItemId: "item-other", status: "recorded", rawValue: "66", updatedAt: "2026-08-10T12:12:00.000Z" },
      "student-1:item-balance": { studentId: "student-1", testItemId: "item-balance", status: "empty", rawValue: "", updatedAt: "2026-08-10T12:12:00.000Z" },
    });
    const page = createPageInstance();
    await page.load("event-assessment-1");

    expect(page.data).toMatchObject({ draftResumeVisible: true, canSubmit: false, navTitle: "成绩录入" });
    expect(page.data.draftResumeUpdatedAtLabel).toContain("本机草稿");
    expect(page.data.draftResumeUpdatedAtLabel).toContain("2026-08-10 10:12");
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-2" } }, detail: { value: "72" } });
    page.switchGroup({ currentTarget: { dataset: { id: "technique" } } });
    await page.submitAssessment();
    expect(page.data.draft["student-2:item-speed"]).toBeUndefined();
    expect(page.data.activeGroupId).toBe("fitness");
    expect(mocks.submitCoachAssessment).not.toHaveBeenCalled();

    page.continueDraft();
    expect(page.data).toMatchObject({ draftResumeVisible: false, canSubmit: true, navTitle: "项目评分录入" });
    page.onValueInput({ currentTarget: { dataset: { studentId: "student-2" } }, detail: { value: "72" } });
    expect(page.data.draft["student-2:item-speed"]).toMatchObject({ status: "recorded", rawValue: "72" });
  });

  it("skips invalid local draft rows and exits a valid resume modal once without clearing it", async () => {
    drafts.set("event-other:template-current-v2", {
      "student-1:item-speed": { studentId: "student-1", testItemId: "item-speed", status: "recorded", rawValue: "80", updatedAt: "2026-08-10T10:12:00.000Z" },
    });
    drafts.set("event-assessment-1:template-other-v1", {
      "student-1:item-speed": { studentId: "student-1", testItemId: "item-speed", status: "recorded", rawValue: "80", updatedAt: "2026-08-10T10:12:00.000Z" },
    });
    drafts.set("event-assessment-1:template-current-v2", {
      "student-other:item-speed": { studentId: "student-other", testItemId: "item-speed", status: "recorded", rawValue: "80", updatedAt: "2026-08-10T10:12:00.000Z" },
      "student-1:item-other": { studentId: "student-1", testItemId: "item-other", status: "missing", rawValue: "", updatedAt: "2026-08-10T10:12:00.000Z" },
      "student-1:item-speed": { studentId: "student-1", testItemId: "item-speed", status: "empty", rawValue: "", updatedAt: "2026-08-10T10:12:00.000Z" },
    });
    const page = createPageInstance();
    await page.load("event-assessment-1");
    expect(page.data).toMatchObject({ draftResumeVisible: false, draftResumeUpdatedAtLabel: "" });

    drafts.set("event-assessment-1:template-current-v2", {
      "student-1:item-speed": { studentId: "student-1", testItemId: "item-speed", status: "recorded", rawValue: "80", updatedAt: "not-a-date" },
    });
    await page.load("event-assessment-1");
    const savedDraft = JSON.stringify(drafts.get("event-assessment-1:template-current-v2"));
    expect(page.data).toMatchObject({ draftResumeVisible: true, draftResumeUpdatedAtLabel: "本机草稿" });
    page.exitDraft();
    page.exitDraft();
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(drafts.get("event-assessment-1:template-current-v2"))).toBe(savedDraft);
  });

  it("ignores stale workbench success and failure before they can replace a later assessment modal", async () => {
    let resolveOldSuccess;
    let rejectOldFailure;
    mocks.getCoachWorkbench
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldSuccess = resolve; }))
      .mockResolvedValueOnce(workbench({ id: "event-current", title: "Current assessment" }));
    drafts.set("event-current:template-current-v2", {
      "student-1:item-speed": { studentId: "student-1", testItemId: "item-speed", status: "recorded", rawValue: "80", updatedAt: "2026-08-10T10:12:00.000Z" },
    });
    const page = createPageInstance();
    const oldSuccess = page.load("event-old-success");
    await page.load("event-current");
    resolveOldSuccess(workbench({ id: "event-old-success", title: "Old assessment" }));
    await oldSuccess;
    expect(page.data).toMatchObject({ eventId: "event-current", eventTitle: "Current assessment", draftResumeVisible: true });

    mocks.getCoachWorkbench
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOldFailure = reject; }))
      .mockResolvedValueOnce(workbench({ id: "event-current", title: "Current assessment" }));
    const oldFailure = page.load("event-old-failure");
    await page.load("event-current");
    rejectOldFailure(new Error("stale failure"));
    await oldFailure;
    expect(page.data).toMatchObject({ state: "ready", eventId: "event-current", draftResumeVisible: true });
  });

  it("keeps the C12.1 mask and autosave modal truthful, page-local, and structurally Figma-aligned", () => {
    expect(template).toContain('wx:if="{{draftResumeVisible}}"');
    expect(template).toContain('class="c121-event-mask"');
    expect(template).toContain('/assets/icons/c121-check.svg');
    expect(template).toContain("continueDraft");
    expect(template).toContain("exitDraft");
    expect(template).not.toContain("1分钟前");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.c121-event-mask\s*\{[^}]*position:\s*fixed[^}]*z-index:\s*10000/s);
    expect(stylesheet).toMatch(/\.c121-modal\s*\{[^}]*width:\s*662rpx[^}]*border-radius:\s*32rpx/s);
  });

  it("keeps the submit action clear of the system capsule", () => {
    expect(template).toContain('padding-right: {{menuInset}}px');
    expect(stylesheet).toMatch(/\.c12-nav__left\s*\{[^}]*min-width:\s*0/s);
  });
});
