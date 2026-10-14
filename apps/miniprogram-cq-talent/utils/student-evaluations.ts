import { request } from "./request";
import { getAppContext } from "./store";
export interface EvaluationRevision { revision: number; phrases: Array<{ id: string; text: string }>; note: string; actorDisplayName: string; changedAt: string }
export interface StudentEvaluation { clubId: string; teamId: string; studentId: string; revision: number; history: EvaluationRevision[] }
export interface EvaluationList { studentId: string; studentName: string; phrases: Array<{ id: string; text: string }>; teams: Array<{ id: string; name: string; canEdit: boolean; evaluation: StudentEvaluation | null }> }
function path(studentId: string) {
  const context = getAppContext(); if (!context) throw new Error("请重新登录");
  return `/clubs/${encodeURIComponent(context.clubId)}/app-clients/${encodeURIComponent(context.clientId)}/students/${encodeURIComponent(studentId)}/evaluations`;
}
export function getStudentEvaluations(studentId: string) { return request<EvaluationList>({ path: path(studentId) }); }
export function saveStudentEvaluation(studentId: string, teamId: string, input: { expectedRevision: number; phraseIds: string[]; note: string }) {
  return request<{ evaluation: StudentEvaluation | null }>({ path: `${path(studentId)}/${encodeURIComponent(teamId)}`, method: "PUT", data: input, idempotent: true });
}
export function evaluationHistory(history: EvaluationRevision[]) {
  return history.map((entry, i) => {
    const previous = history[i - 1];
    const added = entry.phrases.filter(p => !previous?.phrases.some(old => old.id === p.id)).map(p => p.text);
    const removed = previous?.phrases.filter(p => !entry.phrases.some(next => next.id === p.id)).map(p => p.text) ?? [];
    const changes = [...(added.length ? [`增加：${added.join("、")}`] : []), ...(removed.length ? [`移除：${removed.join("、")}`] : [])];
    if (entry.note !== (previous?.note ?? "")) changes.push(entry.note ? `补充评价：${entry.note}` : "已清除补充评价");
    const date = Number.isFinite(Date.parse(entry.changedAt)) ? new Date(Date.parse(entry.changedAt) + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ") : "时间未记录";
    return { revision: entry.revision, date, author: `${entry.actorDisplayName || "教练"}${i ? "更新" : "首次评价"}`, changes };
  }).reverse();
}
