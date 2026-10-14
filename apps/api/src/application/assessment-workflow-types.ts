import type { MetricValue } from "@football-club/domain";

export interface AssessmentEntry {
  testItemId: string;
  metricId?: string;
  value: MetricValue;
  eventId?: string;
  occurredAt?: string;
  recordedAt?: string;
}

export interface AssessmentWorkingState {
  revision: number;
  notAssessed?: {reason:string;coachId:string;recordedAt:string};
  entries: Record<string, AssessmentEntry>;
  changes: Array<{
    revision: number;
    coachId: string;
    changedAt: string;
    reason?: string;
    entries: Array<{ testItemId: string; before: MetricValue | null; after: MetricValue; beforeEventId?: string; afterEventId?: string; beforeOccurredAt?: string; afterOccurredAt?: string }>;
  }>;
  publications: Array<{ revision: number; assessmentId: string; coachId: string; publishedAt: string }>;
}

export interface AssessmentWorkflowRepository {
  transaction?<T>(operation: () => Promise<T>): Promise<T>;
  version(clubId: string, taskId: string): string | null;
  pin(clubId: string, taskId: string, versionId: string): void;
  get(clubId: string, taskId: string, studentId: string): AssessmentWorkingState | null;
  save(clubId: string, taskId: string, studentId: string, state: AssessmentWorkingState): void;
}

export class MemoryAssessmentWorkflowRepository implements AssessmentWorkflowRepository {
  private readonly versions = new Map<string, string>();
  private readonly states = new Map<string, AssessmentWorkingState>();
  version(clubId: string, taskId: string) { return this.versions.get(JSON.stringify([clubId, taskId])) ?? null; }
  pin(clubId: string, taskId: string, versionId: string) {
    const existing = this.version(clubId, taskId);
    if (existing && existing !== versionId) throw new Error("Assessment task version is already pinned");
    this.versions.set(JSON.stringify([clubId, taskId]), versionId);
  }
  get(clubId: string, taskId: string, studentId: string) {
    const state = this.states.get(JSON.stringify([clubId, taskId, studentId]));
    return state ? structuredClone(state) : null;
  }
  save(clubId: string, taskId: string, studentId: string, state: AssessmentWorkingState) {
    this.states.set(JSON.stringify([clubId, taskId, studentId]), structuredClone(state));
  }
}
