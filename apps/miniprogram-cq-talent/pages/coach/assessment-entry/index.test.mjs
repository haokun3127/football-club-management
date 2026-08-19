import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();
const mocks = vi.hoisted(() => ({
  getAssessmentForm: vi.fn(),
  getCoachTeam: vi.fn(),
  submitCoachAssessment: vi.fn(),
  requireRole: vi.fn(),
  showToast: vi.fn(),
  redirectTo: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getAssessmentForm: mocks.getAssessmentForm,
  getCoachTeam: mocks.getCoachTeam,
  submitCoachAssessment: mocks.submitCoachAssessment,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 0 }));

globalThis.wx = {
  getStorageSync: (key) => storage.get(key) ?? "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  showToast: mocks.showToast,
  redirectTo: mocks.redirectTo,
  navigateBack: mocks.navigateBack,
};

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

const form = (overrides = {}) => ({
  templateId: "template-real",
  templateVersionId: "version-real",
  templateName: "Real assessment",
  versionName: "v1",
  pending: [],
  fields: [
    {
      id: "field-speed",
      testItemId: "item-speed",
      metricId: "metric-speed",
      groupId: "fitness",
      groupLabel: "Fitness",
      label: "Real speed",
      inputType: "number",
      valueKind: "score_0_100",
      minValue: 0,
      maxValue: 100,
      required: true,
    },
    {
      id: "field-passing",
      testItemId: "item-passing",
      metricId: "metric-passing",
      groupId: "technical",
      groupLabel: "Technical",
      label: "Real passing",
      inputType: "number",
      valueKind: "score_0_100",
      minValue: 0,
      maxValue: 100,
      required: true,
    },
  ],
  ...overrides,
});

const team = (overrides = {}) => ({
  team: { id: "team-real", name: "Actual team", season: "2026" },
  stats: { memberCount: 2, trainingCount: 0, attendanceRate: null },
  members: [
    { id: "student-1", name: "Actual learner one" },
    { id: "student-2", name: "Actual learner two" },
  ],
  ...overrides,
});

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("C15 coach assessment entry", () => {
  beforeEach(() => {
    storage.clear();
    mocks.getAssessmentForm.mockReset().mockResolvedValue(form());
    mocks.getCoachTeam.mockReset().mockResolvedValue(team());
    mocks.submitCoachAssessment.mockReset().mockResolvedValue({ assessment: { id: "assessment-confirmed" } });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.showToast.mockReset();
    mocks.redirectTo.mockReset();
    mocks.navigateBack.mockReset();
  });

  it("makes no request without an authenticated coach or a real template id", async () => {
    const page = createPageInstance();
    mocks.requireRole.mockReturnValue(null);
    await page.onLoad({ templateId: "template-real" });
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();

    mocks.requireRole.mockReturnValue({ role: "coach" });
    await page.onLoad({});
    expect(mocks.getAssessmentForm).not.toHaveBeenCalled();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();
  });

  it("keeps the newest concurrent load when an older load succeeds or fails late", async () => {
    let resolveOldForm;
    let resolveOldTeam;
    mocks.getAssessmentForm
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldForm = resolve; }))
      .mockResolvedValueOnce(form({ templateId: "template-current", fields: [{ ...form().fields[0], id: "field-current", testItemId: "item-current" }] }));
    mocks.getCoachTeam
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldTeam = resolve; }))
      .mockResolvedValueOnce(team({ members: [{ id: "student-current", name: "Current learner" }] }));
    const page = createPageInstance();
    const oldLoad = page.load("template-old", "Old task");
    await page.load("template-current", "Current task");
    resolveOldForm(form({ templateId: "template-old", fields: [{ ...form().fields[0], id: "field-old", testItemId: "item-old" }] }));
    resolveOldTeam(team({ members: [{ id: "student-old", name: "Old learner" }] }));
    await oldLoad;

    expect(page.data).toMatchObject({ templateId: "template-current", taskTitle: "Current task" });
    expect(page.data.fields[0]).toMatchObject({ id: "field-current", testItemId: "item-current" });
    expect(page.data.students[0]).toMatchObject({ id: "student-current" });
  });

  it("keeps the newest ready state when an older load fails late", async () => {
    let rejectOldForm;
    mocks.getAssessmentForm
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOldForm = reject; }))
      .mockResolvedValueOnce(form({ templateId: "template-current", fields: [{ ...form().fields[0], id: "field-current", testItemId: "item-current" }] }));
    mocks.getCoachTeam
      .mockResolvedValueOnce(team())
      .mockResolvedValueOnce(team({ members: [{ id: "student-current", name: "Current learner" }] }));
    const page = createPageInstance();
    const oldLoad = page.load("template-old", "Old task");
    await page.load("template-current", "Current task");
    rejectOldForm(new Error("older response failed"));
    await oldLoad;

    expect(page.data).toMatchObject({ state: "ready", templateId: "template-current", taskTitle: "Current task" });
    expect(page.data.fields[0]).toMatchObject({ id: "field-current" });
  });

  it("rejects a form field without its real test item instead of inventing one", async () => {
    mocks.getAssessmentForm.mockResolvedValueOnce(form({ fields: [{ ...form().fields[0], testItemId: undefined }] }));
    const page = createPageInstance();
    await page.load("template-real", "Real task");
    expect(page.data.state).toBe("empty");
    expect(page.data.fields).toEqual([]);
  });

  it("stores a versioned local draft and restores only the current team/form intersection", async () => {
    storage.set("coach-assessment-entry:template-real:version-real", {
      signature: "stale-signature",
      valuesByStudent: { "student-1": { "field-speed": 71 } },
    });
    const page = createPageInstance();
    await page.load("template-real", "Real task");
    expect(page.data.students[0].rows[0].value).toBeNull();

    page.onSliderChange({ currentTarget: { dataset: { studentId: "student-1", fieldId: "field-speed" } }, detail: { value: 80 } });
    const saved = storage.get("coach-assessment-entry:template-real:version-real");
    expect(saved).toEqual(expect.objectContaining({
      signature: expect.any(String),
      valuesByStudent: { "student-1": { "field-speed": 80 } },
    }));
  });

  it("projects only real team metadata and precomputes compact slider progress for the C15 view", async () => {
    const page = createPageInstance();
    await page.load("template-real", "Real task");

    expect(page.data.students[0]).toMatchObject({
      teamLabel: "Actual team",
      rows: [expect.objectContaining({ fieldId: "field-speed", progressPercent: 0 })],
    });

    page.onSliderChange({ currentTarget: { dataset: { studentId: "student-1", fieldId: "field-speed" } }, detail: { value: 80 } });
    expect(page.data.students[0].rows[0]).toMatchObject({ valueLabel: "80", progressPercent: 80 });
  });

  it("clears only confirmed students and stays on C15 after a partial or unknown result", async () => {
    mocks.submitCoachAssessment
      .mockResolvedValueOnce({ assessment: { id: "assessment-1" } })
      .mockRejectedValueOnce({ code: "network_error" });
    const page = createPageInstance();
    await page.load("template-real", "Real task");
    page.onSliderChange({ currentTarget: { dataset: { studentId: "student-1", fieldId: "field-speed" } }, detail: { value: 80 } });
    page.onSliderChange({ currentTarget: { dataset: { studentId: "student-2", fieldId: "field-speed" } }, detail: { value: 70 } });
    await page.submit();

    const saved = storage.get("coach-assessment-entry:template-real:version-real");
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(2);
    expect(mocks.submitCoachAssessment).toHaveBeenNthCalledWith(1, expect.objectContaining({
      studentId: "student-1",
      rawResults: [expect.objectContaining({ testItemId: "item-speed", metricId: "metric-speed" })],
    }));
    expect(saved.valuesByStudent["student-1"]).toBeUndefined();
    expect(saved.valuesByStudent["student-2"]).toEqual({ "field-speed": 70 });
    expect(mocks.redirectTo).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith({ title: "部分评测未确认，已保留草稿", icon: "none" });
  });

  it("serializes submit and redirects once with the real count only after every 201 confirmation", async () => {
    let resolveFirst;
    mocks.submitCoachAssessment.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    const page = createPageInstance();
    await page.load("template-real", "Real task");
    page.onSliderChange({ currentTarget: { dataset: { studentId: "student-1", fieldId: "field-speed" } }, detail: { value: 80 } });
    page.onSliderChange({ currentTarget: { dataset: { studentId: "student-2", fieldId: "field-speed" } }, detail: { value: 70 } });
    const pending = page.submit();
    page.submit();
    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(1);
    resolveFirst({ assessment: { id: "assessment-1" } });
    await pending;

    expect(mocks.submitCoachAssessment).toHaveBeenCalledTimes(2);
    expect(mocks.redirectTo).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining("count=2"),
    }));
    expect(storage.has("coach-assessment-entry:template-real:version-real")).toBe(false);
  });

  it("keeps C15 page structure data-driven and free of raw API errors", () => {
    expect(controller).not.toContain("field.testItemId || field.id");
    expect(controller).not.toContain("error instanceof Error ? error.message");
    expect(controller).not.toContain("assessedByCoachId");
    expect(controller).not.toContain("eventId:");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("陈小宇");
    expect(template).not.toContain("U10精英队");
    expect(template).toContain('class="c15-student-card__team"');
    expect(template).toContain('class="c15-row__progress" style="width: {{row.progressPercent}}%;"');
    expect(template).toContain('class="c15-row__slider-input"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('<role-tabbar role="coach" active="training" />');
    expect(template).not.toContain('flow="{{true}}"');
    expect(template).toContain('padding-top:{{navInset}}px;padding-right:{{menuInset}}px');
    expect(stylesheet).toMatch(/\.c15-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
    expect(stylesheet).toMatch(/\.c15-nav__left\s*\{[^}]*gap:\s*0/s);
    expect(stylesheet).toMatch(/\.c15-submit-wrap\s*\{(?=[^}]*position:\s*static)(?=[^}]*margin-top:\s*32rpx)/s);
    expect(stylesheet).toMatch(/\.c15-row__track\s*\{(?=[^}]*width:\s*320rpx)(?=[^}]*height:\s*12rpx)/s);
  });
});
