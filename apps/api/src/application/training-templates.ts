import { createHash } from "node:crypto";
import type { CalendarEvent, SessionPlan, SessionPlanBlock, TrainingDrill, TrainingSession } from "@football-club/domain";

export interface TrainingTemplate {
  id: string; clubId: string; ownerUserId: string; visibility: "private" | "club";
  title: string; blocks: SessionPlanBlock[]; createdAt: string; updatedAt: string;
}
export interface TrainingTemplateStore {
  list(clubId: string): TrainingTemplate[];
  save(value: TrainingTemplate): TrainingTemplate;
}
export class MemoryTrainingTemplateStore implements TrainingTemplateStore {
  private values = new Map<string, TrainingTemplate>();
  list(clubId: string) { return [...this.values.values()].filter(value => value.clubId === clubId).map(value => structuredClone(value)); }
  save(value: TrainingTemplate) { this.values.set(value.id, structuredClone(value)); return structuredClone(value); }
}
export function trainingContentRevision(event: CalendarEvent, session: TrainingSession | null, plan: SessionPlan | null) {
  return createHash("sha256").update(JSON.stringify([ [event.id,event.clubId,event.type,event.status,event.primaryTeamId,event.ownerCoachId,event.title,event.locationId,event.timeRange.startsAt,event.timeRange.endsAt,event.updatedAt], session ? [session.id,session.kind,session.sessionPlanId,session.intensity,session.updatedAt] : null, plan ? [plan.id,plan.updatedAt,plan.blocks.map(block => [block.id,block.drillId,block.order,block.plannedMinutes,block.notes])] : null ])).digest("hex");
}
export function templateRevision(template: TrainingTemplate) {
  return createHash("sha256").update(JSON.stringify(template)).digest("hex");
}
export function reusableTrainingBlocks(blocks: SessionPlanBlock[], drills: TrainingDrill[]) {
  const excluded: string[] = [];
  const retained: SessionPlanBlock[] = [];
  for (const block of blocks) {
    const drill = drills.find(item => item.id === block.drillId);
    if (!drill) throw new Error("训练内容已不可用，请重新核对来源");
    if (drill.recordingCapability === "friendly_match") { excluded.push(drill.name); continue; }
    if (!Number.isFinite(block.plannedMinutes) || block.plannedMinutes < 0) throw new Error("训练内容时长无效");
    retained.push({ ...block });
  }
  return { blocks: retained, excluded, count: retained.length, configuredMinutes: retained.reduce((sum, block) => sum + block.plannedMinutes, 0) };
}
export interface ApplyTrainingContent {
  clubId: string; eventId: string; expectedRevision: string; plan: SessionPlan;
  operation?: "edit"; intensity?: TrainingSession["intensity"];
}

// Keep the target's order, duration and notes. Deduplication only prevents
// incoming drill IDs from being appended again; it never deletes target facts.
export function mergeTrainingBlocks(existing: SessionPlanBlock[], incoming: SessionPlanBlock[]) {
  const result = existing.map(block => ({ ...block }));
  const seen = new Set(existing.map(block => block.drillId));
  for (const block of incoming) {
    if (seen.has(block.drillId)) continue;
    seen.add(block.drillId);
    result.push({ ...block });
  }
  return result;
}
