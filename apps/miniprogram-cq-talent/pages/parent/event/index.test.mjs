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
      .mockResolvedValueOnce(detail({ type: "match", title: "真实完赛", status: "completed" }))
      .mockResolvedValueOnce(detail({ type: "other", title: "真实活动" }));
    const matchPage = createPageInstance();

    await matchPage.load("match-event");

    // 设计稿语义：未开始的比赛显示 0:0
    expect(matchPage.data.detail).toMatchObject({
      type: "match",
      homeTeam: "主队待确认",
      awayTeam: "对手待确认",
      scoreText: "0:0",
    });

    const finishedPage = createPageInstance();
    await finishedPage.load("finished-match-event");

    // 已结束但比分未录入：保持如实占位，不伪造比分
    expect(finishedPage.data.detail).toMatchObject({
      type: "match",
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

  it("projects only API-backed match events into the parent match detail", async () => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match",
      title: "真实比赛",
      matchEvents: [
        { id: "match-event-1", type: "goal", studentId: "student-1", studentName: "小明", minute: 18, note: "右脚推射" },
        { id: "match-event-2", type: "own_goal", studentId: "student-1", studentName: "小明", minute: 42 },
      ],
    }));
    const page = createPageInstance();

    await page.load("match-event");

    expect(page.data.detail).toMatchObject({
      matchEvents: [
        { id: "match-event-1", label: "进球", studentName: "小明", minuteLabel: "第 18 分钟" },
        { id: "match-event-2", label: "乌龙球", studentName: "小明", minuteLabel: "第 42 分钟" },
      ],
      hasMatchEvents: true,
    });
  });

  it("uses the matching event player name and the V7 icon-plus-minute event rows", async () => {
    mocks.getParentActivityDetail.mockResolvedValueOnce(detail({
      type: "match",
      participants: [{ studentId: "student-1", name: "学员", status: "present" }],
      matchEvents: [{ id: "match-event-1", type: "goal", studentId: "student-1", studentName: "小明", minute: 18 }],
    }));
    const page = createPageInstance();

    await page.load("match-event");

    expect(page.data.detail.childName).toBe("小明");
    expect(page.data.detail.matchEvents[0]).toMatchObject({ icon: "⚽", minuteLabel: "第 18 分钟" });
    expect(template).toContain("match-events-title");
    expect(template).toContain("{{item.icon}}");
    expect(template).toContain("{{item.label}}");
    expect(template).toContain("{{item.minuteLabel}}");
    expect(styles).toContain(".match-event-row__icon");
    expect(styles).not.toMatch(/\.match-event-row__name\s*\{\s*display:\s*none\s*;\s*\}/);
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
    expect(template).toContain("detail.hasMatchEvents");
    expect(template).toContain("detail.matchEvents");
  });

  it("keeps the P2 navigation aligned to the live 24px back slot", () => {
    expect(styles).toContain(".p2-nav__back { display: flex; align-items: center; justify-content: center; width: 48rpx; height: 80rpx; }");
    expect(styles).toContain(".p2-nav__back image { width: 48rpx; height: 48rpx; }");
    expect(styles).toContain("button.p2-nav__action { width: auto; min-width: 0; margin: 0; padding: 0; border: none; background: transparent; line-height: 34rpx; }");
  });

  it("uses the V7 full-screen match detail hierarchy", () => {
    expect(template).toContain("match-summary");
    expect(template).toContain("match-summary__venue");
    expect(template).toContain("{{detail.matchResultLabel}}");
    expect(template).toContain("{{detail.childName}}的比赛数据");
    expect(template).toContain("match-note");
    expect(template).toContain('wx:if="{{!detail || detail.type !== \'match\'}}"');
    expect(styles).toContain(".match-summary");
    expect(styles).toContain(".match-note");
  });
});
