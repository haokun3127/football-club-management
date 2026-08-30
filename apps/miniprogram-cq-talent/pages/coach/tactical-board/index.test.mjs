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
vi.mock("../../../utils/presentation", () => ({ resolveMenuInset: () => 16, resolveNavInset: () => 0 }));

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
    { studentId: "student-roster-only", displayName: "真实名单新增成员" },
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

  it("uses only current formation and roster facts, and marks the initial GET as saved", async () => {
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
      saveLabel: "已保存",
      readOnly: false,
    });
    expect(page.data.starters).toEqual([expect.objectContaining({ studentId: "student-starter", displayName: "真实首发", positionLabel: "真实位置" })]);
    expect(page.data.substitutes).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-substitute", displayName: "真实替补" }),
      expect.objectContaining({ studentId: "student-roster-only", displayName: "真实名单新增成员" }),
    ]));
    expect(page.data.rosterPlayers).toHaveLength(3);
    expect(page.data.rosterPlayers[0]).toMatchObject({ rosterPx: 34, rosterPy: 339 });
    expect(page.data.rosterPlayers[1]).toMatchObject({ rosterPx: 120, rosterPy: 339 });
  });

  it("lays every roster member into the lower two-row all-player area", () => {
    const page = createPageInstance({
      pitchWidth: 320,
      pitchHeight: 284,
      players: [
        { studentId: "player-1", displayName: "甲一", role: "substitute", x: 0.5, y: 0.8 },
        { studentId: "player-2", displayName: "甲二", role: "substitute", x: 0.5, y: 0.8 },
        { studentId: "player-3", displayName: "甲三", role: "substitute", x: 0.5, y: 0.8 },
        { studentId: "player-4", displayName: "甲四", role: "substitute", x: 0.5, y: 0.8 },
        { studentId: "player-5", displayName: "甲五", role: "substitute", x: 0.5, y: 0.8 },
      ],
    });

    page.refreshViews();

    expect(page.data.rosterPlayers.map((player) => [player.rosterPx, player.rosterPy])).toEqual([
      [34, 339], [120, 339], [206, 339], [292, 339], [34, 431],
    ]);
  });

  it("derives stable Figma-style jersey numbers and roster state from the real roster", async () => {
    const page = createPageInstance();
    await page.onLoad({ eventId: "event-real" });
    await flush();

    expect(page.data.rosterPlayers).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-starter", jerseyNumber: "1", rosterStateLabel: "已上场", rosterToneClass: "c7-roster__avatar--on-field" }),
      expect.objectContaining({ studentId: "student-substitute", jerseyNumber: "2", rosterStateLabel: "候补上场", rosterToneClass: "c7-roster__avatar--candidate" }),
      expect.objectContaining({ studentId: "student-roster-only", jerseyNumber: "3", rosterStateLabel: "候补上场", rosterToneClass: "c7-roster__avatar--candidate" }),
    ]));
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

  it("moves a real starter back to the all-player area when it is dragged below the pitch", () => {
    const page = createPageInstance({
      state: "ready",
      pitchWidth: 320,
      pitchHeight: 284,
      players: board().board.players,
      readOnly: false,
      dirty: false,
      selectedStarterId: "",
    });

    page.onPlayerMove({ currentTarget: { dataset: { id: "student-starter" } }, detail: { x: 120, y: 300, source: "touch" } });

    expect(page.data.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-starter", role: "substitute" }),
    ]));
    expect(page.data.dirty).toBe(true);
  });

  it("moves a real substitute onto the pitch when it is dragged into the field", () => {
    const page = createPageInstance({
      state: "ready",
      pitchWidth: 320,
      pitchHeight: 284,
      players: board().board.players,
      readOnly: false,
      dirty: false,
    });

    page.onSubstituteMove({ currentTarget: { dataset: { id: "student-substitute" } }, detail: { x: 120, y: 160, source: "touch" } });

    expect(page.data.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ studentId: "student-substitute", role: "starter" }),
    ]));
    expect(page.data.dirty).toBe(true);
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

  it("matches the current online C7 tactical-board composition without fixture data or WXML helpers", () => {
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
    expect(template).toContain('>比赛战术板<');
    expect(template).not.toContain('>上半球场 · 下半全部球员<');
    expect(template).not.toContain('阵型与首发位置');
    expect(template).toContain('src="/assets/icons/chevron-left.svg"');
    expect(template).not.toContain('src="/assets/icons/c11-arrow-left.svg"');
    expect(template).not.toContain('class="c7-header__share"');
    expect(template).not.toContain('c7-pitch__circle');
    expect(template).toContain('class="c7-pitch__halfway"');
    expect(template).toContain('class="c7-pitch__boundary"');
    expect(template).toContain('class="c7-pitch__hint">拖拽球员到球场上场</view>');
    expect(template).toContain('class="c7-player__number">{{item.jerseyNumber}}</view>');
    expect(template).not.toContain('class="c7-toolbar"');
    expect(template).not.toContain("暂未开放");
    expect(template).not.toContain('<role-tabbar');
    expect(template).toContain('class="c7-context-label"');
    expect(template).toContain('class="c7-formation-row"');
    expect(template).toContain('>本场比赛阵型<');
    expect(template).not.toContain('class="c7-match-row"');
    expect(template).not.toContain('class="c7-match-title">{{eventTitle}}</view>');
    expect(template).not.toContain('class="{{saveToneClass}}">{{saveLabel}}</view>');
    expect(template).toContain('class="c7-formation-picker"');
    expect(template).toContain('>{{formationLabel}}</view>');
    expect(template).toContain('src="/assets/icons/chevron-right.svg"');
    expect(template).not.toContain('>›<');
    expect(template).toContain('id="c7-workspace"');
    expect(template).toContain('class="c7-roster"');
    expect(template).toContain('class="c7-roster__grid"');
    expect(template).toContain('class="c7-roster__avatar {{item.rosterToneClass}}">{{item.jerseyNumber}}</view>');
    expect(template).toContain('class="c7-roster__name"');
    expect(template).toContain('class="c7-roster__status">{{item.rosterStateLabel}}</view>');
    expect(template).toContain('>全部球员<');
    expect(template).toContain('class="c7-actions"');
    expect(template).toContain('bindtap="swapSubstitute"');
    expect(template).toContain('bindchange="onSubstituteMove"');
    expect(template).not.toContain('c7-player__name');
    expect(template).not.toContain('c7-player__position');
    expect(template).not.toContain('c7-readonly');
    expect(template).not.toContain("U10发展队");
    expect(template).not.toContain("梓睿");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(pageConfig).not.toContain('"role-tabbar"');
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).not.toContain('"submit-bar"');
    expect(pageConfig).toContain('"navigationBarTitleText": "比赛战术板"');
    expect(stylesheet).toMatch(/\.c7-header\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*margin:\s*0)(?=[^}]*border-radius:\s*0)/s);
    expect(stylesheet).toMatch(/\.c7-header__title\s*\{[^}]*font-size:\s*36rpx[^}]*line-height:\s*44rpx/s);
    expect(stylesheet).not.toContain('.c7-header__subtitle');
    expect(stylesheet).toMatch(/\.c7-pitch\s*\{[^}]*left:\s*32rpx[^}]*width:\s*calc\(100vw - 64rpx\)[^}]*height:\s*568rpx[^}]*background:\s*#278a53/s);
    expect(stylesheet).toMatch(/\.c7-formation-row\s*\{[^}]*margin:\s*8rpx\s+32rpx\s+0/s);
    expect(stylesheet).toMatch(/\.c7-formation-picker\s*\{[^}]*width:\s*144rpx[^}]*height:\s*72rpx/s);
    expect(stylesheet).toMatch(/\.c7-formation-chevron\s*\{[^}]*width:\s*24rpx[^}]*height:\s*24rpx/s);
    expect(stylesheet).toMatch(/\.c7-player\s*\{[^}]*width:\s*80rpx[^}]*height:\s*80rpx/s);
    expect(stylesheet).toMatch(/\.c7-player__badge\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/s);
    expect(stylesheet).toMatch(/\.c7-player__number\s*\{[^}]*font-size:\s*22rpx/s);
    expect(stylesheet).toMatch(/\.c7-workspace\s*\{[^}]*height:\s*1040rpx/s);
    expect(stylesheet).toMatch(/\.c7-roster\s*\{[^}]*top:\s*580rpx[^}]*height:\s*444rpx[^}]*background:\s*transparent/s);
    expect(stylesheet).toMatch(/\.c7-roster__grid\s*\{/s);
    expect(stylesheet).toMatch(/\.c7-roster__player\s*\{[^}]*width:\s*96rpx[^}]*height:\s*160rpx/s);
    expect(stylesheet).toMatch(/\.c7-roster__avatar\s*\{[^}]*width:\s*96rpx[^}]*height:\s*96rpx/s);
    expect(stylesheet).toContain('.c7-roster__avatar--candidate');
    expect(stylesheet).toContain('.c7-roster__avatar--on-field');
    expect(stylesheet).toMatch(/\.c7-actions\s*\{[^}]*height:\s*96rpx[^}]*margin:\s*84rpx\s+32rpx\s+0/s);
    expect(controller).toContain("const PLAYER_MARKER_RADIUS = 20");
    expect(controller).toContain("PITCH_LEFT_IN_WORKSPACE");
  });
});
