import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("atomic revisioned classroom assessments", () => {
  it("rejects an invalid later row before changing any earlier row", async () => {
    const before = await read();
    const rejected = await save([row(50), row(30, secondProject, "not-on-roster")], before.revision);
    expect(rejected.statusCode).toBe(400);
    expect((await read()).assessments).toEqual(before.assessments);
    const invalidProject = await save([row(50), row(30, "not-selected")], before.revision);
    expect(invalidProject.statusCode).toBe(400);
    expect(await read()).toEqual(before);
  });

  it("rejects a stale full snapshot and keeps another client's saved cell", async () => {
    expect((await save([row(70), row(60, secondProject)], (await read()).revision)).statusCode).toBe(200);
    const a = await read(); const b = await read(assistantHeaders);
    const updatedA = await save([row(90), row(60, secondProject)], a.revision, "client-a");
    expect(updatedA.statusCode).toBe(200);
    expect(updatedA.json().revision).toBe(a.revision + 1);
    const updatedB = await save([row(70), row(80, secondProject)], b.revision, "client-b", assistantHeaders);
    expect(updatedB.statusCode).toBe(409);
    expect(updatedB.json().error.code).toBe("training_assessment_revision_conflict");
    expect((await read()).assessments.map((item: { score: number }) => item.score)).toEqual([90, 60]);
    // A lost response replay must not rewrite a later successful revision.
    const next = await read();
    expect((await save([row(95)], next.revision, "client-next", assistantHeaders)).statusCode).toBe(200);
    const replay = await save([row(90), row(60, secondProject)], a.revision, "client-a");
    expect(replay.statusCode).toBe(200);
    expect(replay.headers["idempotency-status"]).toBe("replayed");
    expect((await read()).assessments.find((item: { trainingProjectId: string }) => item.trainingProjectId === firstProject).score).toBe(95);
  });

  it("allows one concurrent CAS writer and does not leave a mixed batch", async () => {
    const initial = await read();
    const result = await Promise.all([save([row(10), row(20, secondProject)], initial.revision), save([row(30), row(40, secondProject)], initial.revision)]);
    expect(result.map(response => response.statusCode).sort()).toEqual([200, 409]);
    const scores = (await read()).assessments.map((item: { score: number }) => item.score);
    expect([[10, 20], [30, 40]]).toContainEqual(scores);
    expect((await read()).revision).toBe(initial.revision + 1);
  });

  it("rejects legacy writes with 428 before idempotency pruning or any storage change", async () => {
    const before = await read();
    const changes = p.database.prepare("SELECT total_changes() AS n").get()!.n;
    const legacy = await save([row(88)], undefined, "old-client");
    expect(legacy.statusCode).toBe(428);
    expect(legacy.json().error.code).toBe("precondition_required");
    expect(p.database.prepare("SELECT total_changes() AS n").get()!.n).toBe(changes);
    expect(await read()).toEqual(before);
  });

  it("rolls back every row and its revision on a later persistence failure, then recovers", async () => {
    const before = await read();
    p.database.exec(`CREATE TRIGGER reject_second_assessment BEFORE INSERT ON training_content_assessments WHEN NEW.training_project_id = '${secondProject}' BEGIN SELECT RAISE(ABORT, 'synthetic batch failure'); END;`);
    expect((await save([row(50), row(60, secondProject)], before.revision)).statusCode).toBe(500);
    expect(await read()).toEqual(before);
    p.database.exec("DROP TRIGGER reject_second_assessment");
    expect((await save([row(50), row(60, secondProject)], before.revision)).statusCode).toBe(200);
    const current = await read();
    expect(current.revision).toBe(before.revision + 1);
    expect(current.assessments).toHaveLength(2);
  });

  it("documents the revision write, read snapshot and rejection statuses in OpenAPI", async () => {
    const document = (await app.inject("/openapi.json")).json();
    const operations = document.paths["/clubs/{clubId}/app-clients/{clientId}/coach/events/{eventId}/training-content-assessments"];
    expect(operations.get.responses["200"].content["application/json"].schema.required).toContain("revision");
    expect(operations.put.requestBody.content["application/json"].schema.properties.expectedRevision).toMatchObject({ type: "integer", minimum: 0 });
    expect(operations.put.responses["409"]).toBeDefined();
    expect(operations.put.responses["428"]).toBeDefined();
  });
});
