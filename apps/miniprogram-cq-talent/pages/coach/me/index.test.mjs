import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachHome: vi.fn(),
  requireRole: vi.fn(),
  openPage: vi.fn(),
  clearSession: vi.fn(),
  showModal: vi.fn(),
  reLaunch: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachHome: mocks.getCoachHome }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/navigation", () => ({ openPage: mocks.openPage }));
vi.mock("../../../utils/store", () => ({ clearSession: mocks.clearSession }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

globalThis.wx = {
  showModal: mocks.showModal,
  reLaunch: mocks.reLaunch,
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

const session = { role: "coach", displayName: "Session coach" };
const home = {
  coachName: "Seed coach must not replace the session name",
  teams: ["Actual team"],
  events: [],
  summary: { total: 0, training: 0, matches: 0, pending: 0 },
  tasks: [],
  pendingItems: [],
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createPageInstance(data = {}) {
  const instance = { ...pageDefinition, data: { ...pageDefinition.data, ...data } };
  instance.setData = (patch) => { instance.data = { ...instance.data, ...patch }; };
  return instance;
}

describe("coach profile", () => {
  beforeEach(() => {
    mocks.getCoachHome.mockReset().mockResolvedValue(home);
    mocks.requireRole.mockReset().mockReturnValue(session);
    mocks.openPage.mockReset();
    mocks.clearSession.mockReset();
    mocks.showModal.mockReset();
    mocks.reLaunch.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 10, 12));
  });

  it("uses the session identity and one explicit frozen 30-day coach-home range", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getCoachHome).toHaveBeenCalledTimes(1);
    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-07-12", to: "2026-08-10" });
    expect(page.data).toMatchObject({
      state: "ready",
      displayName: "Session coach",
      avatarLetter: "S",
      teamsText: "Actual team",
    });
  });

  it("makes no coach-home request for a non-coach and keeps an empty team state honest", async () => {
    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.load();
    expect(mocks.getCoachHome).not.toHaveBeenCalled();

    mocks.getCoachHome.mockResolvedValueOnce({ ...home, teams: [] });
    const page = createPageInstance();
    await page.load();
    expect(page.data).toMatchObject({ state: "ready", teamsText: "暂无近30天负责球队" });
  });

  it("keeps a current coach-home failure safe", async () => {
    mocks.getCoachHome.mockRejectedValueOnce(new Error("raw upstream coach profile details"));
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      state: "error",
      message: "教练身份读取失败，请稍后重试。",
    });
    expect(page.data.message).not.toContain("raw upstream coach profile details");
  });

  it("ignores stale coach-home success and failure after a newer load", async () => {
    const first = deferred();
    const second = deferred();
    mocks.getCoachHome
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const page = createPageInstance();

    const firstLoad = page.load();
    await Promise.resolve();
    const secondLoad = page.load();
    second.resolve({ ...home, teams: ["Newest actual team"] });
    await secondLoad;
    first.reject(new Error("older failure must not replace current data"));
    await firstLoad;

    expect(page.data).toMatchObject({ state: "ready", teamsText: "Newest actual team" });
    expect(page.data.message).not.toContain("older failure");

    const staleSuccess = deferred();
    const latestSuccess = deferred();
    mocks.getCoachHome
      .mockImplementationOnce(() => staleSuccess.promise)
      .mockImplementationOnce(() => latestSuccess.promise);
    const staleLoad = page.load();
    await Promise.resolve();
    const latestLoad = page.load();
    latestSuccess.resolve({ ...home, teams: ["Latest actual team"] });
    await latestLoad;
    staleSuccess.resolve({ ...home, teams: ["Old actual team"] });
    await staleLoad;

    expect(page.data).toMatchObject({ state: "ready", teamsText: "Latest actual team" });
  });

  it("navigates only through the four existing coach profile routes", () => {
    const page = createPageInstance();
    page.openAccount();
    page.openPermissions();
    page.openPrivateInterest();
    page.openHelp();

    expect(mocks.openPage.mock.calls).toEqual([
      ["/pages/coach/account/index"],
      ["/pages/coach/permissions/index"],
      ["/pages/coach/private-interest/index"],
      ["/pages/coach/help/index"],
    ]);
  });

  it("does not clear a session on cancel and confirms logout only once", () => {
    const callbacks = [];
    mocks.showModal.mockImplementation((options) => { callbacks.push(options.success); });
    const page = createPageInstance();

    page.logout();
    page.logout();
    expect(mocks.showModal).toHaveBeenCalledTimes(1);
    callbacks[0]({ confirm: false });
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.reLaunch).not.toHaveBeenCalled();

    page.logout();
    callbacks[1]({ confirm: true });
    callbacks[1]({ confirm: true });
    page.logout();
    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.reLaunch).toHaveBeenCalledTimes(1);
    expect(mocks.reLaunch).toHaveBeenCalledWith({ url: "/pages/launch/index" });
  });

  it("uses the direct C16 assets and omits unsupported Figma samples", () => {
    for (const name of ["settings", "shield", "heart", "user", "help-circle", "chevron-right"]) {
      expect(existsSync(new URL(`../../../assets/icons/c16-${name}.svg`, import.meta.url))).toBe(true);
      expect(template).toContain(`/assets/icons/c16-${name}.svg`);
    }
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="c16-bar"');
    expect(template).toContain('class="c16-profile"');
    expect(template).not.toMatch(/主教练|本赛季执教|在队学员|平均出勤/);
    expect(controller).not.toContain("home.coachName");
    expect(controller).not.toContain("readableError");
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(stylesheet).toMatch(/\.c16-bar\s*\{[^}]*height:\s*176rpx[^}]*box-sizing:\s*border-box/s);
    expect(stylesheet).toMatch(/\.c16-profile\s*\{[^}]*border-radius:\s*24rpx[^}]*background:\s*#07111f/s);
  });
});
