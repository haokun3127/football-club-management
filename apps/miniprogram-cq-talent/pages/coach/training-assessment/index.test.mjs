import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachWorkbench: vi.fn(),
  getCoachTrainingContentAssessments: vi.fn(),
  saveCoachTrainingContentAssessments: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  showToast: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachWorkbench: mocks.getCoachWorkbench,
  getCoachTrainingContentAssessments: mocks.getCoachTrainingContentAssessments,
  saveCoachTrainingContentAssessments: mocks.saveCoachTrainingContentAssessments,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({
  formatCalendarDate: () => "9月4日 周五",
  formatTimeOnly: () => "09:00",
  resolveMenuInset: () => 16,
  resolveNavInset: () => 0,
}));

globalThis.wx = { showToast: mocks.showToast, navigateBack: mocks.navigateBack };
let pageDefinition;
globalThis.Page = (definition) => { pageDefinition = definition; return definition; };

await import("./index.ts");

const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

const workbench = {
  event: {
    id: "event-training",
    type: "training",
    title: "进攻训练",
    teamName: "U10发展队",
    venue: "九龙坡足球公园",
    startsAt: "2026-09-04T09:00:00.000Z",
    endsAt: "2026-09-04T10:30:00.000Z",
    status: "completed",
  },
  selectedTrainingProjects: [{ id: "project-passing", name: "传接球" }, { id: "project-finishing", name: "射门" }],
  roster: [
    { studentId: "student-1", name: "罗志炫", status: "present" },
    { studentId: "student-2", name: "骆啸宇", status: "absent" },
    { studentId: "student-3", name: "郭飞", status: "late" },
  ],
};

const assessmentScope = {
  eventId: "event-training",
  selectedProjectIds: ["project-passing", "project-finishing"],
  presentStudentIds: ["student-1", "student-3"],
  assessments: [{ studentId: "student-1", trainingProjectId: "project-passing", score: 84, note: "传球节奏稳定" }],
};

function createPageInstance() {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach training content assessment", () => {
  beforeEach(() => {
    mocks.getCoachWorkbench.mockReset().mockResolvedValue(workbench);
    mocks.getCoachTrainingContentAssessments.mockReset().mockResolvedValue(assessmentScope);
    mocks.saveCoachTrainingContentAssessments.mockReset().mockResolvedValue({ assessments: [] });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    mocks.showToast.mockReset();
    mocks.navigateBack.mockReset();
  });

  it("shows only present learners across the real selected training content and restores saved values", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-training" });

    expect(mocks.getCoachWorkbench).toHaveBeenCalledWith("event-training");
    expect(mocks.getCoachTrainingContentAssessments).toHaveBeenCalledWith("event-training");
    expect(page.data).toMatchObject({ state: "ready", eventTitle: "进攻训练", presentCountLabel: "2 名已到学员" });
    expect(page.data.projects.map((item) => item.label)).toEqual(["传接球", "射门"]);
    expect(page.data.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-1", scoreInput: "84", noteInput: "传球节奏稳定" }),
      expect.objectContaining({ studentId: "student-3" }),
    ]));
    expect(page.data.rows.find((item) => item.studentId === "student-2")).toBeUndefined();
  });

  it("projects the real activity time into the classroom assessment course context", async () => {
    const page = createPageInstance();
    await page.load("event-training");

    expect(page.data).toMatchObject({
      eventDateTeam: "9月4日 周五 · U10发展队",
      eventTime: "09:00",
      eventVenue: "九龙坡足球公园",
      presentCountLabel: "2 名已到学员",
    });
    expect(template).toContain("{{eventTime}}");
    expect(template).toContain("{{eventDateTeam}}");
    expect(template).toContain("{{eventVenue}}");
  });

  it("keeps assessment values per selected content and saves only valid real student-project pairs", async () => {
    const page = createPageInstance();
    await page.load("event-training");
    page.onScoreInput({ currentTarget: { dataset: { studentId: "student-3" } }, detail: { value: "91" } });
    page.selectProject({ currentTarget: { dataset: { id: "project-finishing" } } });
    page.onScoreInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "88" } });
    page.onNoteInput({ currentTarget: { dataset: { studentId: "student-1" } }, detail: { value: "射门果断" } });
    await page.save();

    expect(mocks.saveCoachTrainingContentAssessments).toHaveBeenCalledWith("event-training", expect.arrayContaining([
      { studentId: "student-1", trainingProjectId: "project-passing", score: 84, note: "传球节奏稳定" },
      { studentId: "student-3", trainingProjectId: "project-passing", score: 91, note: "" },
      { studentId: "student-1", trainingProjectId: "project-finishing", score: 88, note: "射门果断" },
    ]));
  });

  it("is honest when a training activity has no checked-in learner or no selected content", async () => {
    mocks.getCoachTrainingContentAssessments.mockResolvedValueOnce({ ...assessmentScope, presentStudentIds: [] });
    const page = createPageInstance();
    await page.load("event-training");
    expect(page.data).toMatchObject({ state: "empty", statusTitle: "暂无可评测学员" });
    expect(mocks.saveCoachTrainingContentAssessments).not.toHaveBeenCalled();
  });

  it("offers a direct link to select training content when the API reports it is missing", async () => {
    mocks.getCoachTrainingContentAssessments.mockRejectedValueOnce({ code: "training_content_required" });
    const page = createPageInstance();

    await page.load("event-training");

    expect(page.data).toMatchObject({
      state: "empty",
      statusTitle: "暂无训练内容",
      statusActionText: "去选择训练内容",
    });
    page.handleStatusAction();
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/content-select/index?eventId=event-training");
  });

  it("keeps the full-screen view WXML-safe and linked from C2 training workbench", () => {
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).toContain('bindtap="selectProject"');
    expect(template).toContain('bindinput="onScoreInput"');
    expect(template).toContain('bindinput="onNoteInput"');
    expect(template).toContain('bindtap="save"');
    expect(template).toContain('bindaction="handleStatusAction"');
    expect(pageConfig).toContain('"navigationStyle": "custom"');
    expect(pageConfig).not.toContain('"role-tabbar"');
    expect(controller).not.toContain("eventId: \"event-");
  });
});
