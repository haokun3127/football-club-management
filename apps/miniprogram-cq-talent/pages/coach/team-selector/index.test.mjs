import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTrainingProjectTree: vi.fn(),
  getCoachTeam: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachTrainingProjectTree: mocks.getCoachTrainingProjectTree,
  getCoachTeam: mocks.getCoachTeam,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 20 }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = {
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  navigateBack: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach team selector", () => {
  beforeEach(() => {
    mocks.getCoachTrainingProjectTree.mockReset().mockResolvedValue({
      groups: [], projects: [], pending: [],
      team: { id: "team-u11", name: "U11 Red", season: "2026-2027赛季" },
      teamOptions: [
        { id: "team-u11", name: "U11 Red", season: "2026-2027赛季" },
        { id: "team-u12", name: "U12 Blue", season: "2026-2027赛季" },
      ],
    });
    mocks.getCoachTeam.mockReset().mockImplementation(async (teamId) => ({
      team: { id: teamId, name: teamId === "team-u12" ? "U12 Blue" : "U11 Red", season: "2026-2027赛季" },
      stats: { memberCount: teamId === "team-u12" ? 20 : 18, trainingCount: 0, completedTrainingCount: 0, attendanceRate: null },
      members: [],
    }));
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    globalThis.wx.getStorageSync.mockReset().mockReturnValue("");
    globalThis.wx.setStorageSync.mockReset();
    globalThis.wx.navigateBack.mockReset();
  });

  it("lists only real training-context teams and restores an assigned team id", async () => {
    globalThis.wx.getStorageSync.mockReturnValue("team-u12");
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "ready",
      teams: [
        { id: "team-u11", name: "U11 Red", metaLabel: "2026-2027赛季 · 18名学员 · 后台已分配", isSelected: false },
        { id: "team-u12", name: "U12 Blue", metaLabel: "2026-2027赛季 · 20名学员 · 当前选择", isSelected: true },
      ],
    });

    globalThis.wx.getStorageSync.mockReturnValue("team-no-longer-assigned");
    const fallbackPage = createPageInstance();
    await fallbackPage.load();
    expect(fallbackPage.data.teams[0]).toMatchObject({ name: "U11 Red", isSelected: true });
  });

  it("persists a selected assigned-team id locally and returns to training management", () => {
    const page = createPageInstance();

    page.selectTeam({ currentTarget: { dataset: { id: "team-u12" } } });

    expect(globalThis.wx.setStorageSync).toHaveBeenCalledWith("coach-training-team-id", "team-u12");
    expect(globalThis.wx.navigateBack).toHaveBeenCalledTimes(1);
  });

  it("uses a full-screen back flow without team-management actions or font-dependent selected icons", () => {
    expect(template).toContain('bindtap="goBack"');
    expect(template).toContain('bindtap="selectTeam"');
    expect(template).toContain("选择训练球队");
    expect(template).toContain("仅显示后台已分配队伍");
    expect(template).toContain('/assets/icons/c4-1-check.svg');
    expect(template).not.toContain('class="team-option__check">✓</view>');
    expect(template).not.toMatch(/新建|编辑|删除/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.team-selector-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)/s);
  });

  it("keeps the selector usable when a team detail count is unavailable", async () => {
    mocks.getCoachTeam.mockRejectedValue(new Error("detail unavailable"));
    const page = createPageInstance();

    await page.load();

    expect(page.data.teams[0].metaLabel).toBe("2026-2027赛季 · 当前选择");
  });
});
