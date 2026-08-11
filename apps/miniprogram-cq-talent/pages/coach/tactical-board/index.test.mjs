import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachTacticalBoard: vi.fn(),
  getTacticalBoardFormations: vi.fn(),
  saveCoachTacticalBoard: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({
  getCoachTacticalBoard: mocks.getCoachTacticalBoard,
  getTacticalBoardFormations: mocks.getTacticalBoardFormations,
  saveCoachTacticalBoard: mocks.saveCoachTacticalBoard,
}));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

globalThis.wx = {
  navigateBack: mocks.navigateBack,
  showToast: mocks.showToast,
  createSelectorQuery: () => ({
    select: () => ({
      boundingClientRect: (callback) => {
        callback({ width: 320, height: 500 });
        return { exec: () => {} };
      },
    }),
  }),
};

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

const formations = [{
  name: "formation-real",
  label: "真实阵型",
  positions: [{ positionLabel: "真实位置", x: 0.5, y: 0.5 }],
}];

const board = (overrides = {}) => ({
  event: { id: "event-real", title: "真实比赛", status: "scheduled" },
  board: {
    id: "board-real",
    eventId: "event-real",
    formationName: "formation-real",
    players: [
      { studentId: "student-starter", displayName: "旧名称不可展示", role: "starter", positionLabel: "真实位置", x: 0.5, y: 0.5 },
      { studentId: "student-substitute", displayName: "替补旧名称", role: "substitute", x: 0.4, y: 0.7 },
      { studentId: "not-on-roster", displayName: "不应展示", role: "starter", x: 0.1, y: 0.1 },
    ],
    updatedAt: "2026-08-10T08:00:00.000Z",
  },
  roster: [
    { studentId: "student-starter", displayName: "真实首发" },
    { studentId: "student-substitute", displayName: "真实替补" },
  ],
  saved: true,
  readOnly: false,
  ...overrides,
});

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("C7 coach tactical board MVP", () => {
  beforeEach(() => {
    mocks.getCoachTacticalBoard.mockReset().mockResolvedValue(board());
    mocks.getTacticalBoardFormations.mockReset().mockResolvedValue(formations);
    mocks.saveCoachTacticalBoard.mockReset().mockResolvedValue(board());
    mocks.requireRole.mockReset().mockReturnValue({ role: "coach" });
    mocks.navigateBack.mockReset();
    mocks.showToast.mockReset();
  });

  it("requires a coach and a non-empty eventId before either GET", async () => {
    const missingPage = createPageInstance();
    await missingPage.onLoad({ id: "legacy-event" });
    expect(missingPage.data).toMatchObject({ state: "empty", eventId: "" });
    expect(mocks.getTacticalBoardFormations).not.toHaveBeenCalled();
    expect(mocks.getCoachTacticalBoard).not.toHaveBeenCalled();

    mocks.requireRole.mockReturnValue(null);
    const guestPage = createPageInstance();
    await guestPage.onLoad({ eventId: "event-real" });
    expect(mocks.getTacticalBoardFormations).not.toHaveBeenCalled();
    expect(mocks.getCoachTacticalBoard).not.toHaveBeenCalled();
  });

  it("uses only current formation and roster facts, and marks the initial GET as loaded", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-real" });
    await flush();

    expect(mocks.getTacticalBoardFormations).toHaveBeenCalledTimes(1);
    expect(mocks.getCoachTacticalBoard).toHaveBeenCalledWith("event-real");
    expect(page.data).toMatchObject({
      state: "ready",
      eventId: "event-real",
      eventTitle: "真实比赛",
      formationLabel: "真实阵型",
      saveLabel: "已载入",
      readOnly: false,
    });
    expect(page.data.starters).toEqual([expect.objectContaining({ studentId: "student-starter", displayName: "真实首发", positionLabel: "真实位置" })]);
    expect(page.data.substitutes).toEqual([expect.objectContaining({ studentId: "student-substitute", displayName: "真实替补" })]);
  });

  it("does not let an old success or old failure overwrite the newer board", async () => {
    let resolveOldBoard;
    mocks.getCoachTacticalBoard
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldBoard = resolve; }))
      .mockResolvedValueOnce(board({ event: { id: "event-current", title: "当前比赛", status: "scheduled" }, board: { ...board().board, eventId: "event-current" } }));
    const page = createPageInstance();
    const oldLoad = page.onLoad({ eventId: "event-old" });
    await page.onLoad({ eventId: "event-current" });
    resolveOldBoard(board({ event: { id: "event-old", title: "过期比赛", status: "scheduled" }, board: { ...board().board, eventId: "event-old" } }));
    await oldLoad;
    await flush();
    expect(page.data).toMatchObject({ eventId: "event-current", eventTitle: "当前比赛", state: "ready" });

    let rejectOldBoard;
    mocks.getCoachTacticalBoard.mockReset()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOldBoard = reject; }))
      .mockResolvedValueOnce(board({ event: { id: "event-current-2", title: "当前比赛二", status: "scheduled" }, board: { ...board().board, eventId: "event-current-2" } }));
    const oldFailure = page.onLoad({ eventId: "event-old-failure" });
    await page.onLoad({ eventId: "event-current-2" });
    rejectOldBoard(new Error("old board failed"));
    await oldFailure;
    await flush();
    expect(page.data).toMatchObject({ eventId: "event-current-2", eventTitle: "当前比赛二", state: "ready" });
  });

  it("blocks every mutating action in read-only state", async () => {
    const page = createPageInstance({
      state: "ready",
      eventId: "event-real",
      formations,
      formationIndex: 0,
      players: board().board.players,
      readOnly: true,
      dirty: false,
      selectedStarterId: "",
    });
    page.onFormationChange({ detail: { value: 0 } });
    page.selectStarter({ currentTarget: { dataset: { id: "student-starter" } } });
    page.swapSubstitute({ currentTarget: { dataset: { id: "student-substitute" } } });
    page.onPlayerMove({ currentTarget: { dataset: { id: "student-starter" } }, detail: { x: 40, y: 40, source: "touch" } });
    page.resetBoard();
    await page.saveBoard();

    expect(page.data).toMatchObject({ dirty: false, selectedStarterId: "" });
    expect(mocks.saveCoachTacticalBoard).not.toHaveBeenCalled();
  });

  it("serializes save, labels only a successful PUT as saved, and preserves dirty edits on failure", async () => {
    let resolveSave;
    mocks.saveCoachTacticalBoard.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
    const page = createPageInstance({
      state: "ready",
      eventId: "event-real",
      formations,
      formationIndex: 0,
      players: board().board.players,
      dirty: true,
      readOnly: false,
      saveLabel: "未保存",
    });
    const pendingSave = page.saveBoard();
    page.saveBoard();
    expect(mocks.saveCoachTacticalBoard).toHaveBeenCalledTimes(1);
    resolveSave(board());
    await pendingSave;
    expect(page.data).toMatchObject({ dirty: false, saveLabel: "已保存" });

    mocks.saveCoachTacticalBoard.mockRejectedValueOnce(new Error("raw backend error"));
    page.setData({ dirty: true, saveLabel: "未保存" });
    await page.saveBoard();
    expect(page.data).toMatchObject({ dirty: true, saveLabel: "未保存" });
    expect(mocks.showToast).toHaveBeenCalledWith({ title: "保存失败，未保存的调整已保留", icon: "none" });
  });

  it("keeps page-owned Figma structure without legacy APIs, samples, or WXML helpers", () => {
    expect(controller).toContain('requireRole("coach")');
    expect(controller).not.toContain("query?.id");
    expect(controller).not.toContain("readableError");
    expect(template).not.toContain("app-header");
    expect(template).not.toContain("status-chip");
    expect(template).not.toContain("submit-bar");
    expect(template).not.toContain("formations[formationIndex]");
    expect(template).not.toMatch(/wx:else\s+wx:for=/);
    expect(template).toContain('<block wx:if="{{!readOnly}}">');
    expect(template).toContain('<block wx:else>');
    expect(template).not.toContain('c7-pitch__circle');
    expect(template).not.toContain('c7-pitch__box');
    expect(template).not.toContain('c7-player__name');
    expect(template).not.toContain('c7-player__position');
    expect(template).not.toContain("U10发展队");
    expect(template).not.toContain("梓睿");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).not.toContain('"submit-bar"');
    expect(stylesheet).toMatch(/\.c7-header\s*\{[^}]*height:\s*124rpx/s);
    expect(stylesheet).toMatch(/\.c7-pitch\s*\{[^}]*height:\s*860rpx/s);
    expect(stylesheet).not.toContain("box-shadow");
    expect(stylesheet).toMatch(/\.c7-player\s*\{[^}]*width:\s*80rpx[^}]*height:\s*80rpx/s);
    expect(stylesheet).toMatch(/\.c7-player__badge\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/s);
    expect(controller).toContain("this.data.pitchWidth, 20");
    expect(controller).toContain("this.data.pitchHeight, 20");
  });
});
