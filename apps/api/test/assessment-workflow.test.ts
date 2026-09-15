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
  it("publishes full incremental entries, preserves old results during correction, and replays safely", async () => {
    const items = store.listAssessmentTestItems(clubId).filter((i) => i.id.startsWith("assessment-test-cq-talent-"));
    const inputs = items.map((i) => ({ testItemId: i.id, value: { kind: "score_0_100" as const, score: 100 } }));
    await save(inputs.slice(0, 30), 0);
    await save(inputs.slice(30), 1);
    const before = store.getStudentMetrics(clubId, "student-1");
    const publish = () => app.inject({ method: "POST", url: `${base}/publications`, headers, payload: { students: [{ studentId: "student-1", expectedRevision: 2 }, { studentId: "student-2", expectedRevision: 0 }] } });
    const response = await publish();
    expect(response.json().results[0]).toMatchObject({ success: true, revision: 2, replayed: false });
    expect(response.json().results[1]).toMatchObject({ success: false });
    const published = store.getStudentMetrics(clubId, "student-1");
    expect(published.length - before.length).toBe(99);
    expect((await publish()).json().results[0].replayed).toBe(true);
    expect(store.getStudentMetrics(clubId, "student-1")).toEqual(published);
    expect((await save([entry("03", 60)], 2)).statusCode).toBe(400);
    expect((await save([entry("03", 60)], 2, { reason: "录入核对更正" })).statusCode).toBe(200);
    expect(store.getStudentMetrics(clubId, "student-1")).toEqual(published);
    const corrected = await app.inject({ method: "POST", url: `${base}/publications`, headers, payload: { students: [{ studentId: "student-1", expectedRevision: 3 }] } });
    expect(corrected.json().results[0].success).toBe(true);
    const history = await app.inject({ method: "GET", url: `${base}/students/student-1/history`, headers });
    expect(history.json().publications).toHaveLength(2);
    expect(history.json().changes[2]).toMatchObject({ reason: "录入核对更正", entries: [{ before: { score: 100 }, after: { score: 60 } }] });
    const full = await store.recordAssessment({ clubId, studentId: "student-1", assessedByCoachId: "coach-1", templateId: task.templateId, templateVersionId: "assessment-template-version-technical-table-20260904", rawResults: inputs });
    const incremental = published.filter((r) => r.assessmentId === response.json().results[0].assessmentId);
    expect(incremental.map((r) => [r.metricId, r.value]).sort()).toEqual(full.metricRecords.map((r) => [r.metricId, r.value]).sort());
  });
  it("rolls back published facts when the publication pointer cannot be persisted", async () => {
    const entries = store.listAssessmentTestItems(clubId).filter((i) => i.id.startsWith("assessment-test-cq-talent-")).map((i) => ({ testItemId: i.id, value: { kind: "score_0_100" as const, score: 80 } }));
    await save(entries, 0);
    const before = store.getStudentMetrics(clubId, "student-1");
    const spy = vi.spyOn(store.assessmentWorkflow, "save").mockImplementationOnce(() => { throw new Error("disk failure"); });
    await expect(assessmentWorkflow(store).publish(task, "student-1", "coach-1", 1)).rejects.toThrow("disk failure");
    spy.mockRestore();
    expect(store.getStudentMetrics(clubId, "student-1")).toEqual(before);
    expect((await assessmentWorkflow(store).state(task, "student-1")).publications).toHaveLength(0);
    expect((await assessmentWorkflow(store).publish(task, "student-1", "coach-1", 1)).replayed).toBe(false);
  });
  it("uses the standard score for graph computation while retaining raw values", async () => {
    const inputs = store.listAssessmentTestItems(clubId).filter((i) => i.id.startsWith("assessment-test-cq-talent-")).map((i) => ({ testItemId: i.id, value: { kind: "score_0_100" as const, score: 10 }, normalizedScore: 90 }));
    const result = await store.recordAssessment({ clubId, studentId: "student-1", assessedByCoachId: "coach-1", templateId: task.templateId, templateVersionId: "assessment-template-version-technical-table-20260904", rawResults: inputs });
    expect(result.metricRecords.find((r) => r.metricId === "metric-cq-talent-secondary-03")?.value).toMatchObject({ value: 4.5 });
    expect(result.rawResults[0]?.value).toMatchObject({ score: 10 });
    expect(result.metricRecords[0]?.confidence).toBeUndefined();
  });
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
