import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { CoachAssignment } from "@football-club/domain";
import type { RouteContext } from "./context.js";

const id = {type:"string",minLength:1,maxLength:200};
type Params={clubId:string;teamId:string;coachId:string};
export async function registerCoachAssignmentRoutes(app:FastifyInstance,context:RouteContext) {
  const base="/clubs/:clubId/teams/:teamId/coach-assignments";
  const params={type:"object",additionalProperties:false,required:["clubId","teamId"],properties:{clubId:id,teamId:id,coachId:id}};
  app.get<{Params:Params}>(base,{schema:{params}},async(request,reply)=>{
    if(!await context.requireClubRole(request,reply,request.params.clubId,["admin"]))return reply;
    const team=context.store.listTeams(request.params.clubId).find(item=>item.id===request.params.teamId);
    if(!team)return context.sendError(reply,404,"not_found","队伍不存在");
    return {defaultCoachId:team.defaultCoachId,assignments:context.store.listCoachAssignments(request.params.clubId).filter(item=>item.teamId===team.id)};
  });
  app.put<{Params:Params;Body:{role:CoachAssignment["role"]|null;expectedRole:CoachAssignment["role"]|null}}>(`${base}/:coachId`,{schema:{params,body:{type:"object",additionalProperties:false,required:["role","expectedRole"],properties:{role:{enum:["head_coach","assistant_coach","guest_coach",null]},expectedRole:{enum:["head_coach","assistant_coach","guest_coach",null]}}}}},async(request,reply)=>{
    const {clubId,teamId,coachId}=request.params;
    if(!await context.requireClubRole(request,reply,clubId,["admin"]))return reply;
    const team=context.store.listTeams(clubId).find(item=>item.id===teamId);
    if(!team||!context.store.listCoaches(clubId).some(item=>item.id===coachId))return context.sendError(reply,404,"not_found","队伍或教练不存在");
    if (await context.replayAuthorizedMutation(request, reply)) return reply;
    if(team.defaultCoachId===coachId)return context.sendError(reply,409,"default_coach_assignment","默认主教练请在队伍资料中调整");
    const previous=context.store.listCoachAssignments(clubId).find(item=>item.teamId===teamId&&item.coachId===coachId);
    if((previous?.role??null)!==request.body.expectedRole)return context.sendError(reply,409,"assignment_conflict","教练授权已变化，请刷新后核对");
    if(request.body.role===null){context.store.removeCoachAssignment(clubId,teamId,coachId);return {assignment:null};}
    const now=new Date().toISOString();
    return {assignment:context.store.saveCoachAssignment({id:previous?.id??`coach-assignment-${randomUUID()}`,clubId,teamId,coachId,role:request.body.role,createdAt:previous?.createdAt??now,updatedAt:now})};
  });
}
