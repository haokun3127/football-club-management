import { describe, expect, it, vi } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { reconcileTrainingRecords } from "../src/application/training-record-job.js";

// event-training-1：2026-07-01 09:00–10:30 UTC，student-1（家长 user-parent-1）参与。
const PRE_CLASS = "2026-06-30T00:00:00Z";
const POST_CLASS = "2026-07-02T00:00:00Z";

describe("parent training leave (REQ-ATT-001)", () => {
  it("applies pre-class leave immediately with an audited record, stays idempotent, and withdraws back to the default flow", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const store = new PersistentApiStore(persistence.repositories);
    const sessions = new SessionRegistry(persistence.repositories.appClientSessions);
    const clubId = "club-chongqing-talent";
    const appClientId = "app-client-cq-talent-wechat-main";
    async function headers(role: "parent" | "coach", userRole = role) {
      const userId = `user-${userRole}-1`;
      const membership = await persistence.repositories.memberships.findActiveByClubAndUser(clubId, userId);
      const session = await sessions.create({ clubId, appClientId, userId, membershipId: membership!.id, activeRole: role });
      return { authorization: `Bearer ${session.token}` };
    }
    const parent = await headers("parent");
    const coach = await headers("coach");
    const app = buildServer(store, { logger: false, sessionRegistry: sessions,
      membershipResolver: createProductionMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
    const base = `/clubs/${clubId}/app-clients/${appClientId}/students/student-1/training-records`;
    const attendance = `/clubs/${clubId}/app-clients/${appClientId}/coach/events/event-training-1/attendance`;
    try {
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(PRE_CLASS));

      // 课前请假：直接生效、无需审批，记录不销课并留痕
      const leave = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 0 } });
      expect(leave.statusCode).toBe(200);
      expect(leave.json()).toMatchObject({ participant: { studentId: "student-1", status: "leave_requested" } });
      expect(leave.json().record).toMatchObject({ counted: false, source: "correction", revision: 1 });
      expect(leave.json().record.history[0]).toMatchObject({ reason: "家长请假", actorUserId: "user-parent-1", previousCounted: null });

      // 双方可见：家长列表与教练侧读到同一份不销课记录
      const parentList = (await app.inject({ url: base, headers: parent })).json();
      expect(parentList.records.find((item: { eventId: string }) => item.eventId === "event-training-1")).toMatchObject({ counted: false, revision: 1 });
      const workbench = await app.inject({ url: `/clubs/${clubId}/app-clients/${appClientId}/coach/events/event-training-1/workbench`, headers: coach });
      expect(workbench.json().rosterContext.participants.find((item: { studentId: string }) => item.studentId === "student-1").status).toBe("leave_requested");

      // 重复提交：已生效的请假直接返回当前事实，不追加修订
      const repeat = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 0 } });
      expect(repeat.statusCode).toBe(200);
      expect(repeat.json().record.revision).toBe(1);

      // 教练整名单点名不得静默覆盖家长请假（10-18 审计 §3.2）
      const silentOverwrite = await app.inject({ method: "PUT", url: attendance, headers: coach,
        payload: { participants: [{ studentId: "student-1", status: "present" }] } });
      expect(silentOverwrite.statusCode).toBe(409);
      expect(silentOverwrite.json()).toMatchObject({ error: { code: "attendance_leave_conflict" }, conflicts: [{ studentId: "student-1", status: "leave_requested" }] });

      // 携带 previousStatus 核对后的显式覆盖被允许
      const deliberate = await app.inject({ method: "PUT", url: attendance, headers: coach,
        payload: { participants: [{ studentId: "student-1", status: "present", previousStatus: "leave_requested" }] } });
      expect(deliberate.statusCode).toBe(200);

      // 家长重新请假后，点名原样传回请假状态也允许（不视为覆盖）
      const releave = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 1 } });
      expect(releave.statusCode).toBe(200);
      const passthrough = await app.inject({ method: "PUT", url: attendance, headers: coach,
        payload: { participants: [{ studentId: "student-1", status: "leave_requested" }] } });
      expect(passthrough.statusCode).toBe(200);

      // 课前撤回：保留请假与撤回历史、恢复参与状态，课后回到自动记录流程
      const revoke = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "revoke", expectedRevision: 2 } });
      expect(revoke.statusCode).toBe(200);
      expect(revoke.json()).toMatchObject({ participant: { studentId: "student-1", status: "confirmed" } });
      expect(revoke.json().record).toMatchObject({ revision: 3, counted: false, source: "automatic" });
      expect(revoke.json().record.history).toHaveLength(3);
      vi.setSystemTime(new Date(POST_CLASS));
      expect((await reconcileTrainingRecords(store, POST_CLASS)).processed).toBeGreaterThan(0);
      const afterRevoke = (await app.inject({ url: base, headers: parent })).json();
      expect(afterRevoke.records.find((item: { eventId: string }) => item.eventId === "event-training-1")).toMatchObject({ counted: true, source: "automatic" });
    } finally { vi.useRealTimers(); await app.close(); persistence.database.close(); }
  });

  it("records a post-class leave as a correction with history, withdraws back to counted, and guards scope, cancellation and conflicts", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    const store = new PersistentApiStore(persistence.repositories);
    const sessions = new SessionRegistry(persistence.repositories.appClientSessions);
    const clubId = "club-chongqing-talent";
    const appClientId = "app-client-cq-talent-wechat-main";
    async function headers(role: "parent" | "coach", userRole = role) {
      const userId = `user-${userRole}-1`;
      const membership = await persistence.repositories.memberships.findActiveByClubAndUser(clubId, userId);
      const session = await sessions.create({ clubId, appClientId, userId, membershipId: membership!.id, activeRole: role });
      return { authorization: `Bearer ${session.token}` };
    }
    const parent = await headers("parent");
    const coach = await headers("coach");
    const app = buildServer(store, { logger: false, sessionRegistry: sessions,
      membershipResolver: createProductionMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
    const base = `/clubs/${clubId}/app-clients/${appClientId}/students/student-1/training-records`;
    try {
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(POST_CLASS));

      // 已销课后补请假：更新该课结果并留痕（REQ-ATT-001）
      const initial = (await app.inject({ url: base, headers: parent })).json();
      const automatic = initial.records.find((item: { eventId: string }) => item.eventId === "event-training-1");
      expect(automatic).toMatchObject({ counted: true, source: "automatic", revision: 1 });
      const lateLeave = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 1, reason: "当天生病补记" } });
      expect(lateLeave.statusCode).toBe(200);
      expect(lateLeave.json().record).toMatchObject({ counted: false, revision: 2 });
      expect(lateLeave.json().record.history.at(-1)).toMatchObject({ reason: "当天生病补记", previousCounted: true, actorUserId: "user-parent-1" });

      // 撤回请假 = 改回销课，同样留痕
      const revoke = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "revoke", expectedRevision: 2 } });
      expect(revoke.statusCode).toBe(200);
      expect(revoke.json().record).toMatchObject({ counted: true, revision: 3 });
      expect(revoke.json().record.history.at(-1)).toMatchObject({ reason: "撤回请假，改为销课", previousCounted: false });

      // 撤回后没有生效请假，再次撤回被拒绝
      const revokeAgain = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "revoke", expectedRevision: 3 } });
      expect(revokeAgain.statusCode).toBe(409);
      expect(revokeAgain.json().error.code).toBe("leave_not_active");

      // 过期版本冲突：与 correction 相同的 409 风格
      const stale = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 1 } });
      expect(stale.statusCode).toBe(409);
      expect(stale.json().error.code).toBe("training_record_conflict");
      expect(stale.json().current.revision).toBe(3);

      // 非本人孩子 403；教练角色不能用家长请假路由
      expect((await app.inject({ method: "POST", url: `${base.replace("student-1", "student-other")}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 0 } })).statusCode).toBe(403);
      expect((await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: coach,
        payload: { action: "request", expectedRevision: 3 } })).statusCode).toBe(403);

      // 取消课不销课，也无需请假
      const event = store.getCalendarEvent("event-training-1")!;
      store.saveCalendarEvent({ ...event, status: "cancelled" });
      const cancelled = await app.inject({ method: "POST", url: `${base}/event-training-1/leave`, headers: parent,
        payload: { action: "request", expectedRevision: 3 } });
      expect(cancelled.statusCode).toBe(409);
      expect(cancelled.json().error.code).toBe("cancelled_training");

      const openapi = (await app.inject("/openapi.json")).json();
      expect(openapi.paths["/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/training-records/{eventId}/leave"].post.responses["200"]).toBeDefined();
    } finally { vi.useRealTimers(); await app.close(); persistence.database.close(); }
  });
});
