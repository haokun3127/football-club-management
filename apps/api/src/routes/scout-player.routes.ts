import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ScoutError } from "../application/scout-identity.js";
import { coachTeamRole } from "../application/coach-scope.js";
import { scoutSchemas } from "../http/scout-player-schemas.js";
import type { RouteContext } from "./context.js";
type Params = { clubId: string; clientId: string };
export async function authorizeScoutCoach(context: RouteContext, request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  if (!context.membershipResolver || !/^Bearer\s+\S+$/i.test(request.headers.authorization ?? "")) { context.sendError(reply, 401, "authentication_required", "Authenticated coach required"); return null; }
  const auth = await context.resolveClubAuth(request, reply, request.params.clubId); if (!auth) return null;
  const client = (await context.store.listClubAppClients(request.params.clubId)).find(c => c.id === request.params.clientId && c.status === "active");
  const coach = context.store.listCoaches(request.params.clubId).find(c => c.userId === auth.user.id && c.status === "active");
  if (auth.appClientSession?.activeRole !== "coach" || !coach || !client?.roleEntrypoints?.coach?.length) { context.sendError(reply, 403, "forbidden", "Active coach role required"); return null; }
  return { auth, coach };
}
export async function registerScoutPlayerRoutes(app: FastifyInstance, context: RouteContext) {
  const base = "/clubs/:clubId/app-clients/:clientId/coach/scout-players";
  app.get<{ Params: Params & { studentId: string } }>(`${base}/:studentId`, { schema: { params: scoutSchemas.detailParams, response: { 200: scoutSchemas.detail } } }, async (request, reply) => {
    const scope = await authorizeScoutCoach(context, request, reply); if (!scope) return reply;
    const { clubId, studentId } = request.params;
    const repository = context.store.scoutPlayers;
    if (!repository) return context.sendError(reply, 503, "scout_unavailable", "球探档案暂不可用");
    const player = repository.list(clubId).find(p => p.id === studentId);
    if (!player) return context.sendError(reply, 404, "scout_not_found", "未找到可访问的球探档案");
    const rows = context.store.listEventParticipants(clubId).filter(p => p.studentId === studentId);
    const events = await Promise.all([...new Set(rows.map(p => p.eventId))].map(id => context.store.getCalendarEvent(id)));
    const participations = events.flatMap(event => event && event.clubId === clubId && (event.ownerCoachId === scope.coach.id || (event.primaryTeamId && coachTeamRole(context.store, clubId, scope.coach.id, event.primaryTeamId)))
      ? [{ eventId: event.id, title: event.title, startsAt: event.timeRange.startsAt, type: event.type, status: event.status }] : [])
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return { player, participations };
  });
  app.get<{ Params: Params; Querystring: { search?: string; offset?: number; limit?: number } }>(base, { schema: { params: scoutSchemas.params, querystring: scoutSchemas.query, response: { 200: scoutSchemas.list } } }, async (request, reply) => {
    if (!await authorizeScoutCoach(context, request, reply)) return reply;
    const repository = context.store.scoutPlayers;
    if (!repository) return context.sendError(reply, 503, "scout_unavailable", "球探档案暂不可用");
    const search = request.query.search?.trim() ?? "", offset = request.query.offset ?? 0, limit = request.query.limit ?? 30;
    const players = repository.list(request.params.clubId).filter(p => !search || p.name.includes(search) || (/^[0-9Xx]{4}$/.test(search) && p.maskedDocument.endsWith(search.toUpperCase())));
    return { players: players.slice(offset, offset + limit), total: players.length, nextOffset: offset + limit < players.length ? offset + limit : null, canCreate: repository.configured };
  });
  app.post<{ Params: Params; Body: { name: string; identityNumber: string } }>(base, {
    // Natural identity uniqueness handles retries; do not cache a sensitive request fingerprint or replay after revocation.
    config: { disableHttpIdempotency: true }, schema: { params: scoutSchemas.params, body: scoutSchemas.create, response: { 200: scoutSchemas.created, 201: scoutSchemas.created } },
  }, async (request, reply) => {
    const scope = await authorizeScoutCoach(context, request, reply); if (!scope) return reply;
    if (!context.store.scoutPlayers?.configured) return context.sendError(reply, 503, "identity_not_configured", "人员身份登记尚未配置，请联系管理员");
    try {
      const { created, player } = await context.store.createScoutPlayer({ ...request.body, clubId: request.params.clubId, actorUserId: scope.auth.user.id });
      return reply.code(created ? 201 : 200).send({ created, player });
    } catch (error) {
      if (error instanceof ScoutError) return context.sendError(reply, error.status, error.code, error.message);
      return context.sendError(reply, 500, "scout_create_failed", "档案保存失败，请重试");
    }
  });
}
