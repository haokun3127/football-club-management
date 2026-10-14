import { confirmedStudentResults } from "../src/application/confirmed-student-results.js";
import { correctTrainingRecord } from "../src/application/training-records.js";
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
const save = (entries: ReturnType<typeof entry>[], expectedRevision: number, extra = {}) => app.inject({ method: "PUT", url: `${base}/students/student-1/entries`, headers, payload: { entries:entries.map(e=>({eventId:"event-training-1",...e})), expectedRevision, ...extra } });

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
    const coachBase = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach`;
    const overview = await app.inject({ method: "GET", url: `${coachBase}/team/ability-overview?teamId=team-u10-dev`, headers });
    expect(overview.json().students.find((s: { studentId: string }) => s.studentId === "student-1").overall).toBe(100);
    const radar = await app.inject({ method: "GET", url: `${coachBase}/students/student-1/radar`, headers });
    expect(radar.statusCode, radar.body).toBe(200);
    expect(radar.json().overall).toBe(100);
    const confirmed = radar.json().confirmedResults;
    expect(confirmed).toHaveLength(inputs.length);
    expect(confirmed.every((row: { assessmentId: string }) => row.assessmentId === response.json().results[0].assessmentId)).toBe(true);
    expect(confirmed[0]).not.toHaveProperty("recordedByCoachId");
    expect(await confirmedStudentResults(store, clubId, "student-1", new Set(["unrelated-team"]))).toEqual([]);
    expect(store.listAbilityMetrics(clubId).find((m) => m.id === "metric-cq-talent-final-score")?.maxScore).toBe(90);
    const growthUrl = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/parent/students/student-1/growth-summary`;
    const growth = await app.inject({ method: "GET", url: growthUrl, headers: { "x-user-id": "user-parent-1" } });
    const publicationItems = growth.json().timeline.filter((i: { id: string }) => i.id.startsWith("assessment-publication-"));
    expect(publicationItems).toHaveLength(1);
    expect(publicationItems[0].abilityUpdate.metrics).toHaveLength(8);
    expect(publicationItems[0].abilityUpdate.metrics.every((m: { value: number }) => m.value === 100)).toBe(true);
    expect((await publish()).json().results[0].replayed).toBe(true);
    expect(store.getStudentMetrics(clubId, "student-1")).toEqual(published);
    expect((await save([entry("03", 60)], 2)).statusCode).toBe(400);
    expect((await save([entry("03", 60)], 2, { reason: "录入核对更正" })).statusCode).toBe(200);
    expect(store.getStudentMetrics(clubId, "student-1")).toEqual(published);
    expect(await confirmedStudentResults(store, clubId, "student-1", new Set([task.teamId]))).toEqual(confirmed);
    const corrected = await app.inject({ method: "POST", url: `${base}/publications`, headers, payload: { students: [{ studentId: "student-1", expectedRevision: 3 }] } });
    expect(corrected.json().results[0].success).toBe(true);
    const correctedRaw = await confirmedStudentResults(store, clubId, "student-1", new Set([task.teamId]));
    expect(correctedRaw).toHaveLength(inputs.length);
    expect(correctedRaw.every(row => row.assessmentId === corrected.json().results[0].assessmentId)).toBe(true);
    const correctedRecords = store.getStudentMetrics(clubId, "student-1").filter((record) => record.assessmentId === corrected.json().results[0].assessmentId);
    const final = correctedRecords.find((record) => record.metricId === "metric-cq-talent-final-score")!;
    expect(final.value.kind).toBe("measurement");
    if (final.value.kind === "measurement") {
      const correctedRadar = await app.inject({ method: "GET", url: `${coachBase}/students/student-1/radar`, headers });
      expect(correctedRadar.json().overall).toBe(Math.round(final.value.value / 90 * 1000) / 10);
    }
    const history = await app.inject({ method: "GET", url: `${base}/students/student-1/history`, headers });
    expect(history.json().publications).toHaveLength(2);
    expect(history.json().changes[2]).toMatchObject({ reason: "录入核对更正", entries: [{ before: { score: 100 }, after: { score: 60 } }] });
    const full = await store.recordAssessment({ clubId, studentId: "student-1", assessedByCoachId: "coach-1", templateId: task.templateId, templateVersionId: "assessment-template-version-technical-table-20260904", rawResults: inputs });
    const incremental = published.filter((r) => r.assessmentId === response.json().results[0].assessmentId);
    expect(incremental.map((r) => [r.metricId, r.value]).sort()).toEqual(full.metricRecords.map((r) => [r.metricId, r.value]).sort());
  });
  it("uses effective training corrections for course eligibility without altering the fixed task roster", async () => {
    await store.recordEventParticipants(clubId, "event-training-1", [{ studentId: "student-1", status: "leave_requested" }]);
    const flow = assessmentWorkflow(store);
    expect((await flow.courses(task, "coach-1")).find(course => course.id === "event-training-1")?.studentIds).not.toContain("student-1");
    const absent = store.trainingRecords.get(clubId, "event-training-1", "student-1")!;
    const attended = correctTrainingRecord(store.trainingRecords, absent, { expectedRevision: absent.revision, counted: true, actorUserId: "user-coach-1", reason: "实际参训" });
    expect((await flow.courses(task, "coach-1")).find(course => course.id === "event-training-1")?.studentIds).toContain("student-1");
    expect((await save([entry("03")], 0)).statusCode).toBe(200);
    correctTrainingRecord(store.trainingRecords, attended, { expectedRevision: attended.revision, counted: false, actorUserId: "user-parent-1", reason: "核对未到" });
    expect((await save([entry("03", 80)], 1)).json().error.code).toBe("invalid_assessment_course");
    expect((await flow.state(task, "student-1")).revision).toBe(1);
    expect(flow.roster(task)).toContain("student-1");
  });
  it("keeps a pinned archived template readable and publishable", async () => {
    const inputs = store.listAssessmentTestItems(clubId).filter((i) => i.id.startsWith("assessment-test-cq-talent-")).map((i) => ({ testItemId: i.id, value: { kind: "score_0_100" as const, score: 80 } }));
    await save(inputs, 0);
    const versionId = store.assessmentWorkflow.version(clubId, task.id)!;
    const config = await store.getDataCapabilityConfig(clubId);
    config.assessmentTemplateVersions.find((v) => v.id === versionId)!.status = "archived";
    const form = await app.inject({ method: "GET", url: `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/assessments/templates/${task.templateId}/form?templateVersionId=${versionId}`, headers });
    expect(form.statusCode, form.body).toBe(200);
    expect((await assessmentWorkflow(store).publish(task, "student-1", "coach-1", 1)).replayed).toBe(false);
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
  it("preserves per-item course time across late entry and publication, and revisions a course-only correction", async () => {
    const source=(await store.getCalendarEvent("event-training-1"))!;
    await store.saveCalendarEvent({...source,id:"second-course",timeRange:{startsAt:"2026-07-02T09:00:00.000Z",endsAt:"2026-07-02T10:00:00.000Z"}});
    await store.recordEventParticipants(clubId,"second-course",[{studentId:"student-1",status:"present"}]);
    const first=await save([{...entry("03"),eventId:source.id} as ReturnType<typeof entry>],0);
    expect(first.statusCode,first.body).toBe(200);expect(first.json().entries[entry("03").testItemId]).toMatchObject({eventId:source.id,occurredAt:source.timeRange.startsAt,recordedAt:expect.any(String)});
    const second=await save([{...entry("03"),eventId:"second-course"} as ReturnType<typeof entry>],1);
    expect(second.statusCode,second.body).toBe(200);expect(second.json().revision).toBe(2);
    expect(second.json().changes[1].entries[0]).toMatchObject({beforeEventId:source.id,afterEventId:"second-course",before:{score:75},after:{score:75}});
    const inputs=store.listAssessmentTestItems(clubId).filter(i=>i.id.startsWith("assessment-test-cq-talent-")).map(i=>({testItemId:i.id,value:{kind:"score_0_100" as const,score:80},eventId:i.id===entry("03").testItemId?"second-course":source.id}));
    await save(inputs,2);const result=await assessmentWorkflow(store).publish(task,"student-1","coach-1",3);
    const facts=store.listMetricRecords(clubId).filter(r=>r.assessmentId===result.assessmentId && r.source==="assessment");
    expect(new Set(facts.map(r=>r.occurredAt))).toEqual(new Set([source.timeRange.startsAt,"2026-07-02T09:00:00.000Z"]));
    expect(persistence.repositories.assessments.listRawResults(clubId).filter(r=>r.assessmentId===result.assessmentId).every(r=>r.eventId && r.recordedAt && r.occurredAt)).toBe(true);
    const invalid=await save([{...entry("03"),eventId:"event-match-1"} as ReturnType<typeof entry>],3,{reason:"核对"});expect(invalid.statusCode).toBe(400);
    await store.saveAssessmentTask({...task,id:"new-task"});
    const missing=await app.inject({method:"PUT",url:`${base.replace(task.id,"new-task")}/students/student-1/entries`,headers,payload:{expectedRevision:0,entries:[entry("03")]}});expect(missing.statusCode).toBe(400);expect(missing.json().error.code).toBe("assessment_course_required");
  });
  it("blocks disabled writes and unauthorized students while allowing late entry", async () => {
    await save([entry("03")], 0);
    vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS", "");
    expect((await save([entry("04")], 1)).statusCode).toBe(409);
    expect((await app.inject({ method: "GET", url: `${base}/workflow`, headers })).json().canEdit).toBe(false);
    expect((await app.inject({ method: "POST", url: `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/assessments`, headers,
      payload: { studentId: "student-1", templateId: task.templateId, assessmentTaskId: task.id, rawResults: [entry("03")] } })).statusCode).toBe(409);
    vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS", clubId);
    expect((await app.inject({ method: "PUT", url: `${base}/students/not-in-team/entries`, headers, payload: { expectedRevision: 0, entries: [entry("03")] } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `${base}/workflow`, headers: { "x-user-id": "user-parent-1" } })).statusCode).toBe(403);
    await store.saveAssessmentTask({ ...task, dueOn: "2026-07-31" });
    expect((await save([entry("04")], 1)).statusCode).toBe(200);
  });
});

 describe("fixed assessment selections", () => {
   const listBase = base.slice(0,base.lastIndexOf("/"));
   const payload = {...task,id:undefined,clubId:undefined,studentIds:["student-1"],testItemIds:["assessment-test-cq-talent-03"],sourceEventId:"event-training-1"};
   it.each(["absent", "leave_requested", "excused"] as const)("retains %s students as task objects without permitting entry against an unparticipated course", async (status) => {
     await store.recordEventParticipants(clubId, "event-training-1", [{ studentId: "student-1", status }]);
     const options = await app.inject({ method: "GET", url: `${listBase}?sourceEventId=event-training-1`, headers });
     expect(options.statusCode, options.body).toBe(200);
     expect(options.json().sourceCourse.studentIds).toContain("student-1");

     expect(options.json().sourceCourse.attendance).toContainEqual({ studentId: "student-1", status });

     for (const studentIds of [["student-1"], undefined]) {
       const created = await app.inject({ method: "POST", url: listBase, headers, payload: { ...payload, studentIds } });
       expect(created.statusCode, created.body).toBe(201);
       const selected = created.json().task;
       expect(selected.studentIds).toContain("student-1");
       const workflow = assessmentWorkflow(store);
       const before = await workflow.state(selected, "student-1");
       const denied = await app.inject({
         method: "PUT", url: `${listBase}/${selected.id}/students/student-1/entries`, headers,
         payload: { expectedRevision: 0, entries: [{ ...entry("03"), eventId: "event-training-1" }] },
       });
       expect(denied.statusCode, denied.body).toBe(400);
       expect(denied.json().error.code).toBe("invalid_assessment_course");
       expect(await workflow.state(selected, "student-1")).toEqual(before);
       const listed = await app.inject({ method: "GET", url: listBase, headers });
       expect(listed.json().tasks.find((t: { id: string }) => t.id === selected.id)).toMatchObject({ status: "in_progress", studentIds: expect.arrayContaining(["student-1"]), workflow: { publishedStudents: 0 } });

       // Attendance changes never silently shrink the task's fixed selection.
       const member = store.listTeamMembers(clubId).find((m) => m.teamId === task.teamId && m.studentId === "student-1")!;
       store.saveTeamMember({ ...member, status: "inactive" });
       expect(workflow.roster(selected)).toContain("student-1");
       store.saveTeamMember(member);
     }
   });
   it("keeps source-course choices and writes within the active authorized roster", async () => {
     const member = store.listTeamMembers(clubId).find((m) => m.teamId === task.teamId && m.studentId === "student-1")!;
     store.saveTeamMember({ ...member, status: "inactive" });
     const options = await app.inject({ method: "GET", url: `${listBase}?sourceEventId=event-training-1`, headers });
     expect(options.statusCode, options.body).toBe(200);
     expect(options.json().sourceCourse.studentIds).not.toContain("student-1");
     expect(options.json().sourceCourse.attendance.some((p: { studentId: string }) => p.studentId === "student-1")).toBe(false);
     const denied = await app.inject({ method: "POST", url: listBase, headers, payload });
     expect(denied.statusCode, denied.body).toBe(400);
     expect(denied.json().error.code).toBe("invalid_task_students");
     const unauthorized = await app.inject({ method: "POST", url: listBase, headers: { "x-user-id": "user-parent-1" }, payload });
     expect(unauthorized.statusCode).toBe(403);
   });
   it("replays a task creation retry without adding another task", async () => {
     const before=(await store.listAssessmentTasks(clubId)).length;
     const request={method:"POST" as const,url:listBase,headers:{...headers,"idempotency-key":"assessment-task-retry"},payload};
     const first=await app.inject(request);const retry=await app.inject(request);
     expect(first.statusCode,first.body).toBe(201);expect(retry.statusCode,retry.body).toBe(201);
     expect(retry.json().task.id).toBe(first.json().task.id);
     expect((await store.listAssessmentTasks(clubId)).length).toBe(before+1);
     expect((await app.inject({...request,payload:{...payload,title:"different"}})).statusCode).toBe(409);
   });
   it("validates selected students, template items, source course and period before writing", async () => {
     const before = (await store.listAssessmentTasks(clubId)).length;
     for(const patch of [{studentIds:["student-unknown"]},{studentIds:[]},{testItemIds:["invalid"]},{sourceEventId:"event-match-1"},{startsOn:"2099-01-01"},{title:"  "}]) {
       const response=await app.inject({method:"POST",url:listBase,headers,payload:{...payload,...patch}});
       expect(response.statusCode,response.body).toBeGreaterThanOrEqual(400);
     }
     expect((await store.listAssessmentTasks(clubId)).length).toBe(before);
     const options=await app.inject({method:"GET",url:`${listBase}?sourceEventId=event-training-1`,headers});
     expect(options.statusCode,options.body).toBe(200);
     expect(options.json().sourceCourse.studentIds).toContain("student-1");
     expect(options.json().teams.find((t:{id:string})=>t.id===task.teamId).students[0]).toEqual(expect.objectContaining({id:expect.any(String),name:expect.any(String)}));
   });
   it("keeps fixed students after roster changes, rejects extra items and publishes no invented aggregate", async () => {
     const response=await app.inject({method:"POST",url:listBase,headers,payload});
     expect(response.statusCode,response.body).toBe(201);
     const selected=response.json().task;
     const member=store.listTeamMembers(clubId).find((m)=>m.teamId===task.teamId&&m.studentId==="student-1")!;
     store.saveTeamMember({...member,status:"inactive"});
     const workflow=assessmentWorkflow(store);
     expect(workflow.roster(selected)).toEqual(["student-1"]);
     expect((await workflow.definition(selected)).bindings).toHaveLength(1);
     await expect(workflow.save(selected,"student-2","coach-1",{expectedRevision:0,entries:[{...entry("03"),eventId:"event-training-1"}]})).rejects.toThrow("学员不在");
     await expect(workflow.save(selected,"student-1","coach-1",{expectedRevision:0,entries:[{...entry("04"),eventId:"event-training-1"}]})).rejects.toThrow("不匹配");
     await workflow.save(selected,"student-1","coach-1",{expectedRevision:0,entries:[{...entry("03",0),eventId:"event-training-1"}]});
     const publication=await workflow.publish(selected,"student-1","coach-1",1);
     const facts=store.getStudentMetrics(clubId,"student-1").filter((r)=>r.assessmentId===publication.assessmentId);
     expect(facts.filter((r)=>r.source==="assessment")).toHaveLength(1);
     expect(facts.find((r)=>r.source==="assessment")?.value).toEqual({kind:"score_0_100",score:0});
     expect(facts.some((r)=>r.metricId==="metric-cq-talent-final-score")).toBe(false);
     const listed=await app.inject({method:"GET",url:listBase,headers});
     expect(listed.json().tasks.find((t:{id:string})=>t.id===selected.id)).toMatchObject({status:"completed",totalStudents:1,studentIds:["student-1"]});
     await workflow.save(selected,"student-1","coach-1",{expectedRevision:1,entries:[{...entry("03",60),eventId:"event-training-1"}],reason:"核对更正"});
     const corrected=await app.inject({method:"GET",url:listBase,headers});
     expect(corrected.json().tasks.find((t:{id:string})=>t.id===selected.id)).toMatchObject({status:"in_progress",workflow:{publishedStudents:0}});
   });
 });
