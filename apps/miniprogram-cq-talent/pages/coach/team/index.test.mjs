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
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

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
  stats: { memberCount: 1, trainingCount: 6, attendanceRate: 95 },
  members: [{ id: "student-1", name: "Actual student" }],
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
      stats: { memberCount: 0, trainingCount: 0, attendanceRate: null },
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
        { label: "在队人数", value: "--" },
        { label: "近30天训练", value: "--" },
        { label: "出勤率", value: "--" },
      ],
    });
  });

  it("keeps a real team hero when its member list is empty", async () => {
    mocks.getCoachTeam.mockResolvedValueOnce({
      team: { id: "team-1", name: "Actual team", season: "2026-2027" },
      stats: { memberCount: 0, trainingCount: 5, attendanceRate: null },
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
        { label: "在队人数", value: "0" },
        { label: "近30天训练", value: "5" },
        { label: "出勤率", value: "--" },
      ],
    });
  });

  it("uses the BFF's near-30-day metrics and only navigates with a real student id", async () => {
    const page = createPageInstance();
    await page.load();
    page.openRadar({ currentTarget: { dataset: { id: "student-1" } } });
    page.openRadar({ currentTarget: { dataset: {} } });
    page.goBack();

    expect(page.data.heroStats).toEqual([
      { label: "在队人数", value: "1" },
      { label: "近30天训练", value: "6" },
      { label: "出勤率", value: "95%" },
    ]);
    expect(mocks.openPage).toHaveBeenCalledWith("/pages/coach/student-radar/index?student=student-1");
    expect(mocks.openPage).toHaveBeenCalledTimes(1);
    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
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

  it("uses the local Figma navigation and removes unsupported content declaratively", () => {
    expect(pageConfig).toContain('"role-tabbar"');
    expect(pageConfig).toContain('"status-view"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(template).toContain('class="team-nav"');
    expect(template).toContain('active="training"');
    expect(template).toContain('/assets/icons/chevron-left.svg');
    expect(template).not.toMatch(/凤凰山|U10精英队|林教练|主教练|助理|体能/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.team-nav\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*border-box/s);
    expect(controller).not.toContain("app-header");
  });
});
