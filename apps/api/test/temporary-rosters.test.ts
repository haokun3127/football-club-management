import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { reconcileTrainingRecord } from "../src/application/training-records.js";
import { SessionRegistry } from "../src/auth/session-registry.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { buildServer } from "../src/server.js";
const clubId="club-chongqing-talent",clientId="app-client-cq-talent-wechat-main",actorUserId="user-coach-1";
async function fixture() {
  const p=await createPlatformPersistence({databasePath:":memory:",identityKeyring:{activeVersion:"test",keys:[{version:"test",digestKey:randomBytes(32).toString("hex"),encryptionKey:randomBytes(32).toString("hex")}]}});
  const store=new PersistentApiStore(p.repositories),coach=store.listCoaches(clubId).find(c=>c.userId===actorUserId)!;
  const player=await store.createScoutPlayer({clubId,actorUserId,name:"标准示例",identityNumber:"11010519491231002X"});
  const now=new Date().toISOString();
  const event={id:"temporary-event",clubId,type:"training" as const,title:"临时名单测试",ownerCoachId:coach.id,status:"scheduled" as const,timeRange:{startsAt:"2099-10-09T00:00:00Z",endsAt:"2099-10-09T01:00:00Z"},createdAt:now,updatedAt:now};
  await store.saveCalendarEvent(event);
  const input={clubId,eventId:event.id,expectedRevision:p.repositories.temporaryRosters.get(clubId,event.id).revision,action:"add" as const,players:[{studentId:player.player.id}],actorUserId,actorName:"测试教练"};
  return {p,store,event,input,player:player.player,coach};
}
describe("single-event temporary rosters",()=>{
  it("adds once, protects revisions, removes without deleting identity, restores same participant and rolls back batches",async()=>{
    const {p,store,event,input,player}=await fixture(); const r=p.repositories.temporaryRosters;
    try{
      const before=p.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all();
      const first=await r.change(input,()=>true);expect(first.participantIds).toContain(player.id);
      const id=store.listEventParticipants(clubId).find(x=>x.eventId===event.id)!.id;
      await expect(r.change(input,()=>true)).rejects.toMatchObject({code:"roster_conflict"});
      const repeat=await r.change({...input,expectedRevision:first.revision},()=>true);expect(repeat.revision).toBe(first.revision);expect(repeat.temporary[0].history).toHaveLength(1);
      const removed=await r.change({...input,action:"remove",expectedRevision:first.revision},()=>true);
      expect(store.listEventParticipants(clubId).some(x=>x.id===id)).toBe(false);expect(store.getEventParticipant(id)).toBe(null);
      expect(p.repositories.calendar.listParticipantsForEvent(clubId,event.id)).toEqual([]);
      expect(p.repositories.calendar.listParticipantsForStudent(clubId,player.id)).toEqual([]);
      await expect(r.change({...input,expectedRevision:removed.revision,players:[...input.players,{studentId:"unknown"}]},()=>true)).rejects.toMatchObject({code:"scout_not_found"});
      expect(r.get(clubId,event.id)).toEqual(removed);
      const restored=await r.change({...input,expectedRevision:removed.revision},()=>true);expect(restored.temporary[0].history.map(h=>h.action)).toEqual(["add","remove","add"]);
      expect(store.listEventParticipants(clubId).find(x=>x.eventId===event.id)!.id).toBe(id);
      expect(p.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(before);
      expect(store.listTeamMembers(clubId).some(m=>m.studentId===player.id)).toBe(false);
    }finally{p.database.close();}
  });
  it("requires explicit late participation, atomically corrects training fact, preserves human result on automatic replay",async()=>{
    const {p,store,event,input,player}=await fixture();const r=p.repositories.temporaryRosters;
    try{
      const past={...event,timeRange:{startsAt:"2020-10-09T00:00:00Z",endsAt:"2020-10-09T01:00:00Z"}};await store.saveCalendarEvent(past);
      input.expectedRevision=r.get(clubId,event.id).revision;
      await expect(r.change(input,()=>true)).rejects.toMatchObject({code:"participation_required"});
      const selected={...input,players:[{studentId:player.id,participated:false}]};
      p.database.exec("CREATE TRIGGER fail_temporary BEFORE INSERT ON temporary_event_participants BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");
      await expect(r.change(selected,()=>true)).rejects.toThrow();expect(store.trainingRecords.get(clubId,event.id,player.id)).toBe(null);expect(store.listEventParticipants(clubId).filter(x=>x.eventId===event.id)).toEqual([]);
      p.database.exec("DROP TRIGGER fail_temporary");
      const saved=await r.change(selected,()=>true);expect(saved.temporary[0].history[0].participated).toBe(false);
      const participant=store.listEventParticipants(clubId).find(x=>x.eventId===event.id)!;
      const fact=reconcileTrainingRecord(store.trainingRecords,past,{...participant,status:"present"});expect(fact).toMatchObject({counted:false,source:"correction",revision:1});
      await expect(r.change({...input,action:"remove",expectedRevision:saved.revision},()=>true)).rejects.toMatchObject({code:"participant_has_facts"});
    }finally{p.database.close();}
  });
  it("keeps match candidates consistent without fabricated appearance, and filters removed players",async()=>{
    const {p,event,input,player}=await fixture();const r=p.repositories.temporaryRosters;
    try{
      const template=p.repositories.matches.listMatches(clubId)[0];expect(template).toBeTruthy();
      const team=(await p.repositories.teams.listByClub(clubId))[0];
      p.repositories.calendar.saveEvent({...event,type:"match",primaryTeamId:team.id});
      p.repositories.matches.saveMatch({...template,id:"temporary-match",eventId:event.id,status:"scheduled"});
      input.expectedRevision=r.get(clubId,event.id).revision;
      const added=await r.change(input,()=>true),store=new PersistentApiStore(p.repositories);
      expect(store.getMatchDetailByEvent(clubId,event.id)!.rosters).toEqual([expect.objectContaining({studentId:player.id,started:false})]);
      expect(store.getMatchDetailByEvent(clubId,event.id)!.rosters[0].minutesPlayed).toBeUndefined();
      await r.change({...input,action:"remove",expectedRevision:added.revision},()=>true);
      expect(store.getMatchDetailByEvent(clubId,event.id)!.rosters).toEqual([]);expect(p.repositories.matches.listRosters(clubId).filter(x=>x.matchId==="temporary-match")).toHaveLength(1);
    }finally{p.database.close();}
  });
  it("allows authorized collaborators directly, rejects other roles/revocation and never returns actor user IDs",async()=>{
    const {p,store,event,input,coach}=await fixture();const sessions=new SessionRegistry(p.repositories.appClientSessions);
    const app=buildServer(store,{logger:false,sessionRegistry:sessions,membershipResolver:createProductionMembershipResolver(p.repositories.users,p.repositories.memberships)});
    try{
      const team=store.listTeams(clubId)[0];store.saveTeam({...team,defaultCoachId:undefined});await store.saveCalendarEvent({...event,primaryTeamId:team.id});
      store.saveCoachAssignment({id:"temporary-assistant",clubId,teamId:team.id,coachId:coach.id,role:"assistant_coach",createdAt:event.createdAt,updatedAt:event.updatedAt});
      const membership=await p.repositories.memberships.findActiveByClubAndUser(clubId,actorUserId);
      const session=await sessions.create({clubId,appClientId:clientId,userId:actorUserId,membershipId:membership!.id,activeRole:"coach"});const headers={authorization:`Bearer ${session.token}`};
      const url=`/clubs/${clubId}/app-clients/${clientId}/coach/events/${event.id}/temporary-roster`;
      const read=await app.inject({url,headers});expect(read.statusCode).toBe(200);
      const payload={action:"add",players:input.players,expectedRevision:read.json().roster.revision};
      const added=await app.inject({method:"POST",url,headers,payload});expect(added.statusCode).toBe(200);expect(added.body).not.toContain("actorUserId");
      const tasksUrl=`/clubs/${clubId}/app-clients/${clientId}/coach/assessment-tasks`;
      const options=await app.inject({url:`${tasksUrl}?sourceEventId=${event.id}`,headers});expect(options.statusCode).toBe(200);
      expect(options.json().sourceCourse.temporaryStudents.map((p:{id:string})=>p.id)).toContain(input.players[0].studentId);
      const template=(await store.listAssessmentTemplates(clubId))[0];
      const taskInput={title:"临时球员测评",templateId:template.id,teamId:team.id,termLabel:"测试",startsOn:"2099-10-09",dueOn:"2099-10-09",sourceEventId:event.id};
      const omitted=await app.inject({method:"POST",url:tasksUrl,headers,payload:taskInput});expect(omitted.statusCode).toBe(400);
      const selected=await app.inject({method:"POST",url:tasksUrl,headers,payload:{...taskInput,studentIds:[input.players[0].studentId]}});expect(selected.statusCode).toBe(201);
      // A fixed assessment object is a fact: removing the event candidate must not erase it.
      const removal=await app.inject({method:"POST",url,headers,payload:{...payload,action:"remove",expectedRevision:added.json().roster.revision}});expect(removal.statusCode).toBe(409);expect(removal.json().error.code).toBe("participant_has_facts");
      store.removeCoachAssignment(clubId,team.id,coach.id);
      expect((await app.inject({url,headers})).statusCode).toBe(403);
      expect((await app.inject({method:"POST",url,headers,payload:{...payload,expectedRevision:added.json().roster.revision}})).statusCode).toBe(403);
      expect((await app.inject({url})).statusCode).toBe(401);
    }finally{await app.close();p.database.close();}
  });
});
