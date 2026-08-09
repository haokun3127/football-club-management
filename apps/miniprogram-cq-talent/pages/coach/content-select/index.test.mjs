import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTrainingProjectTree: vi.fn(),
  getCoachWorkbench: vi.fn(),
  saveCoachTrainingProjects: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachTrainingProjectTree: mocks.getCoachTrainingProjectTree,
  getCoachWorkbench: mocks.getCoachWorkbench,
  saveCoachTrainingProjects: mocks.saveCoachTrainingProjects,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

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

const tree = {
  groups: [
    {
      id: "group-passing",
      name: "Actual passing group",
      projects: [{ id: "project-1", name: "Actual project one", tags: [], metricIds: [], durationMinutes: 30 }],
    },
    {
      id: "group-shooting",
      name: "Actual shooting group",
      projects: [
        { id: "project-1", name: "Actual project one", tags: [], metricIds: [], durationMinutes: 30 },
        { id: "project-2", name: "Actual project two", tags: [], metricIds: [] },
      ],
    },
  ],
  projects: [
    { id: "project-1", name: "Actual project one", tags: [], metricIds: [], durationMinutes: 30 },
    { id: "project-2", name: "Actual project two", tags: [], metricIds: [] },
  ],
  pending: [],
};

function workbench(selectedTrainingProjectIds = ["project-1"], event = {}) {
  return {
    event: {
      id: "event-training-1",
      type: "training",
      status: "scheduled",
      title: "Actual training event",
      startsAt: "2026-08-10T09:00:00.000Z",
      venue: "Actual venue",
      ...event,
    },
    roster: [],
    workflow: [],
    training: [],
    selectedTrainingProjects: [],
    selectedTrainingProjectIds,
    match: [],
    pending: [],
  };
}

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach training content select", () => {
  beforeEach(() => {
    mocks.getCoachTrainingProjectTree.mockReset().mockResolvedValue(tree);
    mocks.getCoachWorkbench.mockReset().mockResolvedValue(workbench(["project-1", "project-1", "unknown-project"]));
    mocks.saveCoachTrainingProjects.mockReset().mockResolvedValue({});
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
    mocks.showToast.mockReset();
  });

  it("makes no read or save request without a real event ID", async () => {
    const page = createPageInstance();
    await page.load("");
    page.confirmSelection();

    expect(mocks.getCoachTrainingProjectTree).not.toHaveBeenCalled();
    expect(mocks.getCoachWorkbench).not.toHaveBeenCalled();
    expect(mocks.saveCoachTrainingProjects).not.toHaveBeenCalled();
    expect(page.data).toMatchObject({ state: "error", canSave: false });
  });

  it("starts both real reads together and merges duplicate project memberships into a stable selection", async () => {
    let resolveTree;
    let resolveWorkbench;
    mocks.getCoachTrainingProjectTree.mockImplementationOnce(() => new Promise((resolve) => { resolveTree = resolve; }));
    mocks.getCoachWorkbench.mockImplementationOnce(() => new Promise((resolve) => { resolveWorkbench = resolve; }));
    const page = createPageInstance();
    const loading = page.load("event-training-1");

    expect(mocks.getCoachTrainingProjectTree).toHaveBeenCalledTimes(1);
    expect(mocks.getCoachWorkbench).toHaveBeenCalledWith("event-training-1");
    resolveTree(tree);
    resolveWorkbench(workbench(["project-1", "project-1", "unknown-project"]));
    await loading;

    expect(page.data).toMatchObject({
      state: "ready",
      canSave: true,
      selectedIds: ["project-1"],
      selectedCount: 1,
      durationText: "约 30 分钟",
    });
    expect(page.data.projects).toHaveLength(2);
    expect(page.data.projects[0]).toMatchObject({
      id: "project-1",
      groupIds: ["group-passing", "group-shooting"],
      hasDuration: true,
    });
    expect(page.data.projects[1]).toMatchObject({ id: "project-2", hasDuration: false });
  });

  it("blocks zero selection and preserves a partial duration state without inventing time", async () => {
    const page = createPageInstance();
    await page.load("event-training-1");
    page.toggleProject({ currentTarget: { dataset: { id: "project-1" } } });
    await page.confirmSelection();
    expect(mocks.saveCoachTrainingProjects).not.toHaveBeenCalled();

    page.toggleProject({ currentTarget: { dataset: { id: "project-1" } } });
    page.toggleProject({ currentTarget: { dataset: { id: "project-2" } } });
    expect(page.data).toMatchObject({
      selectedIds: ["project-1", "project-2"],
      selectedCount: 2,
      durationText: "已知 30 分钟，部分时长待补充",
    });
  });

  it("saves a single stable ID set and only returns after an exact workbench readback", async () => {
    mocks.getCoachWorkbench
      .mockResolvedValueOnce(workbench(["project-1"]))
      .mockResolvedValueOnce(workbench(["project-1", "project-2"]));
    let resolveSave;
    mocks.saveCoachTrainingProjects.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
    const page = createPageInstance();
    await page.load("event-training-1");
    page.toggleProject({ currentTarget: { dataset: { id: "project-2" } } });
    const saving = page.confirmSelection();
    page.confirmSelection();

    expect(mocks.saveCoachTrainingProjects).toHaveBeenCalledWith("event-training-1", ["project-1", "project-2"]);
    expect(mocks.saveCoachTrainingProjects).toHaveBeenCalledTimes(1);
    resolveSave({});
    await saving;
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
    expect(page.data).toMatchObject({ submitting: false, hasSaveError: false });
  });

  it("keeps the current selection and does not return after a training-project readback mismatch", async () => {
    mocks.getCoachWorkbench
      .mockResolvedValueOnce(workbench(["project-1"]))
      .mockResolvedValueOnce(workbench(["project-1"]));
    const page = createPageInstance();
    await page.load("event-training-1");
    page.toggleProject({ currentTarget: { dataset: { id: "project-2" } } });
    await page.confirmSelection();

    expect(page.data).toMatchObject({
      state: "ready",
      selectedIds: ["project-1", "project-2"],
      submitting: false,
      hasSaveError: true,
    });
    expect(page.data.saveError).not.toContain("raw");
    expect(mocks.navigateBack).not.toHaveBeenCalled();
  });

  it("keeps the current selection and a safe error after the training-project request fails", async () => {
    mocks.saveCoachTrainingProjects.mockRejectedValueOnce(new Error("raw transport failure"));
    const page = createPageInstance();
    await page.load("event-training-1");
    page.toggleProject({ currentTarget: { dataset: { id: "project-2" } } });
    await page.confirmSelection();

    expect(page.data).toMatchObject({
      state: "ready",
      selectedIds: ["project-1", "project-2"],
      submitting: false,
      hasSaveError: true,
    });
    expect(page.data.saveError).not.toContain("raw transport failure");
    expect(mocks.navigateBack).not.toHaveBeenCalled();
  });

  it("does not expose a save surface for mismatched, non-training, or cancelled workbenches", async () => {
    const page = createPageInstance();
    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench([], { id: "other-event" }));
    await page.load("event-training-1");
    expect(page.data).toMatchObject({ state: "error", canSave: false, selectedIds: [] });

    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench([], { type: "match" }));
    await page.load("event-training-1");
    expect(page.data).toMatchObject({ state: "error", canSave: false, selectedIds: [] });

    mocks.getCoachWorkbench.mockResolvedValueOnce(workbench([], { status: "cancelled" }));
    await page.load("event-training-1");
    expect(page.data).toMatchObject({ state: "error", canSave: false, selectedIds: [] });
  });

  it("uses a local Figma navigation and contains no app header, sample facts, or WXML helpers", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).toContain('"status-view"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('class="select-nav"');
    expect(template).toContain('/assets/icons/chevron-left.svg');
    expect(template).not.toMatch(/传球训练（初级）|射门训练（中级）|战术转换练习|体能循环训练|45分钟/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.select-nav\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*border-box/s);
    expect(controller).not.toContain("openCoverage");
  });
});
