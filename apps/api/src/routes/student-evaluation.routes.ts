import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { coachTeamRole } from "../application/coach-scope.js";
import { EvaluationConflict, evaluationForClient, saveStudentEvaluation } from "../application/student-evaluations.js";
import { evaluationSchemas } from "../http/student-evaluation-schemas.js";
import type { RouteContext } from "./context.js";
type Params = { clubId: string; clientId: string; studentId: string; teamId?: string };
async function authorize(context: RouteContext, request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const { clubId, clientId, studentId } = request.params;
  if (!context.membershipResolver) { context.sendError(reply, 401, "authentication_required", "Authenticated membership required"); return null; }
  const auth = await context.resolveClubAuth(request, reply, clubId);
  if (!auth) return null;
  const role = auth.appClientSession?.activeRole;
  const client = (await context.store.listClubAppClients(clubId)).find(item => item.id === clientId && item.status === "active");
  if (!role || !client?.roleEntrypoints?.[role]?.length) { context.sendError(reply, 401, "authentication_required", "An active application role is required"); return null; }
  const parent = role === "parent";
  if (parent && !context.store.isGuardianOfStudent(clubId, auth.user.id, studentId)) { context.sendError(reply, 403, "forbidden", "Student is not accessible"); return null; }
  const coach = role === "coach" ? context.store.listCoaches(clubId).find(c => c.userId === auth.user.id && c.status === "active") : null;
  const members = context.store.listTeamMembers(clubId).filter(m => m.studentId === studentId);
  const records = context.store.studentEvaluations.list(clubId, studentId);
  const teams = context.store.listTeams(clubId).filter(t => {
    if (parent) return members.some(m => m.teamId === t.id) || records.some(r => r.teamId === t.id);
    return t.status === "active" && members.some(m => m.teamId === t.id && m.status === "active") && (coach && coachTeamRole(context.store, clubId, coach.id, t.id));
  });
  if (!parent && !teams.length) { context.sendError(reply, 403, "forbidden", "Student is not accessible in an authorized team"); return null; }
  return { auth, teams, parent };
}
export async function registerStudentEvaluationRoutes(app: FastifyInstance, context: RouteContext) {
  const base = "/clubs/:clubId/app-clients/:clientId/students/:studentId/evaluations";
  app.get<{ Params: Params }>(base, { schema: { params: evaluationSchemas.params, response: { 200: evaluationSchemas.list } } }, async (request, reply) => {
    const scope = await authorize(context, request, reply); if (!scope) return reply;
    const { clubId, studentId } = request.params;
    const student = await context.store.getOperationalStudentDetail(clubId, studentId);
    if (!student) return context.sendError(reply, 404, "not_found", "Student not found");
    return { studentId, studentName: student.name, phrases: context.store.listEvaluationPhrases(clubId), teams: scope.teams.map(t => ({ id: t.id, name: t.name, canEdit: !scope.parent,
      evaluation: evaluationForClient(context.store.studentEvaluations.get(clubId, t.id, studentId)) })) };
  });
  app.put<{ Params: Params; Body: { expectedRevision: number; phraseIds: string[]; note: string } }>(`${base}/:teamId`, { schema: { params: evaluationSchemas.saveParams, body: evaluationSchemas.body, response: { 200: evaluationSchemas.saved } } }, async (request, reply) => {
    const scope = await authorize(context, request, reply); if (!scope) return reply;
    if (scope.parent || !scope.teams.some(t => t.id === request.params.teamId)) return context.sendError(reply, 403, "forbidden", "Evaluation cannot be edited in this role or team");
    const catalog = context.store.listEvaluationPhrases(request.params.clubId);
    const previous = context.store.studentEvaluations.get(request.params.clubId, request.params.teamId!, request.params.studentId)?.history.at(-1);
    if (request.body.phraseIds.some(id => !catalog.some(p => p.id === id) && !previous?.phrases.some(p => p.id === id))) return context.sendError(reply, 400, "invalid_evaluation_phrase", "Unknown evaluation phrase");
    try {
      return { evaluation: evaluationForClient(saveStudentEvaluation(context.store.studentEvaluations, { clubId: request.params.clubId, teamId: request.params.teamId!, studentId: request.params.studentId }, request.body, scope.auth.user, undefined, catalog)) };
    } catch (error) {
      if (error instanceof EvaluationConflict) return context.sendError(reply, 409, "evaluation_conflict", error.message);
      return context.sendError(reply, 500, "evaluation_save_failed", "Evaluation could not be saved");
    }
  });
}
