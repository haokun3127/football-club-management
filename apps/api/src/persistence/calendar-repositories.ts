import type { CalendarEvent, EntityId, EventParticipant } from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class CalendarRepository {
  constructor(private readonly database: DatabaseSync) {}

  listEvents(clubId: EntityId): CalendarEvent[] {
    const rows = this.database.prepare(`
      SELECT * FROM calendar_events
      WHERE club_id = ?
      ORDER BY starts_at, id
    `).all(clubId) as SqlRow[];

    return rows.map(mapCalendarEvent);
  }

  getEventById(eventId: EntityId): CalendarEvent | null {
    const row = this.database.prepare("SELECT * FROM calendar_events WHERE id = ?").get(eventId) as SqlRow | undefined;
    return row ? mapCalendarEvent(row) : null;
  }

  saveEvent(event: CalendarEvent): CalendarEvent {
    this.database.prepare(`
      INSERT INTO calendar_events (
        id, club_id, type, title, starts_at, ends_at, timezone, recurrence_rule_json,
        location_id, primary_team_id, owner_coach_id, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        title = excluded.title,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        location_id = excluded.location_id,
        primary_team_id = excluded.primary_team_id,
        owner_coach_id = excluded.owner_coach_id,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(...calendarEventValues(event));

    return this.getEventById(event.id)!;
  }

  insertEventIfAbsent(event: CalendarEvent): void {
    this.database.prepare(`
      INSERT INTO calendar_events (
        id, club_id, type, title, starts_at, ends_at, timezone, recurrence_rule_json,
        location_id, primary_team_id, owner_coach_id, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...calendarEventValues(event));
  }

  listParticipants(clubId: EntityId): EventParticipant[] {
    const rows = this.database.prepare(`
      SELECT * FROM event_participants
      WHERE club_id = ?
      ORDER BY event_id, student_id
    `).all(clubId) as SqlRow[];

    return rows.map(mapEventParticipant);
  }

  getParticipantById(eventParticipantId: EntityId): EventParticipant | null {
    const row = this.database.prepare("SELECT * FROM event_participants WHERE id = ?").get(eventParticipantId) as SqlRow | undefined;
    return row ? mapEventParticipant(row) : null;
  }

  listParticipantsForEvent(clubId: EntityId, eventId: EntityId): EventParticipant[] {
    const rows = this.database.prepare(`
      SELECT * FROM event_participants
      WHERE club_id = ? AND event_id = ?
      ORDER BY student_id
    `).all(clubId, eventId) as SqlRow[];

    return rows.map(mapEventParticipant);
  }

  listParticipantsForStudent(clubId: EntityId, studentId: EntityId): EventParticipant[] {
    const rows = this.database.prepare(`
      SELECT * FROM event_participants
      WHERE club_id = ? AND student_id = ?
      ORDER BY event_id
    `).all(clubId, studentId) as SqlRow[];

    return rows.map(mapEventParticipant);
  }

  saveParticipant(participant: EventParticipant): EventParticipant {
    this.database.prepare(`
      INSERT INTO event_participants (
        id, club_id, event_id, student_id, status, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, event_id, student_id) DO UPDATE SET
        status = excluded.status,
        note = excluded.note,
        updated_at = excluded.updated_at
    `).run(...eventParticipantValues(participant));

    return this.listParticipantsForEvent(participant.clubId, participant.eventId)
      .find((item) => item.studentId === participant.studentId)!;
  }

  insertParticipantIfAbsent(participant: EventParticipant): void {
    this.database.prepare(`
      INSERT INTO event_participants (
        id, club_id, event_id, student_id, status, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(...eventParticipantValues(participant));
  }
}

function calendarEventValues(event: CalendarEvent) {
  return [
    event.id,
    event.clubId,
    event.type,
    event.title,
    event.timeRange.startsAt,
    event.timeRange.endsAt,
    null,
    null,
    event.locationId ?? null,
    event.primaryTeamId ?? null,
    event.ownerCoachId ?? null,
    event.status,
    event.notes ?? null,
    event.createdAt,
    event.updatedAt,
  ];
}

function eventParticipantValues(participant: EventParticipant) {
  return [
    participant.id,
    participant.clubId,
    participant.eventId,
    participant.studentId,
    participant.status,
    participant.note ?? null,
    participant.createdAt,
    participant.updatedAt,
  ];
}

function mapCalendarEvent(row: SqlRow): CalendarEvent {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    type: requireString(row, "type") as CalendarEvent["type"],
    title: requireString(row, "title"),
    timeRange: {
      startsAt: requireString(row, "starts_at"),
      endsAt: requireString(row, "ends_at"),
    },
    locationId: optionalString(row, "location_id"),
    primaryTeamId: optionalString(row, "primary_team_id"),
    ownerCoachId: optionalString(row, "owner_coach_id"),
    status: requireString(row, "status") as CalendarEvent["status"],
    notes: optionalString(row, "notes"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapEventParticipant(row: SqlRow): EventParticipant {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    eventId: requireString(row, "event_id"),
    studentId: requireString(row, "student_id"),
    status: requireString(row, "status") as EventParticipant["status"],
    note: optionalString(row, "note"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function requireString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }
  return value;
}

function optionalString(row: SqlRow, key: string): string | undefined {
  const value = row[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }
  return value;
}
