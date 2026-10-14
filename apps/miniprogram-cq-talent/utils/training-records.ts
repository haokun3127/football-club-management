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
