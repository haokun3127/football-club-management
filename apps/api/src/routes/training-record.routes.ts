import type { CalendarEvent, EventParticipant } from "@football-club/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { correctTrainingRecord, reconcileTrainingRecord, TrainingRecordConflict } from "../application/training-records.js";
import { trainingRecordSchemas } from "../http/training-record-schemas.js";
import type { RouteContext } from "./context.js";

type Params = { clubId: string; clientId: string; studentId: string; eventId?: string };
type TrainingEvent = CalendarEvent & { participants: EventParticipant[] };

async function scopedEvents(context: RouteContext, request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  const { clubId, clientId, studentId } = request.params;
  if (!context.membershipResolver) {
    context.sendError(reply, 401, "authentication_required", "Authenticated membership required");
    return null;
  }
  const auth = await context.resolveClubAuth(request, reply, clubId);
  if (!auth) return null;
  const role = auth.appClientSession?.activeRole;
  const client = (await context.store.listClubAppClients(clubId)).find((item) => item.id === clientId && item.status === "active");
  if (!role || !client?.roleEntrypoints?.[role]?.length) {
    context.sendError(reply, 401, "authentication_required", "An active application role is required");
    return null;
  }
  const events = (await context.store.listCalendarEvents(clubId) as TrainingEvent[])
    .filter((event) => event.type === "training" && event.participants.some((participant) => participant.studentId === studentId));
  if (role === "parent") {
    if (!context.store.isGuardianOfStudent(clubId, auth.user.id, studentId)) {
      context.sendError(reply, 403, "forbidden", "Student is not accessible for this guardian");
      return null;
    }
    return { auth, events };
  }
  const allowed = new Set<string>();
  for (const date of new Set(events.map((event) => event.timeRange.startsAt.slice(0, 10)))) {
    const workbench = await context.store.getCoachToday(clubId, { date, userId: auth.user.id, roles: auth.membership.roles }) as { events?: Array<{ id: string }> };
    for (const event of workbench.events ?? []) allowed.add(event.id);
  }
  return { auth, events: events.filter((event) => allowed.has(event.id)) };
}

export async function registerTrainingRecordRoutes(app: FastifyInstance, context: RouteContext) {
  const base = "/clubs/:clubId/app-clients/:clientId/students/:studentId/training-records";
  app.get<{ Params: Params }>(base, { schema: { params: trainingRecordSchemas.params, response: { 200: trainingRecordSchemas.listResponse } } }, async (request, reply) => {
    const scope = await scopedEvents(context, request, reply);
    if (!scope) return reply;
    const records = scope.events.flatMap((event) => {
      const participant = event.participants.find((item) => item.studentId === request.params.studentId)!;
      const record = reconcileTrainingRecord(context.store.trainingRecords, event, participant);
      return record ? [{ ...record, title: event.title, teamId: event.primaryTeamId ?? null }] : [];
    }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return { studentId: request.params.studentId, total: records.filter((record) => record.counted).length, records };
  });
  app.patch<{ Params: Params; Body: { expectedRevision: number; counted: boolean; reason: string } }>(`${base}/:eventId`, {
    schema: { params: trainingRecordSchemas.correctionParams, body: trainingRecordSchemas.correction, response: { 200: trainingRecordSchemas.correctionResponse } },
  }, async (request, reply) => {
    const scope = await scopedEvents(context, request, reply);
    if (!scope) return reply;
    const event = scope.events.find((item) => item.id === request.params.eventId);
    if (!event) return context.sendError(reply, 403, "forbidden", "Training event is not accessible");
    if (event.status === "cancelled" && request.body.counted) return context.sendError(reply, 409, "cancelled_training", "Cancelled training cannot be counted");
    const participant = event.participants.find((item) => item.studentId === request.params.studentId)!;
    const current = reconcileTrainingRecord(context.store.trainingRecords, event, participant);
    const canInitialize = ["coach", "admin"].includes(scope.auth.appClientSession?.activeRole ?? "");
    if (!current && !canInitialize) return context.sendError(reply, 409, "training_record_not_ready", "Training has not ended");
    try {
      return { record: correctTrainingRecord(context.store.trainingRecords, { clubId: request.params.clubId, eventId: event.id, studentId: participant.studentId }, { ...request.body, actorUserId: scope.auth.user.id, actorDisplayName: scope.auth.user.displayName, ...(!current && canInitialize ? { initialOccurredAt: event.timeRange.startsAt } : {}) }) };
    } catch (error) {
      if (error instanceof TrainingRecordConflict) return reply.code(409).send({ error: { code: "training_record_conflict", message: error.message }, current: error.current });
      throw error;
    }
  });
}
