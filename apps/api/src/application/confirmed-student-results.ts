import type { CalendarEvent, PlayerAssessment } from "@football-club/domain";
import type { ApiStore } from "../store.js";

/** Read only published raw facts. Draft entries and superseded revisions are never extra attempts. */
export async function confirmedStudentResults(store: ApiStore, clubId: string, studentId: string, teamIds: Set<string>) {
  const tasks = new Map((await store.listAssessmentTasks(clubId)).map(task => [task.id, task]));
  const events = new Map((store.listCalendarEvents(clubId) as CalendarEvent[]).map(event => [event.id, event]));
  const items = new Map((await store.listAssessmentTestItems(clubId)).map(item => [item.id, item]));
  const published = (await store.listPlayerAssessments(clubId)).filter(assessment => assessment.studentId === studentId);
  const latestByTask = new Map<string, PlayerAssessment>();
  for (const assessment of published) {
    if (!assessment.assessmentTaskId) continue;
    const previous = latestByTask.get(assessment.assessmentTaskId);
    if (!previous || assessment.createdAt > previous.createdAt || (assessment.createdAt === previous.createdAt && assessment.id > previous.id)) latestByTask.set(assessment.assessmentTaskId, assessment);
  }
  const visible = new Map(published.filter(assessment => {
    const task = assessment.assessmentTaskId ? tasks.get(assessment.assessmentTaskId) : undefined;
    const event = assessment.eventId ? events.get(assessment.eventId) : undefined;
    if (!(task ? teamIds.has(task.teamId) : event?.primaryTeamId && teamIds.has(event.primaryTeamId))) return false;
    if (!task) return true;
    const state = store.assessmentWorkflow.get(clubId, task.id, studentId);
    const currentId = state ? state.publications.at(-1)?.assessmentId : latestByTask.get(task.id)?.id;
    return assessment.id === currentId;
  }).map(assessment => [assessment.id, assessment]));
  return store.listAssessmentRawResults(clubId).flatMap(raw => {
    const assessment = visible.get(raw.assessmentId);
    const item = items.get(raw.testItemId);
    if (!assessment || !item) return [];
    return [{ id: raw.id, assessmentId: assessment.id, taskId: assessment.assessmentTaskId ?? null,
      testItemId: raw.testItemId, metricId: raw.metricId, name: item.name, value: raw.value, unit: item.unit ?? null,
      templateVersionId: assessment.templateVersionId ?? null, eventId: raw.eventId ?? assessment.eventId ?? null,
      occurredAt: raw.occurredAt ?? assessment.assessedAt, recordedAt: raw.recordedAt ?? raw.createdAt,
      mapping: raw.mapping ? { integerScore: raw.mapping.integerScore, grade: raw.mapping.grade, rawScoreVersionId: raw.mapping.rawScoreVersionId, gradeVersionId: raw.mapping.gradeVersionId, mappedAt: raw.mapping.mappedAt } : null }];
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.recordedAt.localeCompare(a.recordedAt) || a.id.localeCompare(b.id));
}
