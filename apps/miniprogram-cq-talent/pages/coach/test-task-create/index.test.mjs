import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachAssessmentTaskOptions: vi.fn(),
  createCoachAssessmentTask: vi.fn(),
  requireRole: vi.fn(),
  showToast: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachAssessmentTaskOptions: mocks.getCoachAssessmentTaskOptions,
  createCoachAssessmentTask: mocks.createCoachAssessmentTask,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

globalThis.wx = {
  showToast: mocks.showToast,
  navigateBack: mocks.navigateBack,
};

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");

function createPageInstance() {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach test-task create", () => {
  beforeEach(() => {
    mocks.getCoachAssessmentTaskOptions.mockReset().mockResolvedValue({
      tasks: [],
      templates: [{ id: "assessment-template-technical", name: "技术测评模板" }],
    });
    mocks.createCoachAssessmentTask.mockReset().mockResolvedValue({ id: "task-new" });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.showToast.mockReset();
    mocks.navigateBack.mockReset();
  });

  it("loads templates and enables submit only with title, template and valid period", async () => {
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(page.data.templateNames).toEqual(["技术测评模板"]);
    expect(page.data.canSubmit).toBe(false);

    page.onTitleInput({ detail: { value: "月度技术测评" } });
    expect(page.data.canSubmit).toBe(true);

    page.onDueDateChange({ detail: { value: "2020-01-01" } });
    expect(page.data.canSubmit).toBe(false);
  });

  it("submits the create request and navigates back", async () => {
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    page.onTitleInput({ detail: { value: "月度技术测评" } });
    page.onStartDateChange({ detail: { value: "2026-08-21" } });
    page.onDueDateChange({ detail: { value: "2026-08-31" } });
    await page.submit();

    expect(mocks.createCoachAssessmentTask).toHaveBeenCalledWith({
      title: "月度技术测评",
      templateId: "assessment-template-technical",
      startsOn: "2026-08-21",
      dueOn: "2026-08-31",
    });
    expect(mocks.navigateBack).toHaveBeenCalled();
  });

  it("keeps the form honest on save failure", async () => {
    mocks.createCoachAssessmentTask.mockRejectedValueOnce(new Error("network"));
    const page = createPageInstance();
    page.onLoad();
    await new Promise((resolve) => setTimeout(resolve, 0));

    page.onTitleInput({ detail: { value: "月度技术测评" } });
    await page.submit();

    expect(mocks.navigateBack).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalled();
    expect(page.data.submitting).toBe(false);
  });

  it("renders the form affordances without template JS", () => {
    expect(template).toContain('bindinput="onTitleInput"');
    expect(template).toContain('bindchange="onTemplateChange"');
    expect(template).toContain('mode="date"');
    expect(template).toContain('bindtap="submit"');
    expect(template).not.toMatch(/\{\{item\.(?:map|filter|slice|indexOf)/);
  });
});
