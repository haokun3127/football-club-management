import {
  correctTrainingRecord,
  reconcileTrainingRecord,
  TrainingRecordConflict,
  type TrainingRecord,
} from "./training-records.js";
import type { AuthContext } from "../auth/context.js";
import type { PersistentApiStore } from "../store.js";
import {
  BackofficeFault,
  digest,
} from "../persistence/backoffice-management-repository.js";
import type { CalendarEvent, EventParticipant } from "@football-club/domain";
export async function backofficeTrainingRecords(
  store: PersistentApiStore,
  clubId: string,
) {
  const events = (await store.listCalendarEvents(clubId)) as Array<
    CalendarEvent & { participants: EventParticipant[] }
  >;
  const students = store.listStudents(clubId);
  return events
    .filter((e) => e.type === "training")
    .flatMap((event) =>
      event.participants.map((participant) => ({
        eventId: event.id,
        studentId: participant.studentId,
        title: event.title,
        name:
          students.find((s) => s.id === participant.studentId)?.name ??
          participant.studentId,
        record: reconcileTrainingRecord(
          store.trainingRecords,
          event,
          participant,
        ),
      })),
    );
}
export async function saveBackofficeTrainingRecord(
  store: PersistentApiStore,
  actor: AuthContext,
  input: {
    eventId: string;
    studentId: string;
    expectedRevision: number;
    counted: boolean;
    reason: string;
    requestId: string;
  },
) {
  const repository = store.repositories.backofficeManagement;
  return repository.transaction(() =>
    saveBackofficeTrainingRecordInTransaction(store, actor, input),
  );
}
export async function saveBackofficeTrainingRecordInTransaction(
  store: PersistentApiStore,
  actor: AuthContext,
  input: {
    eventId: string;
    studentId: string;
    expectedRevision: number;
    counted: boolean;
    reason: string;
    requestId: string;
  },
) {
  const repository = store.repositories.backofficeManagement;
  if (!repository.activeAdmin(actor.clubId, actor.user.id, actor.membership.id))
    throw new BackofficeFault(401, "authentication_required");
  const event = store.getCalendarEvent(input.eventId),
    participant = store
      .listEventParticipants(actor.clubId)
      .find(
        (p) => p.eventId === input.eventId && p.studentId === input.studentId,
      );
  if (
    !event ||
    event.clubId !== actor.clubId ||
    event.type !== "training" ||
    !participant
  )
    throw new BackofficeFault(400, "invalid_reference");
  if (event.status === "cancelled" && input.counted)
    throw new BackofficeFault(409, "cancelled_training");
  const hash = digest({ action: "training-record", input }),
    replay = repository.replay(
      actor.clubId,
      actor.user.id,
      input.requestId,
      hash,
    );
  if (replay !== undefined) return replay as TrainingRecord;
  const current = store.trainingRecords.get(
    actor.clubId,
    input.eventId,
    input.studentId,
  );
  try {
    const saved = correctTrainingRecord(
      store.trainingRecords,
      {
        clubId: actor.clubId,
        eventId: input.eventId,
        studentId: input.studentId,
      },
      {
        ...input,
        actorUserId: actor.user.id,
        actorDisplayName: actor.user.displayName,
        ...(!current ? { initialOccurredAt: event.timeRange.startsAt } : {}),
      },
    );
    repository.audit(
      actor.clubId,
      "training-records",
      JSON.stringify([input.eventId, input.studentId]),
      actor.user.id,
      "correction",
      current,
      saved,
      input.requestId,
    );
    repository.remember(
      actor.clubId,
      actor.user.id,
      input.requestId,
      hash,
      saved,
    );
    return saved;
  } catch (error) {
    if (error instanceof TrainingRecordConflict)
      throw new BackofficeFault(409, "revision_conflict", {
        latest: error.current,
      });
    throw error;
  }
}
