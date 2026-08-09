import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClubCoachTeam: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getClubCoachTeam: mocks.getClubCoachTeam }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = {
  navigateBack: vi.fn(),
  showToast: vi.fn(),
};

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const controller = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data, ...data },
  };
  instance.setData = (patch) => {
    instance.data = { ...instance.data, ...patch };
  };
  return instance;
}

const team = {
  teamName: "真实队伍",
  teamChips: ["17名球员", "2支队伍", "2020年成立"],
  teamGoal: "不应展示的目标",
  coaches: [{ id: "coach-1", name: "真实教练", role: "不应展示的角色", bio: "真实教练简介" }],
};

describe("parent coach team", () => {
  beforeEach(() => {
    mocks.getClubCoachTeam.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("maps only real team, count, coach-name, and bio fields", async () => {
    mocks.getClubCoachTeam.mockResolvedValue(team);
    const page = createPageInstance();

    await page.loadCoachTeam();

    expect(page.data).toMatchObject({
      state: "ready",
      teamName: "真实队伍",
      teamCounts: ["17名球员", "2支队伍"],
      hasTeamCounts: true,
      hasCoaches: true,
      coaches: [{ id: "coach-1", name: "真实教练", surname: "真", bio: "真实教练简介", hasBio: true }],
    });
    expect(page.data.coaches[0]).not.toHaveProperty("role");
    expect(page.data.coaches[0]).not.toHaveProperty("ringColor");
    expect(page.data.teamCounts).not.toContain("2020年成立");
  });

  it("shows loading, empty, and error states without toast-only fallbacks", async () => {
    let resolveTeam;
    mocks.getClubCoachTeam.mockReturnValue(new Promise((resolve) => {
      resolveTeam = resolve;
    }));
    const loadingPage = createPageInstance();
    const loading = loadingPage.loadCoachTeam();

    expect(loadingPage.data).toMatchObject({ state: "loading", message: "正在加载教练团队" });
    resolveTeam(null);
    await loading;
    expect(loadingPage.data).toMatchObject({ state: "empty", message: "暂无可展示的教练团队" });

    mocks.getClubCoachTeam.mockRejectedValue(new Error("network unavailable"));
    const errorPage = createPageInstance();
    await errorPage.loadCoachTeam();

    expect(errorPage.data).toMatchObject({
      state: "error",
      message: "教练团队加载失败，请点击重试",
      hasCoaches: false,
    });
    expect(globalThis.wx.showToast).not.toHaveBeenCalled();
  });

  it("keeps a real team visible while using an empty coach state when no coaches exist", async () => {
    mocks.getClubCoachTeam.mockResolvedValue({ ...team, coaches: [] });
    const page = createPageInstance();

    await page.loadCoachTeam();

    expect(page.data).toMatchObject({
      state: "ready",
      teamName: "真实队伍",
      hasCoaches: false,
      emptyMessage: "暂无可展示的教练",
    });
  });

  it("does not expose default teams, roles, tenure, goals, or direct-contact actions", () => {
    expect(template).toContain('state="{{state}}"');
    expect(template).toContain('bindaction="loadCoachTeam"');
    expect(template).toContain('wx:if="{{item.hasBio}}"');
    expect(template).not.toContain('bindtap="contactCoach"');
    expect(template).not.toContain("微信联系");
    expect(template).not.toContain("本赛季目标");
    expect(template).not.toContain("主教练");
    expect(template).not.toContain("执教年限");
    expect(template).not.toContain("凤凰山足球俱乐部");
    expect(template).not.toContain("重庆天才足球俱乐部");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("contactCoach(");
    expect(controller).not.toContain("重庆天才足球俱乐部");
    expect(controller).not.toContain("teamGoal");
  });
});
