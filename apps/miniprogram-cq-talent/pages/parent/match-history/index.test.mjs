import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getParentCalendar: vi.fn(),
  getParentChildren: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getParentCalendar: mocks.getParentCalendar,
  getParentChildren: mocks.getParentChildren,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/date", () => ({ resolveParentPageDate: () => "2026-08-28" }));
vi.mock("../../../utils/presentation", () => ({
  formatShortDate: (value) => value.slice(5, 10).replace("-", "月") + "日",
  formatTimeRange: () => "18:00–19:30",
  resolveMenuInset: () => 0,
  resolveNavInset: () => 0,
}));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};

await import("./index.ts");

function createPageInstance() {
  const instance = {
    ...pageDefinition,
    data: { ...pageDefinition.data },
    setData(patch) {
      this.data = { ...this.data, ...patch };
    },
  };
  return instance;
}

describe("parent match history", () => {
  beforeEach(() => {
    mocks.requireRole.mockReset().mockReturnValue({ role: "parent", currentStudentId: "student-2" });
    mocks.getParentChildren.mockReset().mockResolvedValue([
      { id: "student-1", name: "第一位学员", teams: [] },
      { id: "student-2", name: "第二位学员", teams: [] },
    ]);
    mocks.getParentCalendar.mockReset().mockResolvedValue([]);
    mocks.openPage.mockReset();
  });

  it("filters to the selected child and sorts matches newest first", async () => {
    mocks.getParentCalendar.mockResolvedValue([
      { id: "match-old", type: "match", title: "较早比赛", startsAt: "2026-08-20T10:00:00.000Z", endsAt: "2026-08-20T11:30:00.000Z", venue: "南岸球场", teamName: "U10精英队", status: "completed", childIds: ["student-2"], match: { opponentName: "江北青训", homeScore: 1, awayScore: 0 } },
      { id: "other-child", type: "match", title: "另一位学员比赛", startsAt: "2026-08-24T10:00:00.000Z", endsAt: "2026-08-24T11:30:00.000Z", venue: "北碚球场", status: "completed", childIds: ["student-1"], match: { opponentName: "不应显示", homeScore: 9, awayScore: 9 } },
      { id: "match-new", type: "match", title: "最新比赛", startsAt: "2026-08-25T10:00:00.000Z", endsAt: "2026-08-25T11:30:00.000Z", venue: "渝北球场", teamName: "U10精英队", status: "completed", childIds: ["student-2"], match: { opponentName: "渝中青训", homeScore: 2, awayScore: 1 } },
    ]);
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows.map((row) => row.id)).toEqual(["match-new", "match-old"]);
    expect(page.data.rows[0]).toMatchObject({
      title: "最新比赛",
      opponentLabel: "对手：渝中青训",
      scoreLabel: "2:1",
      statusLabel: "已完成",
    });
    expect(page.data.rows).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "other-child" })]));
  });

  it("uses an explicit unavailable label when the real match has no score", async () => {
    mocks.getParentCalendar.mockResolvedValue([
      { id: "scheduled-match", type: "match", title: "待开始比赛", startsAt: "2026-08-27T10:00:00.000Z", endsAt: "2026-08-27T11:30:00.000Z", venue: "大渡口球场", status: "scheduled", childIds: ["student-2"], match: { opponentName: "沙坪坝青训", status: "scheduled" } },
    ]);
    const page = createPageInstance();

    await page.load();

    expect(page.data.rows[0]).toMatchObject({ scoreLabel: "比分待同步", statusLabel: "待开始" });
    expect(page.data.rows[0].title).not.toContain("示例");
  });

  it("opens the existing parent match detail route", async () => {
    mocks.getParentCalendar.mockResolvedValue([
      { id: "match-1", type: "match", title: "真实比赛", startsAt: "2026-08-27T10:00:00.000Z", venue: "球场", status: "completed", childIds: ["student-2"] },
    ]);
    const page = createPageInstance();
    await page.load();

    page.openMatch({ currentTarget: { dataset: { id: "match-1" } } });

    expect(mocks.openPage).toHaveBeenCalledWith("/pages/parent/event/index?id=match-1");
  });

  it("keeps the WXML free of JavaScript array method calls", () => {
    const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
  });
});
