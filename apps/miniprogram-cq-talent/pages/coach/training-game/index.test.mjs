import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getTrainingGames: vi.fn(),
  getTrainingGame: vi.fn(),
  createTrainingGame: vi.fn(),
  saveTrainingGame: vi.fn(),
  requireRole: vi.fn(),
}));
vi.mock("../../../utils/api", () => mocks);
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/config", () => ({
  RUNTIME_ENV: "develop",
  environmentStorageKey: (key) => `test:${key}`,
}));
let definition;
globalThis.Page = (value) => {
  definition = value;
};
await import("./index.ts");
const storage = new Map();
let current;
const draftGame = () => ({
  id: "game-one",
  eventId: "course-one",
  contentBlockId: "block-one",
  contentSnapshot: {
    planId: "plan",
    drillId: "drill",
    name: "分组对抗",
    revision: "source-one",
  },
  sideAName: "红队",
  sideBName: "蓝队",
  scoreA: null,
  scoreB: null,
  state: "draft",
  revision: 1,
  updatedAt: "2026-10-22T00:00:00Z",
  participants: [],
  events: [],
});
const context = () => ({
  enabled: true,
  canEdit: true,
  event: {
    id: "course-one",
    title: "技术训练",
    startsAt: "2026-10-22T00:00:00Z",
    status: "scheduled",
    teamId: "team",
  },
  sources: [
    {
      contentBlockId: "block-one",
      contentSnapshot: draftGame().contentSnapshot,
    },
  ],
  participants: [
    { studentId: "one", name: "学员甲" },
    { studentId: "two", name: "学员乙" },
  ],
  games: current ? [current] : [],
});
function page() {
  const result = { ...definition, data: structuredClone(definition.data) };
  result.setData = (patch) => Object.assign(result.data, patch);
  return result;
}
const input = (p, field, value) =>
  p.editField({ currentTarget: { dataset: { field } }, detail: { value } });
const select = (p, id, index) =>
  p.selectParticipant({
    currentTarget: { dataset: { id } },
    detail: { value: String(index) },
  });
async function load(gameId) {
  const p = page();
  await p.onLoad({
    eventId: "course-one",
    contentBlockId: "block-one",
    ...(gameId ? { gameId } : {}),
  });
  return p;
}
beforeEach(() => {
  current = null;
  storage.clear();
  Object.values(mocks).forEach((mock) => mock.mockReset());
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key) || "",
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key),
    showModal: vi.fn(({ success }) => success({ confirm: true })),
    showToast: vi.fn(),
  };
  mocks.requireRole.mockReturnValue({
    role: "coach",
    userId: "coach-one",
    clubId: "club",
  });
  mocks.getTrainingGames.mockImplementation(async () => context());
  mocks.getTrainingGame.mockImplementation(async () => ({
    game: current,
    history: [],
  }));
  mocks.createTrainingGame.mockImplementation(async () => ({
    game: (current = draftGame()),
  }));
  mocks.saveTrainingGame.mockImplementation(async (_event, _id, body) => ({
    game: (current = {
      ...current,
      ...body,
      participants: body.participants.map((item) => ({
        ...item,
        nameSnapshot: item.studentId === "one" ? "学员甲" : "学员乙",
      })),
      revision: body.expectedRevision + 1,
    }),
  }));
});
describe("training game editor", () => {
  it("opens without writes, separates unknown and zero, and saves draft without confirmation", async () => {
    const p = await load();
    expect(p.data.state).toBe("ready");
    expect(mocks.createTrainingGame).not.toHaveBeenCalled();
    input(p, "scoreA", "0");
    input(p, "scoreB", "0");
    select(p, "one", 1);
    await p.saveDraft();
    expect(wx.showModal).not.toHaveBeenCalled();
    expect(mocks.saveTrainingGame).toHaveBeenCalledWith(
      "course-one",
      "game-one",
      expect.objectContaining({
        scoreA: 0,
        scoreB: 0,
        state: "draft",
        participants: [{ studentId: "one", side: "A" }],
      }),
    );
    expect(storage.size).toBe(0);
    expect(p.data.form.scoreA).toBe("0");
  });
  it("requires explicit completion and rejects one-sided scores before creating anything", async () => {
    const p = await load();
    input(p, "scoreA", "2");
    await p.complete();
    expect(mocks.createTrainingGame).not.toHaveBeenCalled();
    expect(p.data.error).toContain("同时");
    input(p, "scoreB", "1");
    wx.showModal.mockImplementationOnce(({ success }) =>
      success({ confirm: false }),
    );
    await p.complete();
    expect(mocks.createTrainingGame).not.toHaveBeenCalled();
    expect(p.data.busy).toBe(false);
    await p.complete();
    expect(wx.showModal).toHaveBeenCalled();
    expect(current.state).toBe("completed");
  });
  it("keeps unknown outcomes locked and retries the exact original request once", async () => {
    current = draftGame();
    const p = await load(current.id);
    input(p, "scoreA", "4");
    input(p, "scoreB", "2");
    mocks.saveTrainingGame.mockRejectedValueOnce({
      errorType: "network",
      message: "offline",
    });
    await p.complete();
    const original = mocks.saveTrainingGame.mock.calls[0][2];
    expect(p.data.uncertain).toBe(true);
    input(p, "scoreA", "99");
    expect(p.data.form.scoreA).toBe("4");
    await p.complete();
    expect(mocks.saveTrainingGame.mock.calls[1][2]).toEqual(original);
    expect(current.scoreA).toBe(4);
    expect(p.data.uncertain).toBe(false);
  });
  it("retains a conflicting local draft, blocks stale retries and reloads only after confirmation", async () => {
    current = draftGame();
    const p = await load(current.id);
    input(p, "scoreA", "3");
    input(p, "scoreB", "0");
    mocks.saveTrainingGame.mockRejectedValueOnce({
      statusCode: 409,
      message: "changed",
    });
    await p.saveDraft();
    expect(p.data.conflict).toBe(true);
    expect(p.data.form.scoreA).toBe("3");
    await p.saveDraft();
    expect(mocks.saveTrainingGame).toHaveBeenCalledTimes(1);
    wx.showModal.mockImplementationOnce(({ success }) =>
      success({ confirm: false }),
    );
    await p.reloadServer();
    expect(p.data.form.scoreA).toBe("3");
    current = { ...current, revision: 2, scoreA: 1, scoreB: 1 };
    await p.reloadServer();
    expect(p.data.form.scoreA).toBe("1");
    expect(p.data.conflict).toBe(false);
    expect(storage.size).toBe(0);
  });
  it("preserves uncertain creation across reopening instead of creating a second game", async () => {
    const p = await load();
    mocks.createTrainingGame.mockRejectedValueOnce({ errorType: "timeout" });
    await p.saveDraft();
    const original = mocks.createTrainingGame.mock.calls[0][1];
    expect(p.data.uncertain).toBe(true);
    const reopened = await load();
    expect(reopened.data.uncertain).toBe(true);
    await reopened.reloadServer();
    expect(reopened.data.error).toContain("创建结果尚未确认");
    await reopened.complete();
    expect(mocks.createTrainingGame.mock.calls[1][1]).toEqual(original);
    expect(current.state).toBe("draft");
  });
  it("restores pending retry even if the server accepted it before the connection failed", async () => {
    current = draftGame();
    const p = await load(current.id);
    mocks.saveTrainingGame.mockImplementationOnce(async (_e, _g, body) => {
      current = { ...current, ...body, revision: 2 };
      throw { errorType: "timeout" };
    });
    await p.complete();
    const accepted = current;
    const reopened = await load(current.id);
    expect(reopened.data.conflict).toBe(false);
    expect(reopened.data.uncertain).toBe(true);
    mocks.saveTrainingGame.mockResolvedValueOnce({ game: accepted });
    await reopened.complete();
    expect(reopened.data.error).toBe("");
    expect(reopened.data.uncertain).toBe(false);
  });
  it("validates roster ownership and records partial events without editing the score", async () => {
    const p = await load();
    select(p, "foreign", 1);
    expect(p.data.form.participants).toEqual([]);
    select(p, "one", 1);
    p.editEvent({
      currentTarget: { dataset: { field: "eventStudentIndex" } },
      detail: { value: "1" },
    });
    p.addEvent();
    expect(p.data.form.events[0]).toMatchObject({
      type: "goal",
      studentId: "one",
      side: "A",
      minute: null,
    });
    expect(p.data.form.scoreA).toBe("");
    select(p, "one", 2);
    expect(p.data.form.participants[0].side).toBe("A");
    expect(p.data.error).toContain("已录事件");
  });
  it("keeps completed corrections reasoned and cancelled courses read-only", async () => {
    current = { ...draftGame(), state: "completed" };
    const p = await load(current.id);
    await p.complete();
    expect(mocks.saveTrainingGame).not.toHaveBeenCalled();
    expect(p.data.error).toContain("原因");
    input(p, "reason", "核对比分");
    await p.complete();
    expect(mocks.saveTrainingGame).toHaveBeenCalledWith(
      "course-one",
      current.id,
      expect.objectContaining({ reason: "核对比分", state: "completed" }),
    );
    mocks.getTrainingGames.mockResolvedValueOnce({
      ...context(),
      canEdit: false,
    });
    const closed = await load(current.id);
    input(closed, "scoreA", "9");
    expect(closed.data.form.scoreA).toBe("");
    expect(closed.data.readOnly).toBe(true);
  });
});
