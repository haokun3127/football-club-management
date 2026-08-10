import type { Match, MatchEvent, PlayerMetricRecord } from "@football-club/domain";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class MatchRepository {
  constructor(private readonly database: DatabaseSync) {}

  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    this.database.exec("BEGIN;");
    try {
      const result = await operation();
      this.database.exec("COMMIT;");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  listMatches(clubId: string): Match[] {
    const rows = this.database.prepare("SELECT * FROM matches WHERE club_id = ? ORDER BY created_at, id").all(clubId) as SqlRow[];
    return rows.map(mapMatch);
  }

  listEvents(clubId: string): MatchEvent[] {
    const rows = this.database.prepare("SELECT * FROM match_events WHERE club_id = ? ORDER BY created_at, id").all(clubId) as SqlRow[];
    return rows.map(mapMatchEvent);
  }

  listMetricRecords(clubId: string): PlayerMetricRecord[] {
    const rows = this.database.prepare(`
      SELECT * FROM player_metric_records
      WHERE club_id = ? AND source = 'match_event'
      ORDER BY occurred_at DESC, id DESC
    `).all(clubId) as SqlRow[];
    return rows.map(mapPlayerMetricRecord);
  }

  insertMatchIfAbsent(match: Match): void {
    this.database.prepare(`
      INSERT INTO matches (
        id, club_id, event_id, match_type, opponent_name, home_score, away_score, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...matchValues(match));
  }

  insertEventIfAbsent(event: MatchEvent): void {
    this.database.prepare(`
      INSERT INTO match_events (
        id, club_id, match_id, type, student_id, minute, linked_metric_id, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...matchEventValues(event));
  }

  saveEvent(event: MatchEvent): void {
    this.database.prepare(`
      INSERT INTO match_events (
        id, club_id, match_id, type, student_id, minute, linked_metric_id, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...matchEventValues(event));
  }

  saveMetricRecord(record: PlayerMetricRecord): void {
    this.database.prepare(`
      INSERT INTO player_metric_records (
        id, club_id, student_id, metric_id, value_json, source, occurred_at, event_id,
        assessment_id, template_version_id, raw_result_id, source_record_id,
        recorded_by_coach_id, visibility, confidence, note, lineage_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...playerMetricRecordValues(record));
  }

  insertMetricRecordIfAbsent(record: PlayerMetricRecord): void {
    this.database.prepare(`
      INSERT INTO player_metric_records (
        id, club_id, student_id, metric_id, value_json, source, occurred_at, event_id,
        assessment_id, template_version_id, raw_result_id, source_record_id,
        recorded_by_coach_id, visibility, confidence, note, lineage_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(...playerMetricRecordValues(record));
  }
}

function matchValues(match: Match): Array<string | number | null> {
  return [
    match.id,
    match.clubId,
    match.eventId,
    match.matchType,
    match.opponentName ?? null,
    match.homeScore ?? null,
    match.awayScore ?? null,
    match.status,
    match.createdAt,
    match.updatedAt,
  ];
}

function matchEventValues(event: MatchEvent): Array<string | number | null> {
  return [
    event.id,
    event.clubId,
    event.matchId,
    event.type,
    event.studentId,
    event.minute ?? null,
    event.linkedMetricId ?? null,
    event.note ?? null,
    event.createdAt,
    event.updatedAt,
  ];
}

function playerMetricRecordValues(record: PlayerMetricRecord): SQLInputValue[] {
  return [
    record.id,
    record.clubId,
    record.studentId,
    record.metricId,
    JSON.stringify(record.value),
    record.source,
    record.occurredAt,
    record.eventId ?? null,
    record.assessmentId ?? null,
    record.templateVersionId ?? null,
    record.rawResultId ?? null,
    record.sourceRecordId ?? null,
    record.recordedByCoachId ?? null,
    record.visibility ?? null,
    record.confidence ?? null,
    record.note ?? null,
    record.lineageId ?? null,
    record.createdAt,
    record.updatedAt,
  ];
}

function mapMatch(row: SqlRow): Match {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    eventId: requiredString(row, "event_id"),
    matchType: requiredString(row, "match_type") as Match["matchType"],
    opponentName: optionalString(row, "opponent_name"),
    homeScore: optionalNumber(row, "home_score"),
    awayScore: optionalNumber(row, "away_score"),
    status: requiredString(row, "status") as Match["status"],
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function mapMatchEvent(row: SqlRow): MatchEvent {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    matchId: requiredString(row, "match_id"),
    type: requiredString(row, "type") as MatchEvent["type"],
    studentId: requiredString(row, "student_id"),
    minute: optionalNumber(row, "minute"),
    linkedMetricId: optionalString(row, "linked_metric_id"),
    note: optionalString(row, "note"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function mapPlayerMetricRecord(row: SqlRow): PlayerMetricRecord {
  return {
    id: requiredString(row, "id"),
    clubId: requiredString(row, "club_id"),
    studentId: requiredString(row, "student_id"),
    metricId: requiredString(row, "metric_id"),
    value: JSON.parse(requiredString(row, "value_json")) as PlayerMetricRecord["value"],
    source: "match_event",
    occurredAt: requiredString(row, "occurred_at") as PlayerMetricRecord["occurredAt"],
    eventId: optionalString(row, "event_id"),
    assessmentId: optionalString(row, "assessment_id"),
    templateVersionId: optionalString(row, "template_version_id"),
    rawResultId: optionalString(row, "raw_result_id"),
    sourceRecordId: optionalString(row, "source_record_id"),
    recordedByCoachId: optionalString(row, "recorded_by_coach_id"),
    visibility: optionalString(row, "visibility") as PlayerMetricRecord["visibility"],
    confidence: optionalNumber(row, "confidence"),
    note: optionalString(row, "note"),
    lineageId: optionalString(row, "lineage_id"),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
  };
}

function requiredString(row: SqlRow, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
  return value;
}

function optionalString(row: SqlRow, key: string): string | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
  return value;
}

function optionalNumber(row: SqlRow, key: string): number | undefined {
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "number") throw new Error(`Expected ${key} to be a number.`);
  return value;
}
