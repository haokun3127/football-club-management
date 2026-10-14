import {describe,it,expect,vi} from "vitest";
import {createPlatformPersistence} from "../src/persistence/platform-persistence.js";
import {createSeedData} from "../src/seed.js";
import {PersistentApiStore} from "../src/store.js";
import {buildServer} from "../src/server.js";
import {HeaderMembershipResolver} from "../src/auth/context.js";

describe("explicit team coaching scope",()=>{
 it("grants assessment collaboration without course editing and revokes access immediately",async()=>{
  vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS","club-chongqing-talent");
  const seed=createSeedData(); const clubId="club-chongqing-talent";
  seed.users.push({...seed.users.find(u=>u.id==="user-coach-1")!,id:"user-assistant"});
  seed.coaches.push({...seed.coaches.find(c=>c.id==="coach-1")!,id:"assistant",userId:"user-assistant"});
  seed.clubMemberships.push({...seed.clubMemberships.find(m=>m.userId==="user-coach-1"&&m.clubId===clubId)!,id:"member-assistant",userId:"user-assistant"});
  const persistence=await createPlatformPersistence({databasePath:":memory:",seedData:seed});
  const store=new PersistentApiStore(persistence.repositories,seed);const app=buildServer(store,{logger:false,membershipResolver:new HeaderMembershipResolver(persistence.repositories.users,persistence.repositories.memberships)});
  const headers={"x-user-id":"user-assistant"};const admin={"x-user-id":"user-admin-1"};const base=`/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach`;
  const assignment=`/clubs/${clubId}/teams/team-u10-dev/coach-assignments/assistant`;
  const task={id:"shared-task",clubId,teamId:"team-u10-dev",templateId:"assessment-template-technical",title:"协同",termLabel:"2026",startsOn:"2026-01-01",dueOn:"2026-12-31"};await store.saveAssessmentTask(task);
  try {
   expect((await app.inject({method:"GET",url:`${base}/assessment-tasks/${task.id}/workflow`,headers})).statusCode).toBe(403);
   expect((await app.inject({method:"GET",url:`${base}/students/student-1/radar`,headers})).statusCode).toBe(403);
   expect((await app.inject({method:"PUT",url:assignment,headers,payload:{role:"assistant_coach",expectedRole:null}})).statusCode).toBe(403);
   const grant=await app.inject({method:"PUT",url:assignment,headers:admin,payload:{role:"assistant_coach",expectedRole:null}});expect(grant.statusCode,grant.body).toBe(200);
   expect((await app.inject({method:"GET",url:`${base}/assessment-tasks/${task.id}/workflow`,headers})).statusCode).toBe(200);
   const profile=await app.inject({method:"GET",url:`${base}/students/student-1/radar`,headers});expect(profile.statusCode,profile.body).toBe(200);expect(profile.json().profile.student).not.toHaveProperty("contacts");
   const save=await app.inject({method:"PUT",url:`${base}/assessment-tasks/${task.id}/students/student-1/entries`,headers,payload:{expectedRevision:0,entries:[{testItemId:"assessment-test-cq-talent-03",eventId:"event-training-1",value:{kind:"score_0_100",score:80}}]}});expect(save.statusCode,save.body).toBe(200);
   expect((await app.inject({method:"PUT",url:`${base}/events/event-training-1/training-projects`,headers,payload:{projectIds:["drill-finishing-1"]}})).statusCode).toBe(403);
   for(const route of ["sessions","sessions/ensure"]) expect((await app.inject({method:"POST",url:`/clubs/${clubId}/training/${route}`,headers,payload:{eventId:"event-training-1",kind:"team",sessionPlanId:"session-plan-finishing"}})).statusCode).toBe(403);
   expect((await app.inject({method:"PUT",url:assignment,headers:admin,payload:{role:null,expectedRole:null}})).statusCode).toBe(409);
   const revoke=await app.inject({method:"PUT",url:assignment,headers:admin,payload:{role:null,expectedRole:"assistant_coach"}});expect(revoke.statusCode,revoke.body).toBe(200);
   expect((await app.inject({method:"GET",url:`${base}/assessment-tasks/${task.id}/workflow`,headers})).statusCode).toBe(403);
   expect((await app.inject({method:"GET",url:`${base}/students/student-1/radar`,headers})).statusCode).toBe(403);
   expect(store.listCoachAssignments("another-club")).toEqual([]);
  } finally {await app.close();persistence.database.close();vi.unstubAllEnvs();}
 });
});
