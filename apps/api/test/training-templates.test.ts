import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { createSeedData } from "../src/seed.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { buildServer } from "../src/server.js";

describe("reviewed training template/copy flow", () => {
 it.each(["merge", "replace"] as const)("previews and persists %s without copying friendly content or changing other course facts", async (action) => {
  const dir = mkdtempSync(join(tmpdir(), "cq-copy-outcome-"));
  const seed = createSeedData(), clubId = "club-chongqing-talent";
  const source = seed.events.find(event => event.id === "event-training-1")!;
  seed.events.push({ ...source, id: "merge-target", title: "目标", status: "scheduled", timeRange: { startsAt: "2099-10-01T09:00:00Z", endsAt: "2099-10-01T10:00:00Z" } });
  seed.drills[1]!.recordingCapability = "friendly_match";
  const persistence = await createPlatformPersistence({ databasePath: join(dir, "fixture.sqlite"), seedData: seed });
  const store = new PersistentApiStore(persistence.repositories, seed);
  const block = (index: number, minutes: number) => ({ id: `block-${index}`, drillId: seed.drills[index]!.id, order: index + 1, plannedMinutes: minutes, notes: `备注${minutes}` });
  const plan = { id: "merge-source", catalogScope: { scope: "club" as const, clubId }, name: "来源", objectiveIds: [], metricIds: [], blocks: [block(0, 7), block(1, 8), block(2, 9)], estimatedMinutes: 24, createdAt: source.createdAt, updatedAt: source.updatedAt };
  store.saveSessionPlan(plan); store.ensureTrainingSessionForEvent(clubId, source.id, { sessionPlanId: plan.id });
  const existing = { ...plan, id: "merge-existing", blocks: [block(0, 20), block(1, 30)], estimatedMinutes: 50 };
  store.saveSessionPlan(existing); store.ensureTrainingSessionForEvent(clubId, "merge-target", { sessionPlanId: existing.id });
  const eventBefore = await store.getCalendarEvent("merge-target");
  const app = buildServer(store, { logger: false, membershipResolver: new HeaderMembershipResolver(persistence.repositories.users, persistence.repositories.memberships) });
  const base = `/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/training-content`;
  const headers = { "x-user-id": "user-coach-1" };
  try {
   const preview = await app.inject({ method: "POST", url: `${base}/preview`, headers, payload: { sourceEventId: source.id } });
   expect(preview.statusCode, preview.body).toBe(200);
   const target = preview.json().targets.find((item: any) => item.eventId === "merge-target");
   expect(target.outcomes.merge).toMatchObject({ count: 3, configuredMinutes: 59 });
   expect(target.outcomes.replace).toMatchObject({ count: 2, configuredMinutes: 16 });
   const payload = { sourceEventId: source.id, sourceRevision: preview.json().source.revision, targets: [{ eventId: target.eventId, expectedRevision: target.revision, action }] };
   const drill = store.listTrainingDrills(clubId).find(d => d.id === seed.drills[0]!.id)!;
   const name = drill.name; drill.name = `${name}修订`;
   expect((await app.inject({ method: "POST", url: `${base}/apply`, headers, payload })).statusCode).toBe(409);
   drill.name = name;
   const denied = await app.inject({ method: "POST", url: `${base}/apply`, headers: { "x-user-id": "user-parent-1" }, payload });
   expect(denied.statusCode).toBe(403);
   expect(store.getSessionPlan(existing.id)).toEqual(existing);
   const result = await app.inject({ method: "POST", url: `${base}/apply`, headers, payload });
   expect(result.json().results).toEqual([{ eventId: "merge-target", status: "applied" }]);
   const saved = store.getSessionPlan("session-plan-app-client-merge-target")!;
   expect(saved.blocks.map(b => ({ id: b.drillId, configuredMinutes: b.plannedMinutes }))).toEqual(target.outcomes[action].items.map((b: any) => ({ id: b.id, configuredMinutes: b.configuredMinutes })));
   expect(saved.estimatedMinutes).toBe(target.outcomes[action].configuredMinutes);
   expect(saved.blocks[0]!.notes).toBe(action === "merge" ? "备注20" : "备注7");
   expect(await store.getCalendarEvent("merge-target")).toEqual(eventBefore);
   expect((await app.inject({ method: "POST", url: `${base}/apply`, headers, payload })).json().results[0].status).toBe("conflict");
   expect(persistence.repositories.sessionPlans.getById(clubId, saved.id)).toEqual(saved);
   const fresh = (await app.inject({ method: "POST", url: `${base}/preview`, headers, payload: { sourceEventId: source.id } })).json();
   const freshTarget = fresh.targets.find((t: any) => t.eventId === target.eventId);
   persistence.database.exec("CREATE TRIGGER merge_failure BEFORE UPDATE ON training_sessions BEGIN SELECT RAISE(ABORT, 'test rollback'); END");
   const failed = await app.inject({ method: "POST", url: `${base}/apply`, headers, payload: { ...payload, sourceRevision: fresh.source.revision, targets: [{ eventId: target.eventId, expectedRevision: freshTarget.revision, action }] } });
   expect(failed.json().results[0].status).toBe("failed");
   expect(store.getSessionPlan(saved.id)).toEqual(saved);
   expect(persistence.repositories.sessionPlans.getById(clubId, saved.id)).toEqual(saved);
  } finally { await app.close(); persistence.database.close(); rmSync(dir, { recursive: true, force: true }); }
 });
 it("excludes friendly content by capability, protects preview versions and persists isolated targets", async () => {
  const dir=mkdtempSync(join(tmpdir(),"cq-training-copy-")); const databasePath=join(dir,"fixture.sqlite");
  const seed=createSeedData(),clubId="club-chongqing-talent";
  const source=seed.events.find(event=>event.id==="event-training-1")!;
  seed.events.push({...source,id:"copy-target",title:"复制目标",status:"scheduled",timeRange:{startsAt:"2099-10-01T09:00:00Z",endsAt:"2099-10-01T10:00:00Z"}});
  seed.drills[1]!.recordingCapability="friendly_match";
  const persistence=await createPlatformPersistence({databasePath,seedData:seed});const store=new PersistentApiStore(persistence.repositories,seed);
  const plan={id:"copy-source-plan",catalogScope:{scope:"club" as const,clubId},name:"来源",objectiveIds:[],metricIds:[],blocks:seed.drills.slice(0,2).map((drill,index)=>({id:`source-${index}`,drillId:drill.id,order:index,plannedMinutes:7+index})),estimatedMinutes:15,createdAt:source.createdAt,updatedAt:source.updatedAt};
  store.saveSessionPlan(plan);store.ensureTrainingSessionForEvent(clubId,source.id,{sessionPlanId:plan.id});
  const app=buildServer(store,{logger:false,membershipResolver:new HeaderMembershipResolver(persistence.repositories.users,persistence.repositories.memberships)});
  const base=`/clubs/${clubId}/app-clients/app-client-cq-talent-wechat-main/coach/training-content`;
  const headers={"x-user-id":"user-coach-1"};
  try {
   const preview=await app.inject({method:"POST",url:`${base}/preview`,headers,payload:{sourceEventId:source.id}});expect(preview.statusCode,preview.body).toBe(200);
   expect(preview.json().source).toMatchObject({count:1,configuredMinutes:7,excluded:[seed.drills[1]!.name]});
   const target=preview.json().targets.find((item:any)=>item.eventId==="copy-target");expect(target).toBeDefined();
   const payload={sourceEventId:source.id,sourceRevision:preview.json().source.revision,targets:[{eventId:target.eventId,expectedRevision:target.revision,action:"replace"}]};
   const applied=await app.inject({method:"POST",url:`${base}/apply`,headers,payload});expect(applied.statusCode,applied.body).toBe(200);expect(applied.json().results[0].status).toBe("applied");
   const saved=store.getSessionPlan("session-plan-app-client-copy-target")!;expect(saved.blocks).toHaveLength(1);expect(saved.blocks[0]?.plannedMinutes).toBe(7);
   const stale=await app.inject({method:"POST",url:`${base}/apply`,headers,payload});expect(stale.json().results[0].status).toBe("conflict");
   store.saveSessionPlan({...plan,updatedAt:"2099-01-01T00:00:00Z"});
   expect((await app.inject({method:"POST",url:`${base}/apply`,headers,payload})).statusCode).toBe(409);
   const publicDenied=await app.inject({method:"POST",url:`${base}/templates`,headers,payload:{sourceEventId:source.id,title:"公开",visibility:"club"}});expect(publicDenied.statusCode).toBe(403);
   const template=await app.inject({method:"POST",url:`${base}/templates`,headers,payload:{sourceEventId:source.id,title:"个人模板",visibility:"private"}});expect(template.statusCode,template.body).toBe(201);
   expect(store.trainingTemplates.list(clubId)[0]?.blocks).toHaveLength(1);
   const list=await app.inject({method:"GET",url:`${base}/templates`,headers:{"x-user-id":"user-admin-1"}});expect(list.json().templates).toEqual([]);
   const unavailable=await app.inject({method:"POST",url:`${base}/preview`,headers:{"x-user-id":"user-admin-1"},payload:{sourceTemplateId:template.json().template.id}});expect(unavailable.statusCode).toBe(400);
   const fresh=await app.inject({method:"POST",url:`${base}/preview`,headers,payload:{sourceEventId:source.id}});const freshTarget=fresh.json().targets.find((item:any)=>item.eventId===target.eventId);
   persistence.database.exec("CREATE TRIGGER copy_failure BEFORE UPDATE ON training_sessions BEGIN SELECT RAISE(ABORT, 'test rollback'); END");
   const failed=await app.inject({method:"POST",url:`${base}/apply`,headers,payload:{...payload,sourceRevision:fresh.json().source.revision,targets:[{eventId:target.eventId,expectedRevision:freshTarget.revision,action:"replace"}]}});expect(failed.json().results[0].status).toBe("failed");
   expect(persistence.repositories.sessionPlans.getById(clubId,saved.id)).toEqual(saved);expect(store.getSessionPlan(saved.id)).toEqual(saved);
   persistence.database.exec("DROP TRIGGER copy_failure");
   store.saveSessionPlan({...plan,blocks:[plan.blocks[1]!]});
   const empty=await app.inject({method:"POST",url:`${base}/templates`,headers,payload:{sourceEventId:source.id,title:"仅友谊赛",visibility:"private"}});expect(empty.statusCode).toBe(400);
   await app.close();persistence.database.close();
   const reopened=await createPlatformPersistence({databasePath,seedData:seed});try{const after=new PersistentApiStore(reopened.repositories,seed);expect(after.getSessionPlan(saved.id)).toEqual(saved);expect(after.trainingTemplates.list(clubId)).toHaveLength(1);expect(after.trainingTemplates.list("another-club")).toEqual([]);}finally{reopened.database.close();}
  } finally {await app.close();try{persistence.database.close();}catch{}rmSync(dir,{recursive:true,force:true});}
 });
});
