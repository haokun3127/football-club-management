import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachAssessmentTasks: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  navigateBack: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachAssessmentTasks: mocks.getCoachAssessmentTasks }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 0 }));

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

const realTasks = [
  {
    id: "task-in-progress",
    title: "Actual assessment task",
    templateId: "template-real",
    startsOn: "2026-08-01",
    dueOn: "2026-08-31",
    status: "in_progress",
    completedStudents: 4,
    totalStudents: 8,
  },
  {
    id: "task-not-started",
    title: "Upcoming assessment task",
    templateId: "template-upcoming",
    startsOn: "2026-09-01",
    dueOn: "2026-09-30",
    status: "not_started",
    completedStudents: 0,
    totalStudents: 0,
  },
  {
    id: "task-completed",
    title: "Completed assessment task",
    templateId: "template-completed",
    startsOn: "2026-07-01",
    dueOn: "2026-07-31",
    status: "completed",
    completedStudents: 11,
    totalStudents: 10,
  },
];

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach assessment task list", () => {
  beforeEach(() => {
    mocks.getCoachAssessmentTasks.mockReset().mockResolvedValue(realTasks);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    mocks.navigateBack.mockReset();
    mocks.showToast.mockReset();
  });

  it("does not request assessment tasks for a non-coach", async () => {
    mocks.requireRole.mockReturnValue(null);
    const page = createPageInstance();
    await page.load();

    expect(mocks.getCoachAssessmentTasks).not.toHaveBeenCalled();
  });

  it("precomputes actual task labels, filters, and safe progress widths", async () => {
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({ state: "ready", hasVisibleTasks: true });
    expect(page.data.visibleTasks).toHaveLength(3);
    expect(page.data.tasks[0]).toMatchObject({
      statusLabel: "进行中",
      isEntryEnabled: true,
      progressLabel: "4/8名学员",
      progressStyle: "width: 50%",
    });
    expect(page.data.tasks[1]).toMatchObject({ progressLabel: "0/0名学员", progressStyle: "width: 0%" });
    expect(page.data.tasks[2]).toMatchObject({ progressLabel: "11/10名学员", progressStyle: "width: 100%" });

    page.selectFilter({ currentTarget: { dataset: { id: "unfinished" } } });
    expect(page.data.visibleTasks.map((task) => task.id)).toEqual(["task-in-progress", "task-not-started"]);
    page.selectFilter({ currentTarget: { dataset: { id: "completed" } } });
    expect(page.data.visibleTasks.map((task) => task.id)).toEqual(["task-completed"]);
  });

  it("opens the entry form only for an in-progress real task", async () => {
    const page = createPageInstance();
    await page.load();

    page.openTask({ currentTarget: { dataset: { id: "task-in-progress" } } });
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/assessment-entry/index?templateId=template-real&title=Actual%20assessment%20task");

    page.openTask({ currentTarget: { dataset: { id: "task-not-started" } } });
    page.openTask({ currentTarget: { dataset: { id: "task-completed" } } });
    expect(mocks.openPage).toHaveBeenCalledTimes(1);
    expect(mocks.showToast).toHaveBeenCalledTimes(2);
  });

  it("keeps the Figma creation affordances honest when no create API exists", async () => {
    const page = createPageInstance();
    await page.load();

    page.showCreateUnavailable();

    expect(mocks.showToast).toHaveBeenCalledWith({ title: "当前端暂不支持新增测评任务。", icon: "none" });
    expect(mocks.getCoachAssessmentTasks).toHaveBeenCalledTimes(1);
    expect(page.data.tasks.map((task) => task.id)).toEqual(realTasks.map((task) => task.id));
  });

  it("uses a safe generic message when the list request fails", async () => {
    mocks.getCoachAssessmentTasks.mockRejectedValueOnce(new Error("raw backend detail"));
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({ state: "error", message: "测评任务读取失败，请稍后重试。" });
    expect(page.data.message).not.toContain("raw backend detail");
  });

  it("does not double-request during the first onShow while the initial load is pending", async () => {
    let resolveTasks;
    mocks.getCoachAssessmentTasks.mockImplementationOnce(() => new Promise((resolve) => { resolveTasks = resolve; }));
    const page = createPageInstance();
    const loading = page.onLoad();
    page.onShow();

    expect(mocks.getCoachAssessmentTasks).toHaveBeenCalledTimes(1);
    resolveTasks(realTasks);
    await loading;
  });

  it("refreshes a successfully loaded empty list and prevents overlapping return refreshes", async () => {
    let resolveRefresh;
    mocks.getCoachAssessmentTasks
      .mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
    const page = createPageInstance();
    const initialLoad = page.onLoad();
    page.onShow();
    await initialLoad;
    expect(page.data.state).toBe("empty");

    const firstRefresh = page.onShow();
    page.onShow();
    expect(mocks.getCoachAssessmentTasks).toHaveBeenCalledTimes(2);
    resolveRefresh(realTasks);
    await firstRefresh;
    expect(page.data.state).toBe("ready");
  });

  it("uses the C11 Figma navigation, unavailable create affordances, and WXML-safe real-data layout", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).toContain('"status-view"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('class="tasks-nav"');
    expect(template).toContain('padding-right:{{menuInset}}px');
    expect(template).toContain('class="tasks-nav__create"');
    expect(template).toContain('class="tasks-fab"');
    expect(template).toContain('bindtap="showCreateUnavailable"');
    expect(template).toContain('/assets/icons/c11-arrow-left.svg');
    expect(template).toContain('<role-tabbar role="coach" active="training"');
    expect(template).toContain('<image class="task-card__chevron"');
    expect(template).not.toContain('wx:if="{{item.isEntryEnabled}}" class="task-card__chevron"');
    expect(template).not.toMatch(/体能综合测评|速度耐力体测|控球精度评估|2025-07-01|12\/18名学员/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("createTask");
    expect(controller).toContain("resolveMenuInset");
    expect(stylesheet).toMatch(/\.tasks-nav\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*content-box/s);
    expect(stylesheet).toMatch(/\.tasks-fab\s*\{[^}]*width:\s*112rpx[^}]*height:\s*112rpx/s);
  });
});
