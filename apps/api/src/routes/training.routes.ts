import { coachTeamRole } from "../application/coach-scope.js";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { FastifyInstance } from "fastify";
import { schemas } from "../http/schemas.js";
import type { RouteContext } from "./context.js";

export async function registerTrainingRoutes(app: FastifyInstance, context: RouteContext) {
  async function access(request:FastifyRequest,reply:FastifyReply,clubId:string,eventId:string,plan=false) {
    const event=await context.store.getCalendarEvent(eventId);
    if(!event||event.clubId!==clubId){context.sendError(reply,404,"not_found","训练课不存在");return false;}
    if(plan&&event.type!=="training"){context.sendError(reply,400,"invalid_training_event","Training session must link to a training event.");return false;}
    if(plan&&event.status==="cancelled"){context.sendError(reply,409,"event_cancelled","已取消课程不能编排");return false;}
    if(!context.membershipResolver)return true;
    const auth=await context.resolveClubAuth(request,reply,clubId);if(!auth)return false;
    if(auth.membership.roles.some(role=>["owner","admin","operator"].includes(role)))return true;
    const coach=context.store.listCoaches(clubId).find(item=>item.userId===auth.user.id);
    const role=coach&&event.primaryTeamId?coachTeamRole(context.store,clubId,coach.id,event.primaryTeamId):null;
    const allowed=coach&&(plan?(event.primaryTeamId?role==="head_coach":event.ownerCoachId===coach.id):Boolean(role||event.ownerCoachId===coach.id));
    if(!allowed){context.sendError(reply,403,"forbidden","不具备该课程的操作权限");return false;}
    return true;
  }
  function validPlan(clubId:string,planId:string|undefined,reply:FastifyReply,eventId?:string) {
    const previous=eventId?context.store.getTrainingSessionByEvent(clubId,eventId):null;
    if(!planId||context.store.listSessionPlans(clubId).some(plan=>plan.id===planId && (plan.status!=="inactive" || previous?.sessionPlanId===planId)))return true;
    context.sendError(reply,400,"invalid_session_plan","训练内容模板不可用");return false;
  }

  app.get<{
    Params: {
      clubId: string;
    };
    Querystring: {
      eventId?: string;
    };
  }>(
    "/clubs/:clubId/training/sessions",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.trainingSessionQuery,
        ...schemas.trainingSessionList,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      if (request.query.eventId) {
        if(!await access(request,reply,request.params.clubId,request.query.eventId))return reply;
        const session = await context.store.getTrainingSessionByEvent(request.params.clubId, request.query.eventId);
        return session ? [session] : [];
      }

      return context.sendError(reply, 400, "bad_request", "eventId query is required");
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: Parameters<RouteContext["store"]["createTrainingSession"]>[1];
  }>(
    "/clubs/:clubId/training/sessions",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.createTrainingSession,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      if(!await access(request,reply,request.params.clubId,request.body.eventId,true)||!validPlan(request.params.clubId,request.body.sessionPlanId,reply,request.body.eventId))return reply;
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      return context.store.createTrainingSession(request.params.clubId, request.body);
    },
  );

  app.post<{
    Params: {
      clubId: string;
    };
    Body: { eventId: string; kind?: "team" | "small_group" | "private" | "specialty"; sessionPlanId?: string; intensity?: "low" | "medium" | "high" };
  }>(
    "/clubs/:clubId/training/sessions/ensure",
    {
      schema: {
        ...schemas.clubParams,
        ...schemas.ensureTrainingSession,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      if(!await access(request,reply,request.params.clubId,request.body.eventId,true)||!validPlan(request.params.clubId,request.body.sessionPlanId,reply,request.body.eventId))return reply;
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      try {
        const session = await context.store.ensureTrainingSessionForEvent(
          request.params.clubId,
          request.body.eventId,
          request.body,
        );
        return reply.code(201).send(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Training session initialization failed";
        return context.sendError(reply, 400, "bad_request", message);
      }
    },
  );

  app.post<{
    Params: {
      clubId: string;
      trainingSessionId: string;
    };
    Body: Parameters<RouteContext["store"]["recordTrainingObservation"]>[2];
  }>(
    "/clubs/:clubId/training/sessions/:trainingSessionId/observations",
    {
      schema: {
        ...schemas.clubTrainingSessionParams,
        ...schemas.recordTrainingObservation,
      },
    },
    async (request, reply) => {
      if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) {
        return reply;
      }

      const session=context.store.getTrainingSession(request.params.trainingSessionId);
      if(!session||session.clubId!==request.params.clubId)return context.sendError(reply,404,"not_found","训练课不存在");
      if(!await access(request,reply,request.params.clubId,session.eventId))return reply;
      if(!context.store.listEventParticipants(request.params.clubId).some(item=>item.eventId===session.eventId&&item.studentId===request.body.studentId))return context.sendError(reply,403,"forbidden","学员不在本课名单");
      if(context.membershipResolver){
        const auth=await context.resolveClubAuth(request,reply,request.params.clubId);if(!auth)return reply;
        const coach=context.store.listCoaches(request.params.clubId).find(item=>item.userId===auth.user.id);
        if(!coach)return context.sendError(reply,403,"coach_profile_required","缺少教学身份");
        request.body.coachId=coach.id;
      }
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      return reply.code(201).send(context.store.recordTrainingObservation(
        request.params.clubId,
        request.params.trainingSessionId,
        request.body,
      ));
    },
  );
}
