import type { CalendarEvent, EventParticipant } from "@football-club/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { correctTrainingRecord, reconcileTrainingRecord, requestTrainingLeave, revokeTrainingLeave, TrainingRecordConflict, type TrainingRecord } from "../application/training-records.js";
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

  // 家长请假链路（REQ-ATT-001 / REQ-PAR-002）：请假直接生效、无需审批。
  // 记录写入复用 correction 的修订/留痕/409 机制（见 application/training-records.ts），
  // 不新增第三条销课写入路径；参与状态同步为 leave_requested，供教练名单与自动销课识别。
  app.post<{ Params: Params; Body: { action: "request" | "revoke"; expectedRevision: number; reason?: string } }>(`${base}/:eventId/leave`, {
    schema: { params: trainingRecordSchemas.correctionParams, body: trainingRecordSchemas.leave, response: { 200: trainingRecordSchemas.leaveResponse } },
  }, async (request, reply) => {
    const scope = await scopedEvents(context, request, reply);
    if (!scope) return reply;
    if (scope.auth.appClientSession?.activeRole !== "parent") {
      return context.sendError(reply, 403, "forbidden", "Leave is submitted by the guardian of the student");
    }
    const event = scope.events.find((item) => item.id === request.params.eventId);
    if (!event) return context.sendError(reply, 403, "forbidden", "Training event is not accessible");
    if (event.status === "cancelled") return context.sendError(reply, 409, "cancelled_training", "Cancelled training does not count lessons; leave is not needed");
    const participant = event.participants.find((item) => item.studentId === request.params.studentId)!;
    const onLeave = ["leave_requested", "excused"].includes(participant.status ?? "");
    const scopeKeys = { clubId: request.params.clubId, eventId: event.id, studentId: participant.studentId };
    const actor = { actorUserId: scope.auth.user.id, actorDisplayName: scope.auth.user.displayName };
    try {
      if (request.body.action === "request") {
        const current = context.store.trainingRecords.get(scopeKeys.clubId, scopeKeys.eventId, scopeKeys.studentId);
        // 重复提交：请假已生效且记录已是不销课，直接返回当前事实，不追加修订
        if (onLeave && current && !current.counted) {
          return { record: current, participant: { studentId: scopeKeys.studentId, status: participant.status ?? "leave_requested" } };
        }
        const record = requestTrainingLeave(context.store.trainingRecords, scopeKeys, {
          expectedRevision: request.body.expectedRevision, reason: request.body.reason, ...actor, initialOccurredAt: event.timeRange.startsAt,
        });
        context.store.recordEventParticipants(scopeKeys.clubId, scopeKeys.eventId, [{ studentId: scopeKeys.studentId, status: "leave_requested" }]);
        return { record, participant: { studentId: scopeKeys.studentId, status: "leave_requested" } };
      }
      if (!onLeave) return context.sendError(reply, 409, "leave_not_active", "No active leave to withdraw");
      const current = context.store.trainingRecords.get(scopeKeys.clubId, scopeKeys.eventId, scopeKeys.studentId);
      if ((current?.revision ?? 0) !== request.body.expectedRevision) throw new TrainingRecordConflict(current);
      let record: TrainingRecord | null = null;
      // 尚无记录时仅恢复参与状态；已有记录始终追加撤回历史。
      if (!current) record = current;
      else record = revokeTrainingLeave(context.store.trainingRecords, scopeKeys, event, { expectedRevision: request.body.expectedRevision, reason: request.body.reason, ...actor });
      context.store.recordEventParticipants(scopeKeys.clubId, scopeKeys.eventId, [{ studentId: scopeKeys.studentId, status: "confirmed" }]);
      return { ...(record ? { record } : {}), participant: { studentId: scopeKeys.studentId, status: "confirmed" } };
    } catch (error) {
      if (error instanceof TrainingRecordConflict) return reply.code(409).send({ error: { code: "training_record_conflict", message: error.message }, current: error.current });
      throw error;
    }
  });
}
