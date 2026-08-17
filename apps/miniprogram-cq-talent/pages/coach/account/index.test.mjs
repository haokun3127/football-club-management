import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCoachHome: vi.fn(),
  requireRole: vi.fn(),
  navigateBack: vi.fn(),
}));

vi.mock("../../../utils/api", () => ({ getCoachHome: mocks.getCoachHome }));
vi.mock("../../../utils/auth", () => ({ requireRole: mocks.requireRole }));
vi.mock("../../../utils/presentation", () => ({ resolveNavInset: () => 0 }));

globalThis.wx = {
  navigateBack: mocks.navigateBack,
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

const session = { role: "coach", displayName: "会话教练" };
const home = {
  coachName: "不得使用的种子教练姓名",
  teams: ["真实 U10 队", "真实 U10 队", ""],
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

describe("coach account", () => {
  beforeEach(() => {
    mocks.getCoachHome.mockReset().mockResolvedValue(home);
    mocks.requireRole.mockReset().mockReturnValue(session);
    mocks.navigateBack.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 10, 12));
  });

  it("uses only the session name and one frozen 30-day coach-home request", async () => {
    const page = createPageInstance();

    await page.load();

    expect(mocks.getCoachHome).toHaveBeenCalledTimes(1);
    expect(mocks.getCoachHome).toHaveBeenCalledWith({ from: "2026-07-12", to: "2026-08-10" });
    expect(page.data).toMatchObject({
      displayName: "会话教练",
      avatarLetter: "会",
      teamText: "真实 U10 队",
      teamState: "ready",
    });
  });

  it("uses an honest name pending state, does not request for a non-coach, and keeps empty teams honest", async () => {
    mocks.requireRole.mockReturnValueOnce({ role: "coach", displayName: "  " });
    const missingName = createPageInstance();
    await missingName.load();
    expect(missingName.data).toMatchObject({ displayName: "姓名待同步", avatarLetter: "姓" });

    mocks.requireRole.mockReturnValueOnce(null);
    const denied = createPageInstance();
    await denied.load();
    expect(mocks.getCoachHome).toHaveBeenCalledTimes(1);

    mocks.getCoachHome.mockResolvedValueOnce({ ...home, teams: [] });
    const empty = createPageInstance();
    await empty.load();
    expect(empty.data).toMatchObject({ teamState: "empty", teamText: "暂无近30天负责球队" });
  });

  it("keeps session profile visible while a current failure marks only team information pending", async () => {
    mocks.getCoachHome.mockRejectedValueOnce(new Error("raw upstream account data"));
    const page = createPageInstance();

    await page.load();

    expect(page.data).toMatchObject({
      displayName: "会话教练",
      teamState: "pending",
      teamText: "团队信息待同步",
    });
    expect(page.data.teamText).not.toContain("raw upstream account data");
  });

  it("ignores stale coach-home success and failure", async () => {
    const first = deferred();
    const second = deferred();
    mocks.getCoachHome.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const page = createPageInstance();

    const firstLoad = page.load();
    await Promise.resolve();
    const secondLoad = page.load();
    second.resolve({ ...home, teams: ["最新真实球队"] });
    await secondLoad;
    first.reject(new Error("旧请求错误"));
    await firstLoad;

    expect(page.data).toMatchObject({ teamState: "ready", teamText: "最新真实球队" });

    const staleSuccess = deferred();
    const latestFailure = deferred();
    mocks.getCoachHome.mockImplementationOnce(() => staleSuccess.promise).mockImplementationOnce(() => latestFailure.promise);
    const oldLoad = page.load();
    await Promise.resolve();
    const currentLoad = page.load();
    latestFailure.reject(new Error("当前请求失败"));
    await currentLoad;
    staleSuccess.resolve({ ...home, teams: ["旧球队"] });
    await oldLoad;

    expect(page.data).toMatchObject({ teamState: "pending", teamText: "团队信息待同步" });
  });

  it("keeps account rows read-only and uses only the local back action", () => {
    const page = createPageInstance();
    page.goBack();

    expect(mocks.navigateBack).toHaveBeenCalledTimes(1);
    expect(existsSync(new URL("../../../assets/icons/c163-chevron-left.svg", import.meta.url))).toBe(true);
    expect(pageConfig).not.toContain('"app-header"');
    expect(pageConfig).not.toContain('"status-view"');
    expect(pageConfig).toContain('"role-tabbar"');
    expect(template).toContain('class="c163-nav"');
    expect(template).toContain("/assets/icons/c163-chevron-left.svg");
    expect([...template.matchAll(/\bbind(?:tap|longpress|change|input|submit|action)\s*=/g)]).toHaveLength(1);
    expect(template).toMatch(/class="c163-nav__back"[^>]*bindtap="goBack"/);
    expect(template).not.toMatch(/138\*|已绑定|已认证|编辑|修改|退出登录|清除缓存/);
    expect(template).not.toMatch(/\.(?:map|filter|slice|indexOf)\s*\(/);
    expect(controller).not.toContain("home.coachName");
    expect(controller).not.toMatch(/clearSession|getStorage|setStorage|showToast|showModal|reLaunch/);
    expect(template).toContain('class="c163-nav__placeholder"');
    expect(stylesheet).toMatch(/\.c163-nav\s*\{(?=[^}]*height:\s*88rpx)(?=[^}]*box-sizing:\s*content-box)(?=[^}]*padding-right:\s*200rpx)(?=[^}]*padding-left:\s*32rpx)(?=[^}]*background:\s*#fceeef)/s);
    expect(stylesheet).toMatch(/\.c163-nav__title\s*\{(?=[^}]*flex:\s*1)(?=[^}]*font-size:\s*44rpx)(?=[^}]*text-align:\s*center)/s);
    expect(stylesheet).toMatch(/\.c163-nav__placeholder\s*\{(?=[^}]*width:\s*48rpx)(?=[^}]*height:\s*48rpx)/s);
    expect(stylesheet).toMatch(/\.c163-page__body\s*\{[^}]*padding:\s*32rpx\s+44rpx\s+180rpx/s);
    expect(stylesheet).toMatch(/\.c163-content\s*\{[^}]*gap:\s*32rpx/s);
    expect(stylesheet).toMatch(/\.c163-card\s*\{[^}]*border-radius:\s*24rpx/s);
  });
});
