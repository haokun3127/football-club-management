/** Communication phrases, never assessment metrics or scores. */
export const evaluationPhrases = [
  { id: "observe-teammates", text: "主动观察队友" },
  { id: "dribble-confidently", text: "敢于持球突破" },
  { id: "off-ball-movement", text: "加强无球跑动" },
];
export interface EvaluationRevision {
  revision: number; phrases: Array<{ id: string; text: string }>; note: string;
  actorUserId: string; actorDisplayName: string; changedAt: string;
}
export interface StudentEvaluation {
  clubId: string; teamId: string; studentId: string; revision: number; history: EvaluationRevision[];
}
export interface StudentEvaluationRepository {
  list(clubId: string, studentId: string): StudentEvaluation[];
  get(clubId: string, teamId: string, studentId: string): StudentEvaluation | null;
  compareAndSave(record: StudentEvaluation, expectedRevision: number): boolean;
}
export class MemoryStudentEvaluationRepository implements StudentEvaluationRepository {
  private records = new Map<string, StudentEvaluation>();
  list(clubId: string, studentId: string) { return structuredClone([...this.records.values()].filter(r => r.clubId === clubId && r.studentId === studentId)); }
  get(clubId: string, teamId: string, studentId: string) { return structuredClone(this.records.get(JSON.stringify([clubId, teamId, studentId])) ?? null); }
  compareAndSave(record: StudentEvaluation, expectedRevision: number) {
    if (record.revision !== expectedRevision + 1) throw new Error("Invalid evaluation revision");
    if ((this.get(record.clubId, record.teamId, record.studentId)?.revision ?? 0) !== expectedRevision) return false;
    this.records.set(JSON.stringify([record.clubId, record.teamId, record.studentId]), structuredClone(record)); return true;
  }
}
export class EvaluationConflict extends Error { constructor() { super("Evaluation changed; reload before saving"); } }
export function saveStudentEvaluation(repository: StudentEvaluationRepository, scope: { clubId: string; teamId: string; studentId: string }, input: { expectedRevision: number; phraseIds: string[]; note: string }, actor: { id: string; displayName: string }, now = new Date().toISOString(), catalog = evaluationPhrases) {
  const current = repository.get(scope.clubId, scope.teamId, scope.studentId);
  if ((current?.revision ?? 0) !== input.expectedRevision) throw new EvaluationConflict();
  const previous = current?.history.at(-1);
  // Retired wording may be retained in this evaluation, but cannot be newly selected.
  const available = [...catalog, ...(previous?.phrases.filter(old => !catalog.some(p => p.id === old.id)) ?? [])];
  if (new Set(input.phraseIds).size !== input.phraseIds.length || input.phraseIds.some(id => !available.some(p => p.id === id)) || input.note.length > 500) throw new Error("Invalid evaluation content");
  const phrases = [...(previous?.phrases ?? []).filter(p => input.phraseIds.includes(p.id)).map(p => available.find(item => item.id === p.id)!), ...available.filter(p => input.phraseIds.includes(p.id) && !previous?.phrases.some(old => old.id === p.id))];
  const note = input.note.trim();
  // No-op and request retries must not manufacture a change in the child's timeline.
  if ((!previous && !phrases.length && !note) || (previous && JSON.stringify(previous.phrases) === JSON.stringify(phrases) && previous.note === note)) return current;
  const revision = (current?.revision ?? 0) + 1;
  const record = { ...scope, revision, history: [...(current?.history ?? []), { revision, phrases, note, actorUserId: actor.id, actorDisplayName: actor.displayName, changedAt: now }] };
  if (!repository.compareAndSave(record, input.expectedRevision)) throw new EvaluationConflict();
  return record;
}
export function evaluationForClient(record: StudentEvaluation | null) {
  return record ? { ...record, history: record.history.map(({ actorUserId: _id, ...entry }) => entry) } : null;
}
