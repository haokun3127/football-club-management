import { coachTeamRole } from "../application/coach-scope.js";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { assessmentWorkflow, AssessmentWorkflowError } from "../application/assessment-workflow.js";
import type { AssessmentEntry } from "../application/assessment-workflow-types.js";
import { workflowSchemas } from "../http/assessment-workflow-schemas.js";
import type { RouteContext } from "./context.js";

type Params = { clubId: string; clientId: string; taskId: string; studentId: string };
const base = "/clubs/:clubId/app-clients/:clientId/coach/assessment-tasks/:taskId";
export async function registerAssessmentWorkflowRoutes(app: FastifyInstance, context: RouteContext) {
  const workflow = assessmentWorkflow(context.store);
  async function scope(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
    const { clubId, clientId, taskId, studentId } = request.params;
    if (!await context.requireClubRole(request, reply, clubId, ["admin", "coach"])) return null;
    const auth = context.membershipResolver ? await context.resolveClubAuth(request, reply, clubId) : null;
    if (context.membershipResolver && !auth) return null;
    const client = (await context.store.listClubAppClients(clubId)).find((c) => c.id === clientId && c.status === "active" && c.roleEntrypoints?.coach?.length);
    if (!client) { context.sendError(reply, 404, "not_found", "教练端不可用"); return null; }
    if (auth?.appClientSession && auth.appClientSession.activeRole !== "coach") { context.sendError(reply, 403, "forbidden", "请切换至教练身份"); return null; }
    const task = (await context.store.listAssessmentTasks(clubId)).find((t) => t.id === taskId);
    if (!task) { context.sendError(reply, 404, "not_found", "评测任务不存在"); return null; }
    const coach = context.store.listCoaches(clubId).find((c) => c.userId === (auth?.user.id ?? "user-coach-1"));
    const team = context.store.listTeams(clubId).find((t) => t.id === task.teamId && t.status === "active");
    const admin = !auth || auth.membership.roles.some((r) => ["owner", "admin"].includes(r));
    if (!team || (!admin && (!coach || !coachTeamRole(context.store,clubId,coach.id,team.id))) || (studentId && !workflow.roster(task).includes(studentId))) { context.sendError(reply, 403, "forbidden", "任务或学员不在教练管理范围内"); return null; }
    if (!workflow.available(task)) { context.sendError(reply, 409, "assessment_workflow_disabled", "评测发布流程暂未开放"); return null; }
    return { task, coachId: coach?.id };
  }
  function fail(reply: FastifyReply, error: unknown) {
    if (error instanceof AssessmentWorkflowError) return context.sendError(reply, error.status, error.code, error.message);
    throw error;
  }
  app.get<{ Params: Params }>(`${base}/courses`, {schema:workflowSchemas.summary}, async(request,reply)=>{
    const access=await scope(request,reply);if(!access)return reply;
    return {courses: access.coachId ? await workflow.courses(access.task,access.coachId) : []};
  });
  app.get<{ Params: Params }>(`${base}/workflow`, { schema: workflowSchemas.summary }, async (request, reply) => {
    const access = await scope(request, reply); if (!access) return reply;
    try { return await workflow.summary(access.task); } catch (error) { return fail(reply, error); }
  });
  app.get<{ Params: Params }>(`${base}/students/:studentId/history`, { schema: workflowSchemas.history }, async (request, reply) => {
    const access = await scope(request, reply); if (!access) return reply;
    try { return await workflow.state(access.task, request.params.studentId); } catch (error) { return fail(reply, error); }
  });
  app.put<{ Params: Params; Body: { expectedRevision: number; entries: AssessmentEntry[]; reason?: string } }>(`${base}/students/:studentId/entries`, { schema: workflowSchemas.save }, async (request, reply) => {
    const access = await scope(request, reply); if (!access) return reply;
    if (!access.coachId) return context.sendError(reply, 403, "coach_profile_required", "当前账号没有可记录的教练档案");
    try { return await workflow.save(access.task, request.params.studentId, access.coachId, request.body); } catch (error) { return fail(reply, error); }
  });
  app.post<{ Params: Params; Body: { students: Array<{ studentId: string; expectedRevision: number }> } }>(`${base}/publications`, { schema: workflowSchemas.publish }, async (request, reply) => {
    const access = await scope(request, reply); if (!access) return reply;
    if (!access.coachId) return context.sendError(reply, 403, "coach_profile_required", "当前账号没有可记录的教练档案");
    const results = [];
    for (const student of request.body.students) {
      try {
        results.push({ success: true, ...await workflow.publish(access.task, student.studentId, access.coachId, student.expectedRevision) });
      } catch (error) {
        const known = error instanceof AssessmentWorkflowError;
        results.push({ studentId: student.studentId, success: false, error: { code: known ? error.code : "assessment_publication_failed", message: known ? error.message : "发布失败，成绩已保留，请重试" } });
      }
    }
    return { results };
  });
}
