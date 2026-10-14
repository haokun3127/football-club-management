import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachMatchDetail: vi.fn(),
  recordCoachMatch: vi.fn(),
  requireRole: vi.fn(),
  createIdempotencyKey: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachMatchDetail: mocks.getCoachMatchDetail,
  recordCoachMatch: mocks.recordCoachMatch,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/idempotency", () => ({ createIdempotencyKey: mocks.createIdempotencyKey }));

let pageDefinition;
globalThis.Page = (definition) => {
  pageDefinition = definition;
  return definition;
};
globalThis.wx = { navigateBack: vi.fn(), showToast: vi.fn() };

await import("./index.ts");

const template = readFileSync(new URL("./index.wxml", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("./index.wxss", import.meta.url), "utf8");
const pageConfig = readFileSync(new URL("./index.json", import.meta.url), "utf8");

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

const detail = {
  event: { id: "event-match-1", type: "match", title: "周末友谊赛", status: "scheduled", teamName: "U11 精英队" },
  roster: [{ studentId: "student-1", name: "罗小明", status: "confirmed" }],
  match: { id: "match-1", matchType: "league", status: "scheduled", opponentName: "山城青训", homeScore: 0, awayScore: 0 },
  events: [],
};

describe("coach match editor", () => {
  beforeEach(() => {
    mocks.getCoachMatchDetail.mockReset().mockResolvedValue(detail);
    mocks.recordCoachMatch.mockReset().mockResolvedValue({ match: { ...detail.match } });
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.createIdempotencyKey.mockReset().mockReturnValue("match-summary-key");
    globalThis.wx.navigateBack.mockReset();
    globalThis.wx.showToast.mockReset();
  });

  it("loads the real match summary into a full-screen editor", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-match-1" });

    expect(mocks.getCoachMatchDetail).toHaveBeenCalledWith("event-match-1");
    expect(page.data).toMatchObject({
      state: "ready",
      eventId: "event-match-1",
      opponentName: "山城青训",
      homeScore: "0",
      awayScore: "0",
      matchType: "league",
      status: "scheduled",
    });
  });

  it("validates scores, saves through the real API, then verifies with a fresh readback", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-match-1" });
    page.onOpponentInput({ detail: { value: "渝北青训" } });
    page.onHomeScoreInput({ detail: { value: "2" } });
    page.onAwayScoreInput({ detail: { value: "1" } });
    page.onStatusChange({ detail: { value: "completed" } });
    mocks.getCoachMatchDetail.mockResolvedValueOnce({
      ...detail,
      match: { ...detail.match, status: "completed", opponentName: "渝北青训", homeScore: 2, awayScore: 1 },
    });

    await page.save();

    expect(mocks.recordCoachMatch).toHaveBeenCalledWith(expect.objectContaining({
      eventId: "event-match-1",
      matchType: "league",
      status: "completed",
      opponentName: "渝北青训",
      homeScore: 2,
      awayScore: 1,
    }));
    expect(mocks.getCoachMatchDetail).toHaveBeenCalledTimes(2);
    expect(globalThis.wx.navigateBack).toHaveBeenCalledWith({ delta: 1 });
  });

  it("allows a completed formal match with both scores unrecorded", async () => {
    const page = createPageInstance(); await page.onLoad({ eventId: "event-match-1" });
    page.onStatusChange({ detail: { value: "completed" } }); page.onHomeScoreInput({ detail: { value: "" } }); page.onAwayScoreInput({ detail: { value: "" } });
    mocks.getCoachMatchDetail.mockResolvedValueOnce({ ...detail, match: { ...detail.match, status: "completed", homeScore: undefined, awayScore: undefined } });
    await page.save(); expect(mocks.recordCoachMatch).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    expect(mocks.recordCoachMatch.mock.calls[0][0]).not.toHaveProperty("homeScore"); expect(page.data.hasSaveError).toBe(false);
  });

  it("rejects incomplete completed scores without writing", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-match-1" });
    page.onStatusChange({ detail: { value: "completed" } });
    page.onHomeScoreInput({ detail: { value: "2" } });
    page.onAwayScoreInput({ detail: { value: "" } });

    await page.save();

    expect(mocks.recordCoachMatch).not.toHaveBeenCalled();
    expect(page.data.hasSaveError).toBe(true);
    expect(page.data.saveError).toContain("比分");
  });

  it("is a full-screen page with no method calls in WXML", () => {
    expect(pageConfig).toContain('"navigationStyle": "custom"');
    expect(template).toContain('<app-header theme="soft" title="编辑比赛" title-align="left" show-back />');
    expect(template).toContain('<role-tabbar role="coach" active="schedule" />');
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toContain(".match-edit-page");
  });
});
