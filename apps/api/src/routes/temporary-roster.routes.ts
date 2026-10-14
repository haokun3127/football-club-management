import type { FastifyInstance } from "fastify";
import type { CalendarEvent } from "@football-club/domain";
import type { RouteContext } from "./context.js";
import type { ChangeTemporaryRoster } from "../application/temporary-rosters.js";
import { coachTeamRole } from "../application/coach-scope.js";
import { ScoutError } from "../application/scout-identity.js";
import { authorizeScoutCoach } from "./scout-player.routes.js";
import { temporaryRosterSchemas as schema } from "../http/temporary-roster-schemas.js";
type Params = { clubId:string;clientId:string;eventId:string };
export async function registerTemporaryRosterRoutes(app:FastifyInstance,context:RouteContext) {
  const path="/clubs/:clubId/app-clients/:clientId/coach/events/:eventId/temporary-roster";
  for (const method of ["GET","POST"] as const) app.route<{Params:Params;Body:Pick<ChangeTemporaryRoster,"action"|"players"|"expectedRevision"|"note">}>({
    method,url:path,config:{disableHttpIdempotency:true},schema:{params:schema.params,...(method==="POST"?{body:schema.body}:{}),response:{200:schema.response}},
    handler:async(request,reply)=>{
      const scope=await authorizeScoutCoach(context,request,reply);if(!scope)return reply;
      const {clubId,eventId}=request.params,repository=context.store.temporaryRosters;
      if(!repository)return context.sendError(reply,503,"roster_unavailable","活动名单暂不可用");
      const allowed=(event:CalendarEvent)=>event.clubId===clubId&&Boolean(event.primaryTeamId?coachTeamRole(context.store,clubId,scope.coach.id,event.primaryTeamId):event.ownerCoachId===scope.coach.id);
      const event=await context.store.getCalendarEvent(eventId);
      if(!event||event.clubId!==clubId)return context.sendError(reply,404,"event_not_found","活动不存在");
      if(!allowed(event))return context.sendError(reply,403,"forbidden","没有本场名单操作权限");
      try {
        const roster=method==="POST"?await repository.change({...request.body,clubId,eventId,actorUserId:scope.auth.user.id,actorName:scope.auth.user.displayName},allowed):repository.get(clubId,eventId);
        return {event:{id:event.id,title:event.title,type:event.type,endsAt:event.timeRange.endsAt,ended:Date.parse(event.timeRange.endsAt)<=Date.now(),cancelled:event.status==="cancelled"},roster};
      }catch(error){if(error instanceof ScoutError)return context.sendError(reply,error.status,error.code,error.message);return context.sendError(reply,500,"roster_save_failed","名单未能保存，请刷新核对后重试");}
    },
  });
}
