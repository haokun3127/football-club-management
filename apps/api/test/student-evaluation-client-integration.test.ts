import { describe, expect, it, vi } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
const state = vi.hoisted(() => ({ session: null as null | { role: "coach" | "parent"; token: string; currentStudentId?: string }, context: { clubId: "club-chongqing-talent", clientId: "app-client-cq-talent-wechat-main" } }));
vi.mock("../../miniprogram-cq-talent/utils/store", () => ({ getSession: () => state.session, getAppContext: () => state.context, clearSession: () => { state.session = null; } }));
vi.mock("../../miniprogram-cq-talent/utils/presentation", () => ({ resolveNavInset: () => 0, resolveMenuInset: () => 0 }));
describe("native evaluation controller → real request → BFF → SQLite → parent", () => {
  it("persists a coach button save and displays the same revision in the parent page through environment-checked requests", async () => {
    const p = await createPlatformPersistence({ databasePath: ":memory:" }), sessions = new SessionRegistry(p.repositories.appClientSessions), store = new PersistentApiStore(p.repositories);
    const app = buildServer(store, { logger: false, sessionRegistry: sessions, runtimeConfig: { environment: "develop", databasePath: ":memory:", wechatAppId: "wx4c588cd106e520e0" }, membershipResolver: createProductionMembershipResolver(p.repositories.users, p.repositories.memberships) });
    const localOrigin = await app.listen({ host: "127.0.0.1", port: 0 });
    const requests: Array<{ method: string; env: string; status: number }> = [];
    let definition: any;
    vi.stubGlobal("Page", (value: unknown) => { definition = value; });
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { appId: "wx4c588cd106e520e0", envVersion: "develop" } }),
      showToast: vi.fn(), reLaunch: vi.fn(),
      request: (options: any) => {
        const url = new URL(options.url); expect(url.origin).toBe("https://cqtc.pomi.tech"); expect(url.pathname.startsWith("/__env/develop/")).toBe(true);
        void fetch(localOrigin + url.pathname.replace("/__env/develop", "") + url.search, { method: options.method, headers: { ...options.header, referer: "https://servicewechat.com/wx4c588cd106e520e0/devtools/page-frame.html", ...(options.data ? { "content-type": "application/json" } : {}) }, body: options.data ? JSON.stringify(options.data) : undefined }).then(async result => {
          requests.push({ method: options.method, env: options.header["X-MiniProgram-Env"], status: result.status }); options.success({ statusCode: result.status, data: await result.json() });
        }).catch(error => options.fail({ errMsg: String(error) }));
      },
    });
    async function session(role: "coach" | "parent") {
      const userId = `user-${role}-1`, membership = await p.repositories.memberships.findActiveByClubAndUser(state.context.clubId, userId);
      const result = await sessions.create({ clubId: state.context.clubId, appClientId: state.context.clientId, userId, membershipId: membership!.id, activeRole: role }); state.session = { role, token: result.token, currentStudentId: "student-1" };
    }
    const page = () => ({ ...definition, data: structuredClone(definition.data), setData(patch: object) { Object.assign(this.data, patch); } });
    try {
      await import("../../miniprogram-cq-talent/pages/shared/student-evaluation/index.ts");
      await session("coach"); const coach = page(); await coach.onLoad({ student: "student-1", mode: "edit" }); expect(coach.data.state).toBe("ready");
      coach.togglePhrase({ currentTarget: { dataset: { id: "observe-teammates" } } }); coach.inputNote({ detail: { value: "继续观察队友" } }); await coach.save();
      expect(coach.data.revision).toBe(1); expect(coach.data.mode).toBe("current");
      await session("parent"); const parent = page(); await parent.onLoad({ student: "student-1", team: coach.data.teamId });
      expect(parent.data.canEdit).toBe(false); expect(parent.data.current.note).toBe("继续观察队友"); expect(parent.data.current.phrases[0].text).toBe("主动观察队友");
      parent.showHistory(); expect(parent.data.history[0].changes).toContain("补充评价：继续观察队友");
      expect(store.studentEvaluations.get(state.context.clubId, coach.data.teamId, "student-1")!.revision).toBe(1);
      expect(requests).toEqual([{ method: "GET", env: "develop", status: 200 }, { method: "PUT", env: "develop", status: 200 }, { method: "GET", env: "develop", status: 200 }]);
    } finally { await app.close(); p.database.close(); vi.unstubAllGlobals(); state.session = null; }
  });
});
