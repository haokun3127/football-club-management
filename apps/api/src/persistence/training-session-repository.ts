import type { EntityId, TrainingSession } from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class TrainingSessionRepository {
  constructor(private readonly database: DatabaseSync) {}

  listByClub(clubId: EntityId): TrainingSession[] {
    const rows = this.database.prepare(`
      SELECT *
      FROM training_sessions
      WHERE club_id = ?
      ORDER BY event_id, id
    `).all(clubId) as SqlRow[];

    return rows.map(mapTrainingSession);
  }

  getByEvent(clubId: EntityId, eventId: EntityId): TrainingSession | null {
    const row = this.database.prepare(`
      SELECT *
      FROM training_sessions
      WHERE club_id = ? AND event_id = ?
    `).get(clubId, eventId) as SqlRow | undefined;

    return row ? mapTrainingSession(row) : null;
  }

  save(session: TrainingSession): TrainingSession {
    this.database.prepare(`
      INSERT INTO training_sessions (
        id, club_id, event_id, kind, session_plan_id, intensity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, event_id) DO UPDATE SET
        kind = excluded.kind,
        session_plan_id = excluded.session_plan_id,
        intensity = excluded.intensity,
        updated_at = excluded.updated_at
    `).run(
      session.id,
      session.clubId,
      session.eventId,
      session.kind,
      session.sessionPlanId ?? null,
      session.intensity ?? null,
      session.createdAt,
      session.updatedAt,
    );

    return this.getByEvent(session.clubId, session.eventId)!;
  }

  insertIfAbsent(session: TrainingSession): void {
    this.database.prepare(`
      INSERT INTO training_sessions (
        id, club_id, event_id, kind, session_plan_id, intensity, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `).run(
      session.id,
      session.clubId,
      session.eventId,
      session.kind,
      session.sessionPlanId ?? null,
      session.intensity ?? null,
      session.createdAt,
      session.updatedAt,
    );
  }
}

function mapTrainingSession(row: SqlRow): TrainingSession {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    eventId: requiredString(row, "event_id"),
    kind: requiredString(row, "kind") as TrainingSession["kind"],
    ...(row.session_plan_id === null || row.session_plan_id === undefined
      ? {}
      : { sessionPlanId: String(row.session_plan_id) }),
    ...(row.intensity === null || row.intensity === undefined
      ? {}
      : { intensity: String(row.intensity) as TrainingSession["intensity"] }),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function requiredString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string.`);
  }
  return value;
}
