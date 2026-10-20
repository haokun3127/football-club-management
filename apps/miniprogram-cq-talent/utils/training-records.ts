import { request } from "./request";
import { getAppContext } from "./store";

export interface TrainingRecord {
  clubId: string;
  eventId: string;
  studentId: string;
  revision: number;
  counted: boolean;
  source: "automatic" | "correction";
  occurredAt: string;
  title?: string;
  history: Array<{ revision: number; counted: boolean; previousCounted?: boolean | null; source?: "automatic" | "correction"; actorUserId?: string; actorDisplayName?: string; reason: string; changedAt: string }>;
}
function path(studentId: string) {
  const context = getAppContext();
  if (!context) throw new Error("俱乐部信息尚未就绪，请重新登录");
  return `/clubs/${encodeURIComponent(context.clubId)}/app-clients/${encodeURIComponent(context.clientId)}/students/${encodeURIComponent(studentId)}/training-records`;
}
export function getTrainingRecords(studentId: string) {
  return request<{ studentId: string; total: number; records: TrainingRecord[] }>({ path: path(studentId) });
}
export function correctTrainingRecord(studentId: string, eventId: string, input: { expectedRevision: number; counted: boolean; reason: string }) {
  return request<{ record: TrainingRecord }>({ path: `${path(studentId)}/${encodeURIComponent(eventId)}`, method: "PATCH", data: input, idempotent: true });
}

export interface TrainingLeaveResult {
  record?: TrainingRecord;
  participant: { studentId: string; status: string };
}

// 家长请假（REQ-ATT-001）：提交后直接生效、无需审批，本课不销课
export function requestTrainingLeave(studentId: string, eventId: string, input: { expectedRevision: number; reason?: string }) {
  return request<TrainingLeaveResult>({ path: `${path(studentId)}/${encodeURIComponent(eventId)}/leave`, method: "POST", data: { action: "request", ...input }, idempotent: true });
}

// 撤回请假：已请假但实际参加时改回销课
export function revokeTrainingLeave(studentId: string, eventId: string, input: { expectedRevision: number; reason?: string }) {
  return request<TrainingLeaveResult>({ path: `${path(studentId)}/${encodeURIComponent(eventId)}/leave`, method: "POST", data: { action: "revoke", ...input }, idempotent: true });
}
