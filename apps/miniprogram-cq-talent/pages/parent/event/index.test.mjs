import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getParentActivityDetail: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getParentActivityDetail: mocks.getParentActivityDetail }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({
  activityStatus: (status) => ({ label: status === "scheduled" ? "待开始" : status, tone: "brand" }),
  activityTypeLabel: (type) => type === "training" ? "训练" : type === "match" ? "比赛" : "活动",
  resolveMenuActionTop: () => 24,
  resolveMenuInset: () => 16,
  resolveNavInset: () => 20,
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
const styles = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
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

function detail(overrides = {}) {
  return {
    id: "event-1",
    type: "training",
    title: "真实训练",
    status: "scheduled",
    participants: [],
    fields: [],
    sections: [],
    pending: [],
    ...overrides,
  };
}

describe("parent activity detail", () => {
  beforeEach(() => {
    mocks.getParentActivityDetail.mockReset();
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent" });
  });

  it("keeps a rejected detail request in the route error state", async () => {
    mocks.getParentActivityDetail.mockRejectedValue({ code: "not_found", message: "活动不存在" });
    const page = createPageInstance();

    await page.load("missing-event");

    expect(page.data.state).toBe("error");
    expect(page.data.detail).toBeNull();
    expect(page.data.message).toBe("活动不存在");
  });

  it("derives missing match and other values as unavailable instead of Figma sample facts", async () => {
    mocks.getParentActivityDetail
      .mockResolvedValueOnce(detail({ type: "match", title: "真实比赛" }))
      .mockResolvedValueOnce(detail({ type: "other", title: "真实活动" }));
    const matchPage = createPageInstance();

    await matchPage.load("match-event");

    expect(matchPage.data.detail).toMatchObject({
      type: "match",
      homeTeam: "主队待确认",
      awayTeam: "对手待确认",
      scoreText: "比分待确认",
    });

    const otherPage = createPageInstance();
    await otherPage.load("other-event");

    expect(otherPage.data.detail).toMatchObject({
      type: "other",
      otherDescription: "活动说明待同步",
      otherNotice: "注意事项待同步",
    });
  });

  it("keeps the three P2 hierarchies page-owned and method-free in WXML", () => {
    expect(template).toContain("detail.type === 'training'");
    expect(template).toContain("detail.type === 'match'");
    expect(template).toContain('wx:elif="{{detail}}"');
    expect(template).toContain("{{detail.otherNotice}}");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(template).not.toContain("线下到场后检查身份完成确认");
    expect(controller).not.toContain('"天才队"');
    expect(controller).not.toContain('"0 : 0"');
    expect(styles).toContain(".training-hero");
    expect(styles).toContain(".match-hero");
    expect(styles).toContain(".other-hero");
  });
});
