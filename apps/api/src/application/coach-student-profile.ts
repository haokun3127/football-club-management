import type { CalendarEvent, Match, TrainingSession } from "@football-club/domain";
import type { ApiStore } from "../store.js";
import { buildTrainingContentTree } from "./training-content-catalog.js";
import { summarizeSelectedTraining } from "./training-content-summary.js";
import { reconcileTrainingRecord } from "./training-records.js";

/** Teaching-only projection. Never spread an operational student/contact/ledger object. */
export async function buildCoachStudentProfile(store: ApiStore, clubId: string, studentId: string, teamIds: Set<string>, now = new Date().toISOString()) {
  const student = await store.getOperationalStudentDetail(clubId, studentId);
  if (!student) return null;
  const teams = store.listTeams(clubId);
  const memberships = store.listTeamMembers(clubId).filter(member => member.studentId === studentId && teamIds.has(member.teamId));
  const participants = new Map(store.listEventParticipants(clubId).filter(item => item.studentId === studentId).map(item => [item.eventId, item]));
  type Event = CalendarEvent & { trainingSession?: TrainingSession; match?: Match };
  const events = (store.listCalendarEvents(clubId) as Event[]).filter(event => event.primaryTeamId && teamIds.has(event.primaryTeamId) && participants.has(event.id));
  const ended = events.filter(event => event.status !== "cancelled" && Date.parse(event.timeRange.endsAt) <= Date.parse(now));
  const trainings = ended.filter(event => event.type === "training");
  const facts = new Map(events.filter(event => event.type === "training").map(event => [event.id, reconcileTrainingRecord(store.trainingRecords, event, participants.get(event.id)!, now)]));
  function effectiveStatus(eventId: string) {
    const fact = facts.get(eventId);
    const status = participants.get(eventId)!.status;
    if (!fact) return "pending";
    if (fact.counted) return status === "late" ? "late" : "present";
    return ["leave_requested", "excused"].includes(status) && fact.source !== "correction" ? status : "absent";
  }
  const counts = { expected: trainings.length, present: 0, absent: 0, leave: 0, late: 0, unrecorded: 0 };
  for (const event of trainings) {
    const status = effectiveStatus(event.id);
    if (status === "present" || status === "late") counts.present++;
    if (status === "late") counts.late++;
    else if (status === "absent") counts.absent++;
    else if (status === "leave_requested" || status === "excused") counts.leave++;
    else if (status !== "present") counts.unrecorded++;
  }
  const records = events.filter(event => event.type === "training").flatMap(event => {
    const record = facts.get(event.id);
    return record ? [{ eventId: event.id, title: event.title, occurredAt: record.occurredAt, status: effectiveStatus(event.id),
      counted: record.counted, source: record.source, revision: record.revision,
      history: record.history.map(({ actorUserId: _actor, ...entry }) => entry) }] : [];
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const drills = store.listTrainingDrills(clubId);
  const tree = buildTrainingContentTree({ views: store.listMetricViews(clubId), viewNodes: store.listMetricViewNodes(clubId), metrics: store.listAbilityMetrics(clubId), drills });
  const modules = new Map<string, { label: string; courses: number; configuredMinutes: number | null }>();
  // Attendance proves participation in the course, not completion of every planned drill.
  for (const event of trainings.filter(item => facts.get(item.id)?.counted)) {
    const plan = event.trainingSession?.sessionPlanId ? store.getSessionPlan(event.trainingSession.sessionPlanId) : null;
    for (const group of summarizeSelectedTraining(plan, drills, tree).groups) {
      const value = modules.get(group.id) ?? { label: group.label, courses: 0, configuredMinutes: 0 };
      value.courses++;
      const minutes = group.items.every(item => item.configuredMinutes !== null) ? group.items.reduce((sum, item) => sum + item.configuredMinutes!, 0) : null;
      value.configuredMinutes = value.configuredMinutes === null || minutes === null ? null : value.configuredMinutes + minutes;
      modules.set(group.id, value);
    }
  }
  const born = Date.parse(student.birthDate);
  const today = new Date(Date.parse(now) + 8 * 3_600_000).toISOString().slice(0, 10);
  const years = Number(today.slice(0, 4)) - Number(student.birthDate.slice(0, 4)) - (today.slice(5) < student.birthDate.slice(5) ? 1 : 0);
  return {
    student: { id: student.id, name: student.name, age: Number.isFinite(born) && years >= 0 ? years : null,
      school: typeof student.operationalProfile?.school === "string" ? student.operationalProfile.school : null,
      dominantFoot: student.dominantFoot ?? null, level: student.currentLevel ?? null,
      teams: memberships.map(member => ({ id: member.teamId, name: teams.find(team => team.id === member.teamId)?.name ?? "球队", joinedAt: member.startsAt })) },
    attendance: { ...counts, effectiveLessons: records.filter(record => record.counted).length, earlyLeave: null },
    records,
    training: { modules: [...modules.values()], participation: counts.present,
      formalMatches: ended.filter(event => event.type === "match" && event.match && ["league", "cup"].includes(event.match.matchType) && ["present", "late"].includes(participants.get(event.id)!.status)).length,
      friendlyMatches: null, completionTargets: null },
  };
}
