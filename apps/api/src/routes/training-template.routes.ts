import { createHash, randomUUID } from "node:crypto";
import type { CalendarEvent, SessionPlanBlock } from "@football-club/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { coachTeamRole } from "../application/coach-scope.js";
import { mergeTrainingBlocks, reusableTrainingBlocks, templateRevision, trainingContentRevision } from "../application/training-templates.js";
import type { RouteContext } from "./context.js";

type Params = { clubId: string; clientId: string };
type Source = { sourceEventId?: string; sourceTemplateId?: string };
const id = { type: "string", minLength: 1, maxLength: 150 };
const params = { type: "object", required: ["clubId", "clientId"], properties: { clubId: id, clientId: id } };
const sourceFields = { sourceEventId: id, sourceTemplateId: id };

export async function registerTrainingTemplateRoutes(app: FastifyInstance, context: RouteContext) {
  const base = "/clubs/:clubId/app-clients/:clientId/coach/training-content";
  async function identity(request: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
    if (!context.membershipResolver) { context.sendError(reply, 401, "authentication_required", "Authenticated membership required"); return null; }
    if (!await context.requireClubRole(request, reply, request.params.clubId, ["admin", "coach"])) return null;
    const auth = await context.resolveClubAuth(request, reply, request.params.clubId); if (!auth) return null;
    const client = (await context.store.listClubAppClients(request.params.clubId)).find(item => item.id === request.params.clientId && item.status === "active" && item.roleEntrypoints?.coach?.length);
    if (!client) { context.sendError(reply, 403, "forbidden", "Coach client not available"); return null; }
    const admin = auth.membership.roles.some(role => ["owner", "admin", "operator"].includes(role));
    const coach = context.store.listCoaches(request.params.clubId).find(item => item.userId === auth.user.id && item.status === "active");
    return { userId: auth.user.id, admin, canPlan: (event: CalendarEvent) => event.clubId === request.params.clubId && (admin || Boolean(coach && (event.primaryTeamId ? coachTeamRole(context.store, event.clubId, coach.id, event.primaryTeamId) === "head_coach" : event.ownerCoachId === coach.id))) };
  }
  function snapshot(clubId: string, event: CalendarEvent) {
    const session = context.store.getTrainingSessionByEvent(clubId, event.id);
    const plan = session?.sessionPlanId ? context.store.getSessionPlan(session.sessionPlanId) : null;
    return { event, session, plan, revision: trainingContentRevision(event, session, plan) };
  }
  function describe(clubId: string, blocks: SessionPlanBlock[]) {
    const drills = context.store.listTrainingDrills(clubId);
    return blocks.map(block => ({ id: block.drillId, name: drills.find(drill => drill.id === block.drillId)?.name || "内容已不可用", configuredMinutes: block.plannedMinutes }));
  }
  async function source(clubId: string, input: Source, who: NonNullable<Awaited<ReturnType<typeof identity>>>) {
    if (Boolean(input.sourceEventId) === Boolean(input.sourceTemplateId)) throw new Error("请选择一个来源课程或模板");
    let blocks: SessionPlanBlock[], revision: string, title: string;
    if (input.sourceEventId) {
      const event = await context.store.getCalendarEvent(input.sourceEventId);
      if (!event || event.type !== "training" || !who.canPlan(event)) throw new Error("来源课程不可用或无编排权限");
      const value = snapshot(clubId, event); blocks = value.plan?.blocks || []; revision = value.revision; title = event.title;
    } else {
      const template = context.store.trainingTemplates.list(clubId).find(item => item.id === input.sourceTemplateId && (item.visibility === "club" || item.ownerUserId === who.userId));
      if (!template) throw new Error("模板不可用或无访问权限");
      blocks = template.blocks; revision = templateRevision(template); title = template.title;
    }
    const drills = context.store.listTrainingDrills(clubId);
    const reusable = reusableTrainingBlocks(blocks, drills);
    // A catalog edit may change exclusion, labels or derived objectives without
    // changing the source plan. Such a preview must also become stale.
    const catalog = blocks.map(block => drills.find(drill => drill.id === block.drillId));
    revision = createHash("sha256").update(JSON.stringify([revision, catalog])).digest("hex");
    return { ...reusable, revision, title };
  }
  app.get<{ Params: Params }>(`${base}/templates`, { schema: { params } }, async (request, reply) => {
    const who = await identity(request, reply); if (!who) return reply;
    return { templates: context.store.trainingTemplates.list(request.params.clubId).filter(item => item.visibility === "club" || item.ownerUserId === who.userId).map(item => ({ id: item.id, title: item.title, visibility: item.visibility, items: describe(item.clubId, item.blocks), configuredMinutes: item.blocks.reduce((sum, block) => sum + block.plannedMinutes, 0) })) };
  });
  app.post<{ Params: Params; Body: { sourceEventId: string; title: string; visibility: "private" | "club" } }>(`${base}/templates`, { schema: { params, body: { type: "object", additionalProperties: false, required: ["sourceEventId", "title", "visibility"], properties: { sourceEventId: id, title: { type: "string", minLength: 1, maxLength: 80 }, visibility: { type: "string", enum: ["private", "club"] } } } } }, async (request, reply) => {
    const who = await identity(request, reply); if (!who) return reply;
    if (request.body.visibility === "club" && !who.admin) return context.sendError(reply, 403, "forbidden", "仅管理员可发布俱乐部模板");
    try {
      const value = await source(request.params.clubId, request.body, who);
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      if (!value.count || !request.body.title.trim()) return context.sendError(reply, 400, "empty_template", "排除友谊赛后没有可保存的训练内容");
      const now = new Date().toISOString();
      const template = context.store.trainingTemplates.save({ id: randomUUID(), clubId: request.params.clubId, ownerUserId: who.userId, title: request.body.title.trim(), visibility: request.body.visibility, blocks: value.blocks, createdAt: now, updatedAt: now });
      return reply.code(201).send({ template: { id: template.id, title: template.title }, excluded: value.excluded });
    } catch { return context.sendError(reply, 400, "invalid_template", "来源不可用，请重新核对课程内容和权限"); }
  });
  app.post<{ Params: Params; Body: Source }>(`${base}/preview`, { schema: { params, body: { type: "object", additionalProperties: false, properties: sourceFields } } }, async (request, reply) => {
    const who = await identity(request, reply); if (!who) return reply;
    try {
      const value = await source(request.params.clubId, request.body, who);
      if (await context.replayAuthorizedMutation(request, reply)) return reply;
      const candidates = (context.store.listCalendarEvents(request.params.clubId) as CalendarEvent[]).filter(event => event.id !== request.body.sourceEventId && event.type === "training" && event.status === "scheduled" && Date.parse(event.timeRange.startsAt) > Date.now() && who.canPlan(event));
      const targets = await Promise.all(candidates.map(async event => {
        const actual = await context.store.getCalendarEvent(event.id); if (!actual) return null;
        const current = snapshot(request.params.clubId, actual);
        const existing = current.plan?.blocks || [];
        const outcome = (blocks: SessionPlanBlock[]) => ({ items: describe(request.params.clubId, blocks), count: blocks.length, configuredMinutes: blocks.reduce((sum, block) => sum + block.plannedMinutes, 0) });
        return { eventId: event.id, title: event.title, startsAt: event.timeRange.startsAt, revision: current.revision, existing: describe(request.params.clubId, existing), outcomes: { merge: outcome(mergeTrainingBlocks(existing, value.blocks)), replace: outcome(value.blocks) } };
      }));
      return { source: { ...value, blocks: undefined, items: describe(request.params.clubId, value.blocks) }, targets: targets.filter(Boolean).sort((a, b) => a!.startsAt.localeCompare(b!.startsAt)) };
    } catch { return context.sendError(reply, 400, "invalid_source", "来源不可用，请重新核对课程或模板"); }
  });
  app.post<{ Params: Params; Body: Source & { sourceRevision: string; targets: Array<{ eventId: string; expectedRevision: string; action: "merge" | "replace" | "skip" }> } }>(`${base}/apply`, { schema: { params, body: { type: "object", additionalProperties: false, required: ["sourceRevision", "targets"], properties: { ...sourceFields, sourceRevision: id, targets: { type: "array", minItems: 1, maxItems: 20, items: { type: "object", additionalProperties: false, required: ["eventId", "expectedRevision", "action"], properties: { eventId: id, expectedRevision: id, action: { type: "string", enum: ["merge", "replace", "skip"] } } } } } } } }, async (request, reply) => {
    const who = await identity(request, reply); if (!who) return reply;
    let value;
    try { value = await source(request.params.clubId, request.body, who); } catch { return context.sendError(reply, 400, "invalid_source", "来源不可用"); }
    if (await context.replayAuthorizedMutation(request, reply, async () => {
      for (const target of request.body.targets) {
        if (target.action === "skip") continue;
        const event = await context.store.getCalendarEvent(target.eventId);
        if (!event || !who.canPlan(event)) return false;
      }
      return true;
    })) return reply;
    if (value.revision !== request.body.sourceRevision) return context.sendError(reply, 409, "source_changed", "来源内容已变化，请重新预览");
    if (!value.count) return context.sendError(reply, 400, "empty_content", "排除友谊赛后没有可复制内容");
    if (new Set(request.body.targets.map(target => target.eventId)).size !== request.body.targets.length) return context.sendError(reply, 400, "duplicate_target", "目标课程重复");
    const results = [];
    for (const target of request.body.targets) {
      if (target.action === "skip") { results.push({ eventId: target.eventId, status: "skipped" }); continue; }
      const event = await context.store.getCalendarEvent(target.eventId);
      if (!event || event.id === request.body.sourceEventId || event.type !== "training" || !who.canPlan(event)) { results.push({ eventId: target.eventId, status: "forbidden" }); continue; }
      const now = new Date().toISOString(); const drills = context.store.listTrainingDrills(request.params.clubId);
      const current = snapshot(request.params.clubId, event);
      const blocks = target.action === "merge" ? mergeTrainingBlocks(current.plan?.blocks || [], value.blocks) : value.blocks;
      const selected = drills.filter(drill => blocks.some(block => block.drillId === drill.id));
      try {
        const applied = await context.store.applyTrainingContent({ clubId: request.params.clubId, eventId: event.id, expectedRevision: target.expectedRevision,
          plan: { id: `session-plan-app-client-${event.id}`, catalogScope: { scope: "club", clubId: request.params.clubId }, name: `${event.title}训练内容`,
            objectiveIds: [...new Set(selected.flatMap(drill => drill.objectiveIds))], metricIds: [...new Set(selected.flatMap(drill => drill.metricIds))],
            blocks: blocks.map((block, index) => ({ ...block, id: `copy-${event.id}-${index}`, order: index + 1 })), estimatedMinutes: blocks.reduce((sum, block) => sum + block.plannedMinutes, 0), createdAt: now, updatedAt: now } });
        results.push({ eventId: target.eventId, status: applied ? "applied" : "conflict" });
      } catch { results.push({ eventId: target.eventId, status: "failed" }); }
    }
    return { results, excluded: value.excluded };
  });
}
