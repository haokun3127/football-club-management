import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTeam: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachTeam: mocks.getCoachTeam }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 88, resolveNavInset: () => 0 }));

globalThis.wx = { navigateBack: mocks.navigateBack };

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

const teamDetail = {
  team: { id: "team-1", name: "Actual team", season: "2026-2027" },
  stats: { memberCount: 1, trainingCount: 6, completedTrainingCount: 3, attendanceRate: 95 },
  members: [{ id: "student-1", name: "Actual student" }],
  coaches: [{ id: "coach-1", name: "Actual coach", role: "教练" }],
};

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach team detail", () => {
  beforeEach(() => {
    mocks.getCoachTeam.mockReset().mockResolvedValue(teamDetail);
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.openPage.mockReset();
    mocks.navigateBack.mockReset();
  });

  it("does not invent a team when the coach scope has no team", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: null,
      stats: { memberCount: 0, trainingCount: 0, completedTrainingCount: 0, attendanceRate: null },
      members: [],
    });
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      state: "empty",
      teamName: "",
      season: "",
      hasTeam: false,
      hasMembers: false,
      heroStats: [
        { label: "在队人数", value: "--", valueClass: "" },
        { label: "累计训练", value: "--", valueClass: "" },
        { label: "出勤率", value: "--", valueClass: "" },
      ],
    });
  });

  it("keeps a real team hero when its member list is empty", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: { id: "team-1", name: "Actual team", season: "2026-2027" },
      stats: { memberCount: 0, trainingCount: 5, completedTrainingCount: 3, attendanceRate: null },
      members: [],
    });
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      hasTeam: true,
      hasMembers: false,
      teamName: "Actual team",
      season: "2026-2027",
      memberEmptyMessage: "近30天暂无执教学员",
      heroStats: [
        { label: "在队人数", value: "0", valueClass: "" },
        { label: "累计训练", value: "3", valueClass: "" },
        { label: "出勤率", value: "--", valueClass: "" },
      ],
    });
  });

  it("uses the BFF's cumulative completed-training metric and only navigates with a real student id", async () => {
    const page = createPageInstance();
    await page.load();
    page.openRadar({ currentTarget: { dataset: { id: "student-1" } } });
    page.openRadar({ currentTarget: { dataset: {} } });
    page.goBack();

    expect(page.data.heroStats).toEqual([
      { label: "在队人数", value: "1", valueClass: "" },
      { label: "累计训练", value: "3", valueClass: "" },
      { label: "出勤率", value: "95%", valueClass: "hero-stat__value--positive" },
    ]);
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/student-radar/index?student=student-1");
    expect(mocks.openPage).toHaveBeenCalledTimes(1);
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
  });

  it("maps only BFF-provided coaches into the C9 coach-card view model", async () => {
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      hasCoaches: true,
      coaches: [{
        id: "coach-1",
        name: "Actual coach",
        initial: "A",
        roleLabel: "教练",
      }],
    });
  });

  it("keeps the real team content visible while an older BFF response has no coach field", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: { id: "team-1", name: "Actual team", season: "2026-2027" },
      stats: { memberCount: 1, trainingCount: 6, completedTrainingCount: 3, attendanceRate: 95 },
      members: [{ id: "student-1", name: "Actual student" }],
    });
    const page = createPageInstance();
    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      hasTeam: true,
      hasCoaches: false,
      coaches: [],
      coachEmptyMessage: "暂未配置队伍教练",
    });
  });

  it("does not request as a non-coach and clears stale values behind a safe error", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.onLoad();
    expect(mocks.getCoachTeam).not.toHaveBeenCalled();

    const page = createPageInstance();
    await page.load();
    mocks.getCoachTeam.mockRejectedValueOnce(new Error("raw upstream error"));
    await page.load();
    expect(page.data).toMatchObject({
      state: "error",
      teamName: "",
      hasTeam: false,
      hasMembers: false,
      members: [],
    });
    expect(page.data.message).not.toContain("raw upstream error");
  });

  it("uses the local Figma navigation and renders the supported C9 coach section declaratively", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).toContain('"status-view"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('class="team-nav"');
    expect(template).toContain('wx:if="{{state !== \'ready\'}}"');
    expect(template).toContain('active="training"');
    expect(template).toContain('class="coaches-section"');
    expect(template).toContain('class="coaches-scroll"');
    expect(template).toContain('wx:for="{{coaches}}"');
    expect(template).toContain('scroll-x enable-flex show-scrollbar="{{false}}"');
    expect(template).toContain('/assets/icons/chevron-left.svg');
    expect(template).not.toMatch(/凤凰山|U10精英队|林教练|主教练|王助教|李体能/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.team-nav\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*content-box/s);
    expect(stylesheet).toContain(".hero-stat__value--positive { color: #10b981; }");
    expect(stylesheet).toContain("gap: 24rpx;");
    expect(stylesheet).toContain(".coach-card { width: 280rpx;");
    expect(controller).not.toContain("app-header");
  });
});
