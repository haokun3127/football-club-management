import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { saveStudentEvaluation } from "../src/application/student-evaluations.js";
const clubId = "club-chongqing-talent", appClientId = "app-client-cq-talent-wechat-main";
describe("team student evaluations", () => {
  it("integrates coach saves with parent reads, history, conflict and team/role/guardian boundaries", async () => {
    const p = await createPlatformPersistence({ databasePath: ":memory:" });
    const store = new PersistentApiStore(p.repositories), sessions = new SessionRegistry(p.repositories.appClientSessions);
    const app = buildServer(store, { logger: false, sessionRegistry: sessions, membershipResolver: createProductionMembershipResolver(p.repositories.users, p.repositories.memberships) });
    async function headers(role: "coach" | "parent", activeRole: typeof role | null = role) {
      const userId = `user-${role}-1`, membership = await p.repositories.memberships.findActiveByClubAndUser(clubId, userId);
      const session = await sessions.create({ clubId, appClientId, userId, membershipId: membership!.id, activeRole });
      return { authorization: `Bearer ${session.token}` };
    }
    try {
      const coach = await headers("coach"), parent = await headers("parent"), pending = await headers("coach", null);
      const base = `/clubs/${clubId}/app-clients/${appClientId}/students/student-1/evaluations`;
      const before = p.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all();
      const scores = await store.getStudentMetrics(clubId, "student-1");
      const initial = await app.inject({ url: base, headers: coach });
      expect(initial.statusCode).toBe(200);
      const teamId = initial.json().teams[0].id;
      const url = `${base}/${teamId}`;
      const payload = { expectedRevision: 0, phraseIds: ["observe-teammates"], note: "先观察再传球" };
      expect((await app.inject({ method: "PUT", url, headers: parent, payload })).statusCode).toBe(403);
      expect((await app.inject({ url: base, headers: pending })).statusCode).toBe(401);
      expect((await app.inject({ url: base.replace("student-1", "not-my-child"), headers: parent })).statusCode).toBe(403);
      expect((await app.inject({ method: "PUT", url: `${base}/foreign-team`, headers: coach, payload })).statusCode).toBe(403);
      expect((await app.inject({ method: "PUT", url, headers: coach, payload: { ...payload, actorUserId: "fake" } })).statusCode).toBe(400);
      expect((await app.inject({ method: "PUT", url, headers: coach, payload: { ...payload, phraseIds: ["invented"] } })).statusCode).toBe(400);
      const first = await app.inject({ method: "PUT", url, headers: coach, payload });
      expect(first.statusCode).toBe(200); expect(first.json().evaluation.revision).toBe(1);
      expect(first.json().evaluation.history[0]).not.toHaveProperty("actorUserId");
      expect(first.json().evaluation.history[0].actorDisplayName).toBeTruthy();
      expect((await app.inject({ method: "PUT", url, headers: coach, payload })).statusCode).toBe(409);
      const noop = await app.inject({ method: "PUT", url, headers: coach, payload: { ...payload, expectedRevision: 1 } });
      expect(noop.json().evaluation.revision).toBe(1);
      p.database.exec("CREATE TRIGGER fail_evaluation_http BEFORE UPDATE ON student_evaluations BEGIN SELECT RAISE(ABORT, 'sensitive SQL fixture failure'); END;");
      const failure = await app.inject({ method: "PUT", url, headers: coach, payload: { ...payload, expectedRevision: 1, note: "触发失败" } });
      expect(failure.statusCode).toBe(500); expect(failure.json().error.code).toBe("evaluation_save_failed"); expect(failure.body).not.toContain("SQL");
      expect(store.studentEvaluations.get(clubId, teamId, "student-1")!.revision).toBe(1);
      p.database.exec("DROP TRIGGER fail_evaluation_http");
      const update = await app.inject({ method: "PUT", url, headers: coach, payload: { ...payload, expectedRevision: 1, phraseIds: ["dribble-confidently"], note: "" } });
      expect(update.json().evaluation.history).toHaveLength(2);
      const read = (await app.inject({ url: base, headers: parent })).json();
      expect(read.teams.find((t: { id: string }) => t.id === teamId)).toMatchObject({ canEdit: false, evaluation: update.json().evaluation });
      const growth = await app.inject({ url: `/clubs/${clubId}/app-clients/${appClientId}/parent/students/student-1/growth-summary`, headers: parent });
      expect(growth.statusCode).toBe(200);
      expect(growth.json().evaluations[0].revision).toBe(2);
      const changes = growth.json().timeline.filter((item: { kind: string }) => item.kind === "evaluation");
      expect(changes).toHaveLength(2); expect(changes).toEqual(expect.arrayContaining([expect.objectContaining({ teamId, evaluationRevision: 2 })]));
      expect(JSON.stringify(growth.json().evaluations)).not.toContain("actorUserId");
      // Same child in another team: natural identities and history never overwrite each other.
      const template = store.listTeams(clubId).find(t => t.id === teamId)!;
      const secondTeam = { ...template, id: "evaluation-second-team", name: "第二队" };
      await p.repositories.teams.save(secondTeam); store.saveTeam(secondTeam);
      const member = store.listTeamMembers(clubId).find(m => m.studentId === "student-1" && m.teamId === teamId)!;
      store.saveTeamMember({ ...member, id: "evaluation-second-member", teamId: "evaluation-second-team" });
      const second = await app.inject({ method: "PUT", url: `${base}/evaluation-second-team`, headers: coach, payload });
      expect(second.statusCode).toBe(200); expect(second.json().evaluation.revision).toBe(1);
      expect(store.studentEvaluations.get(clubId, teamId, "student-1")!.revision).toBe(2);
      // Revoking collaboration takes effect before either reading or writing.
      store.saveTeam({ ...template, defaultCoachId: undefined });
      expect((await app.inject({ method: "PUT", url, headers: coach, payload: { ...payload, expectedRevision: 2 } })).statusCode).toBe(403);
      expect((await app.inject({ url: base, headers: coach })).json().teams.some((t: { id: string }) => t.id === teamId)).toBe(false);
      expect(p.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(before);
      expect(await store.getStudentMetrics(clubId, "student-1")).toEqual(scores);
      expect((await app.inject("/openapi.json")).json().paths["/clubs/{clubId}/app-clients/{clientId}/students/{studentId}/evaluations/{teamId}"].put.responses["200"]).toBeDefined();
    } finally { await app.close(); p.database.close(); }
  });
  it("persists snapshots across restart and leaves both current and history intact on SQL failure", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cq-evaluations-"));
    let p = await createPlatformPersistence({ databasePath: join(dir, "test.sqlite") });
    try {
      const store = new PersistentApiStore(p.repositories);
      const team = store.listTeamMembers(clubId).find(m => m.studentId === "student-1")!.teamId;
      const scope = { clubId, teamId: team, studentId: "student-1" };
      const actor = { id: "user-coach-1", displayName: "教练" };
      const first = saveStudentEvaluation(store.studentEvaluations, scope, { expectedRevision: 0, phraseIds: ["observe-teammates"], note: "观察" }, actor);
      p.database.exec("CREATE TRIGGER fail_evaluation BEFORE UPDATE ON student_evaluations BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;");
      expect(() => saveStudentEvaluation(store.studentEvaluations, scope, { expectedRevision: 1, phraseIds: [], note: "改动" }, actor)).toThrow();
      expect(store.studentEvaluations.get(clubId, team, "student-1")).toEqual(first);
      p.database.close(); p = await createPlatformPersistence({ databasePath: join(dir, "test.sqlite") });
      expect(p.repositories.studentEvaluations.get(clubId, team, "student-1")).toEqual(first);
      expect(p.repositories.studentEvaluations.list("another-club", "student-1")).toEqual([]);
    } finally { p.database.close(); rmSync(dir, { recursive: true, force: true }); }
  }, 15000);
});
