import { afterEach, beforeEach, expect, it } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { createSeedData } from "../src/seed.js";

const clubId = "club-chongqing-talent";
const base = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/events/event-training-1`;
const headers = { "x-user-id": "user-coach-1" };
const assistantHeaders = { "x-user-id": "user-assistant" };
const firstProject = "drill-cq-talent-assessment-001";
const secondProject = "drill-cq-talent-assessment-002";
const row = (score: number, trainingProjectId = firstProject, studentId = "student-1") => ({ studentId, trainingProjectId, score });
let p: Awaited<ReturnType<typeof createPlatformPersistence>>;
let store: PersistentApiStore;
let app: ReturnType<typeof buildServer>;
const read = async (actorHeaders = headers) => (await app.inject({ method: "GET", url: `${base}/training-content-assessments`, headers: actorHeaders })).json();
const save = (assessments: ReturnType<typeof row>[], revision?: number, key?: string, actorHeaders = headers) => app.inject({ method: "PUT", url: `${base}/training-content-assessments`, headers: { ...actorHeaders, ...(key ? { "idempotency-key": key } : {}) }, payload: { assessments, ...(revision === undefined ? {} : { expectedRevision: revision }) } });
beforeEach(async () => {
  const seed = createSeedData();
  seed.users.push({ ...seed.users.find(user => user.id === "user-coach-1")!, id: "user-assistant" });
  seed.coaches.push({ ...seed.coaches.find(coach => coach.id === "coach-1")!, id: "assistant", userId: "user-assistant" });
  seed.clubMemberships.push({ ...seed.clubMemberships.find(member => member.userId === "user-coach-1" && member.clubId === clubId)!, id: "member-assistant", userId: "user-assistant" });
  p = await createPlatformPersistence({ databasePath: ":memory:", seedData: seed });
  store = new PersistentApiStore(p.repositories, seed);
  store.saveCoachAssignment({ id: "classroom-assistant", clubId, coachId: "assistant", teamId: "team-u10-dev", role: "assistant_coach", createdAt: "2026-10-30T00:00:00.000Z", updatedAt: "2026-10-30T00:00:00.000Z" });
  app = buildServer(store, { logger: false, membershipResolver: new HeaderMembershipResolver(p.repositories.users, p.repositories.memberships) });
  const workbench = await app.inject({ method: "GET", url: `${base}/workbench`, headers });
  expect((await app.inject({ method: "PUT", url: `${base}/training-projects`, headers, payload: { expectedRevision: workbench.json().trainingContentRevision, projectIds: [firstProject, secondProject] } })).statusCode).toBe(200);
  expect((await app.inject({ method: "PUT", url: `${base}/attendance`, headers, payload: { participants: [{ studentId: "student-1", status: "present" }] } })).statusCode).toBe(200);
});
afterEach(async () => { await app.close(); p.database.close(); });

it('audit requires fresh authorization before replaying a classroom result for a revoked bearer',async()=>{
  const {SessionRegistry}=await import('../src/auth/session-registry.js');
  const sessions=new SessionRegistry(p.repositories.appClientSessions);
  const seed=createSeedData();
  const membership=seed.clubMemberships.find(m=>m.userId==='user-coach-1'&&m.clubId===clubId)!;
  const token=await sessions.create({clubId,appClientId:'app-client-cq-talent-wechat-main',userId:'user-coach-1',membershipId:membership.id,activeRole:'coach'});
  const actor={authorization:`Bearer ${token.token}`};
  const original=await save([row(73)],(await read()).revision,'audit-authorized-replay',actor);
  expect(original.statusCode).toBe(200);
  await sessions.revoke(token.token);
  const deniedRead=await app.inject({method:'GET',url:`${base}/training-content-assessments`,headers:actor});
  expect(deniedRead.statusCode).toBe(401);
  const replay=await save([row(73)],0,'audit-authorized-replay',actor);
  expect(replay.statusCode).toBe(401);
});

it('audit requires current course scope before replaying a classroom result after coach assignment removal',async()=>{
  const original=await save([row(74)],(await read()).revision,'audit-course-replay',assistantHeaders);
  expect(original.statusCode).toBe(200);
  store.removeCoachAssignment(clubId,'team-u10-dev','assistant');
  const denied=await app.inject({method:'GET',url:`${base}/training-content-assessments`,headers:assistantHeaders});
  expect(denied.statusCode).toBe(403);
  expect((await save([row(74)],0,'audit-course-replay',assistantHeaders)).statusCode).toBe(403);
});

it("replays a non-classroom ledger mutation once, but denies it after the administrator role is removed", async () => {
  const request = {
    method: "POST" as const,
    url: `/clubs/${clubId}/admin/students/student-1/lesson-adjustments`,
    headers: { "x-user-id": "user-admin-1", "idempotency-key": "ledger-response-loss" },
    payload: { entryType: "credit", lessonDelta: 1, source: "offline_recharge" },
  };
  const first = await app.inject(request);
  expect(first.statusCode).toBe(201);
  const second = await app.inject(request);
  expect(second.statusCode).toBe(201);
  expect(second.headers["idempotency-status"]).toBe("replayed");
  expect(second.json()).toEqual(first.json());
  const ledger = await store.getLessonLedger(clubId, "student-1");
  const membership = createSeedData().clubMemberships.find(member => member.userId === "user-admin-1" && member.clubId === clubId)!;
  await p.repositories.memberships.save({ ...membership, roles: ["coach"] });
  const denied = await app.inject(request);
  expect(denied.statusCode).toBe(403);
  expect(denied.headers["idempotency-status"]).toBeUndefined();
  expect(await store.getLessonLedger(clubId, "student-1")).toEqual(ledger);
});
