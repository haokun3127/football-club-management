import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createPlatformPersistence } from "../../../../apps/api/src/persistence/platform-persistence.ts";
import { PersistentApiStore } from "../../../../apps/api/src/store.ts";
import { assessmentWorkflow } from "../../../../apps/api/src/application/assessment-workflow.ts";
import { buildServer } from "../../../../apps/api/src/server.ts";
import { HeaderMembershipResolver } from "../../../../apps/api/src/auth/context.ts";

// Synthetic identities and in-memory SQLite only. No real environment requests.
const clubId = "club-chongqing-talent";
const previousFlag = process.env.FCM_ASSESSMENT_PUBLICATION_CLUBS;
process.env.FCM_ASSESSMENT_PUBLICATION_CLUBS = clubId;
const persistence = await createPlatformPersistence({databasePath:":memory:"});
const store = new PersistentApiStore(persistence.repositories);
const app = buildServer(store,{logger:false,membershipResolver:new HeaderMembershipResolver(persistence.repositories.users,persistence.repositories.memberships)});
try {
  const now = Date.now();
  const original = store.listCalendarEvents(clubId).find(event=>event.id === "event-training-1");
  assert(original);
  const task = {id:"coach-future-course-probe",clubId,teamId:"team-u10-dev",templateId:"assessment-template-technical",termLabel:"synthetic",title:"Synthetic period task",startsOn:"2020-01-01",dueOn:"2099-12-31",studentIds:["student-1"],testItemIds:["assessment-test-cq-talent-03"]};
  await store.saveAssessmentTask(task);
  const future = {...original,status:"scheduled" as const,timeRange:{startsAt:new Date(now+3600000).toISOString(),endsAt:new Date(now+7200000).toISOString()}};
  await store.saveCalendarEvent(future);
  const options = await app.inject({method:"GET",url:`/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/assessment-tasks?sourceEventId=${original.id}&teamId=${task.teamId}`,headers:{"x-user-id":"user-coach-1"}});
  assert.equal(options.statusCode,200);
  const response = options.json();
  const optionsContainsTask = response.tasks.some((item:{id:string})=>item.id === task.id);
  const futureEligible = (await assessmentWorkflow(store).courses(task,"coach-1",true)).some(course=>course.id === original.id);
  const started = {...future,timeRange:{startsAt:new Date(now-3600000).toISOString(),endsAt:new Date(now+3600000).toISOString()}};
  await store.saveCalendarEvent(started);
  const startedEligible = (await assessmentWorkflow(store).courses(task,"coach-1",true)).some(course=>course.id === original.id);
  assert.equal(optionsContainsTask,true);
  assert.equal(futureEligible,false);
  assert.equal(startedEligible,true);
  const result = {checkedAt:new Date(now).toISOString(),method:"real options HTTP injection + real AssessmentWorkflow.courses; in-memory SQLite",sourceRevision:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(), apiDependency:"2eb8518cacbdeff47f63a7f69a4d13dcb5089713",futureStartsAt:future.timeRange.startsAt,optionsContainsTask,futureEligible,startedEligible,conclusion:"Authorized periodic tasks may be listed before a particular course has started. A not-yet-started course is not currently eligible for entry."};
  writeFileSync(new URL("./future-course-result.json",import.meta.url),JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result));
} finally {
  await app.close();persistence.database.close();
  if(previousFlag === undefined)delete process.env.FCM_ASSESSMENT_PUBLICATION_CLUBS;else process.env.FCM_ASSESSMENT_PUBLICATION_CLUBS=previousFlag;
}
