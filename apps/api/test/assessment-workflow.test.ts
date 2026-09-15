import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { assessmentWorkflow } from "../src/application/assessment-workflow.js";

const clubId = "club-chongqing-talent";
const task = { id: "workflow-task", clubId, teamId: "team-u10-dev", templateId: "assessment-template-technical", termLabel: "2026", title: "Test", startsOn: "2020-01-01", dueOn: "2099-12-31" };
const base = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/assessment-tasks/${task.id}`;
const headers = { "x-user-id": "user-coach-1" };
const entry = (suffix: string, score = 75) => ({ testItemId: `assessment-test-cq-talent-${suffix}`, value: { kind: "score_0_100" as const, score } });
let persistence: Awaited<ReturnType<typeof createPlatformPersistence>>;
let store: PersistentApiStore;
let app: ReturnType<typeof buildServer>;
beforeEach(async () => {
  vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS", clubId);
  persistence = await createPlatformPersistence({ databasePath: ":memory:" });
  store = new PersistentApiStore(persistence.repositories);
  await store.saveAssessmentTask(task);
  app = buildServer(store, { logger: false, membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
});
afterEach(async () => { await app.close(); persistence.database.close(); vi.unstubAllEnvs(); });
const save = (entries: ReturnType<typeof entry>[], expectedRevision: number, extra = {}) => app.inject({ method: "PUT", url: `${base}/students/student-1/entries`, headers, payload: { entries, expectedRevision, ...extra } });

describe("project-first assessment workflow", () => {
  it("saves independent projects without creating published metric records and reads both back", async () => {
    const before = store.getStudentMetrics(clubId, "student-1");
    expect((await save([entry("03", 0)], 0)).statusCode).toBe(200);
    expect((await save([entry("04")], 1)).statusCode).toBe(200);
    for (const suffix of ["03", "04"]) {
      const result = await app.inject({ method: "GET", url: `${base}/projects/assessment-test-cq-talent-${suffix}/entries`, headers });
      expect(result.statusCode).toBe(200);
      expect(result.json().savedValuesByStudent["student-1"][`assessment-test-cq-talent-${suffix}`].score).toBe(suffix === "03" ? 0 : 75);
      expect(result.json().studentStates["student-1"].revision).toBe(2);
    }
    expect(store.getStudentMetrics(clubId, "student-1")).toEqual(before);
    const summary = await app.inject({ method: "GET", url: `${base}/workflow`, headers });
    expect(summary.json().students.find((s: { studentId: string }) => s.studentId === "student-1")).toMatchObject({ completedFields: 2, totalFields: 62, canPublish: false });
    expect(summary.json().totalStudents).toBeGreaterThan(0);
  });
  it("rejects stale writes and invalid scores, while an identical retry is a no-op", async () => {
    expect((await save([entry("03")], 0)).statusCode).toBe(200);
    expect((await save([entry("03")], 0)).json().revision).toBe(1);
    expect((await save([entry("04")], 0)).statusCode).toBe(409);
    expect((await save([entry("04", 101)], 1)).statusCode).toBe(400);
    expect((await save([entry("03"), entry("03")], 1)).statusCode).toBe(400);
    const state = await assessmentWorkflow(store).state(task, "student-1");
    expect(state.changes).toHaveLength(1);
    expect(state.entries["assessment-test-cq-talent-04"]).toBeUndefined();
  });
  it("blocks disabled writes, legacy bypass, cutoff and unauthorized students", async () => {
    await save([entry("03")], 0);
    vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS", "");
    expect((await save([entry("04")], 1)).statusCode).toBe(409);
    expect((await app.inject({ method: "GET", url: `${base}/workflow`, headers })).json().canEdit).toBe(false);
    expect((await app.inject({ method: "POST", url: `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/assessments`, headers,
      payload: { studentId: "student-1", templateId: task.templateId, assessmentTaskId: task.id, rawResults: [entry("03")] } })).statusCode).toBe(409);
    vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS", clubId);
    expect((await app.inject({ method: "PUT", url: `${base}/students/not-in-team/entries`, headers, payload: { expectedRevision: 0, entries: [entry("03")] } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `${base}/workflow`, headers: { "x-user-id": "user-parent-1" } })).statusCode).toBe(403);
    await store.saveAssessmentTask({ ...task, dueOn: "2020-01-02" });
    expect((await save([entry("04")], 1)).statusCode).toBe(409);
  });
});
