import { describe, expect, it } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { resourceByKey } from "../src/application/backoffice-resources.js";
const clubId = "club-chongqing-talent", appClientId = "app-client-cq-talent-wechat-main";
async function fixture() {
 const p = await createPlatformPersistence({ databasePath: ":memory:" }); const store = new PersistentApiStore(p.repositories), sessions = new SessionRegistry(p.repositories.appClientSessions);
 const app = buildServer(store, { logger: false, sessionRegistry: sessions, membershipResolver: createProductionMembershipResolver(p.repositories.users, p.repositories.memberships) });
 async function headers(role: "coach" | "parent") { const userId = `user-${role}-1`, member = await p.repositories.memberships.findActiveByClubAndUser(clubId,userId); const result = await sessions.create({clubId,appClientId,userId,membershipId:member!.id,activeRole:role}); return {authorization:`Bearer ${result.token}`}; }
 return {p,store,app,headers};
}
describe("release public projections", () => {
 it("reads configured phrases, snapshots wording, retains retired current choices without allowing new selection", async () => {
  const {p,store,app,headers} = await fixture();
  try {
   const coach = await headers("coach"), parent = await headers("parent"), resource = resourceByKey("evaluation-phrases")!;
   const savePhrase = (text:string,status:string,create=false) => p.repositories.backofficeManagement.save(resource,clubId,"release-phrase",{name:"观察",text,status,tags:[]},new Date().toISOString(),create);
   savePhrase("主动观察场上变化","active",true);
   const base=`/clubs/${clubId}/app-clients/${appClientId}/students/student-1/evaluations`;
   const initial=await app.inject({url:base,headers:coach}); const team=initial.json().teams[0].id;
   expect(initial.json().phrases).toContainEqual({id:"configured:release-phrase",text:"主动观察场上变化"});
   const put=(student:string,revision:number) => app.inject({method:"PUT",url:base.replace("student-1",student)+`/${team}`,headers:coach,payload:{expectedRevision:revision,phraseIds:["configured:release-phrase"],note:""}});
   expect((await put("student-1",0)).statusCode).toBe(200);
   savePhrase("更新用语","active");
   expect((await app.inject({url:base,headers:parent})).json().teams[0].evaluation.history[0].phrases[0].text).toBe("主动观察场上变化");
   savePhrase("更新用语","inactive");
   expect((await put("student-1",1)).json().evaluation.revision).toBe(1);
   expect(store.studentEvaluations.get(clubId,team,"student-1")!.history).toHaveLength(1);
   const removed=await app.inject({method:"PUT",url:base+`/${team}`,headers:coach,payload:{expectedRevision:1,phraseIds:[],note:""}});expect(removed.statusCode).toBe(200);
   expect((await put("student-1",2)).statusCode).toBe(400);
   expect(store.studentEvaluations.get(clubId,team,"student-1")!.history).toHaveLength(2);
  } finally {await app.close();p.database.close();}
 });
 it("exposes only a bound child's confirmed raw/mapped values and versions with no recorder fields or unscoped facts", async () => {
  const {p,store,app,headers} = await fixture();
  try {
   const parent=await headers("parent"),coach=await headers("coach");
   const items=store.listAssessmentTestItems(clubId).filter(i=>i.id.startsWith("assessment-test-cq-talent-"));
   const published=await store.recordAssessment({clubId,studentId:"student-1",assessedByCoachId:"coach-1",templateId:"assessment-template-technical",templateVersionId:"assessment-template-version-technical-table-20260904",eventId:"event-training-1",rawResults:items.map(i=>({testItemId:i.id,value:{kind:"score_0_100" as const,score:75}}))});
   const raw=store.listAssessmentRawResults(clubId).find(r=>r.assessmentId===published.assessment.id)!;
   const mapping={integerScore:80,grade:"A+",rawScoreVersionId:"fixture-raw-v1",gradeVersionId:"fixture-grade-v1",mappedAt:new Date().toISOString()};
   p.database.prepare("UPDATE assessment_raw_results SET mapping_json=? WHERE id=?").run(JSON.stringify(mapping),raw.id);
   const path=`/clubs/${clubId}/app-clients/${appClientId}/parent/students/student-1/confirmed-results`;
   const response=await app.inject({url:path,headers:parent});expect(response.statusCode,response.body).toBe(200);
   const row=response.json().confirmedResults.find((r:{id:string})=>r.id===raw.id);expect(row.value).toEqual(raw.value);expect(row.mapping).toEqual(mapping);expect(row).not.toHaveProperty("recordedByCoachId");expect(row).not.toHaveProperty("note");
   expect((await app.inject({url:path,headers:coach})).statusCode).toBe(403);
   expect((await app.inject({url:path.replace("student-1","foreign-child"),headers:parent})).statusCode).toBe(403);
   expect((await app.inject("/openapi.json")).json().paths["/clubs/{clubId}/app-clients/{clientId}/parent/students/{studentId}/confirmed-results"]).toBeDefined();
  }finally{await app.close();p.database.close();}
 });
});
