import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
const state = vi.hoisted(() => ({ session: null as null | { role: "coach" | "parent"; token: string; currentStudentId?: string }, context: { clubId: "club-chongqing-talent", clientId: "app-client-cq-talent-wechat-main" } }));
vi.mock("../../miniprogram-cq-talent/utils/store", () => ({ getSession: () => state.session, getAppContext: () => state.context, clearSession: () => { state.session = null; } }));
vi.mock("../../miniprogram-cq-talent/utils/presentation", () => ({ resolveNavInset: () => 0, resolveMenuInset: () => 0 }));
describe("native scout controller → real request → BFF → SQLite", () => {
  it("creates and reopens one identity through real environment-aware client requests", async () => {
    const p = await createPlatformPersistence({ databasePath: ":memory:", identityKeyring: { activeVersion: "test", keys: [{ version: "test", digestKey: randomBytes(32).toString("hex"), encryptionKey: randomBytes(32).toString("hex") }] } }), sessions = new SessionRegistry(p.repositories.appClientSessions), store = new PersistentApiStore(p.repositories);
    const app = buildServer(store, { logger: false, sessionRegistry: sessions, runtimeConfig: { environment: "develop", databasePath: ":memory:", wechatAppId: "wx4c588cd106e520e0" }, membershipResolver: createProductionMembershipResolver(p.repositories.users, p.repositories.memberships) });
    const localOrigin = await app.listen({ host: "127.0.0.1", port: 0 });
    const requests: Array<{ method: string; env: string; status: number }> = [];
    let definition: any;
    vi.stubGlobal("Page", (value: unknown) => { definition = value; });
    vi.stubGlobal("wx", {
      getAccountInfoSync: () => ({ miniProgram: { appId: "wx4c588cd106e520e0", envVersion: "develop" } }),
      showToast: vi.fn(), reLaunch: vi.fn(), showActionSheet: (options: any) => options.success({ tapIndex: 1 }),
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
      await import("../../miniprogram-cq-talent/pages/coach/scout/index.ts");
      await session("coach"); const coach = page(); await coach.onLoad(); expect(coach.data.state).toBe("ready"); expect(coach.data.players).toEqual([]);
      coach.newPlayer(); coach.inputName({ detail: { value: "标准示例人员" } }); coach.inputIdentity({ detail: { value: "11010519491231002X" } }); await coach.save();
      expect(coach.data.mode).toBe("detail"); expect(coach.data.state).toBe("ready"); expect(coach.data.identityNumber).toBe("");
      const studentId = coach.data.player.id;
      await coach.goBack(); expect(coach.data.players[0].id).toBe(studentId);
      coach.newPlayer(); coach.inputName({ detail: { value: "标准示例人员" } }); coach.inputIdentity({ detail: { value: "11010519491231002X" } }); await coach.save();
      expect(coach.data.player.id).toBe(studentId); expect(p.database.prepare("SELECT count(*) n FROM person_identities").get()!.n).toBe(1);
      expect(requests).toEqual([{ method: "GET", env: "develop", status: 200 }, { method: "POST", env: "develop", status: 201 }, { method: "GET", env: "develop", status: 200 }, { method: "GET", env: "develop", status: 200 }, { method: "POST", env: "develop", status: 200 }, { method: "GET", env: "develop", status: 200 }]);
      const now = new Date().toISOString(), coachId = store.listCoaches(state.context.clubId).find(c=>c.userId==="user-coach-1")!.id;
      await store.saveCalendarEvent({ id:"scout-integration-event",clubId:state.context.clubId,title:"补录训练",type:"training",status:"completed",ownerCoachId:coachId,timeRange:{startsAt:"2020-10-09T00:00:00Z",endsAt:"2020-10-09T01:00:00Z"},createdAt:now,updatedAt:now });
      const scoped=page();await scoped.onLoad({eventId:"scout-integration-event",student:studentId});expect(scoped.data.state).toBe("ready");expect(scoped.data.included).toBe(false);
      await scoped.addToEvent();expect(scoped.data.included).toBe(true);
      expect(store.trainingRecords.get(state.context.clubId,"scout-integration-event",studentId)).toMatchObject({counted:false,source:"correction"});
      expect(p.repositories.temporaryRosters.get(state.context.clubId,"scout-integration-event").temporary[0].history[0].participated).toBe(false);
    } finally { await app.close(); p.database.close(); vi.unstubAllGlobals(); state.session = null; }
  });
});
