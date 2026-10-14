import type { DatabaseSync } from "node:sqlite";
export type BiTopic =
  "operations" | "training" | "assessment" | "growth" | "services";
export interface BiFilters {
  from?: string;
  to?: string;
  teamId?: string;
  studentId?: string;
  metricId?: string;
}
export interface BiData {
  cards: Array<{
    key: string;
    label: string;
    value: number | null;
    unit?: string;
  }>;
  columns: Array<{ key: string; label: string }>;
  rows: Array<{
    id: string;
    values: Record<string, string | number | boolean | null>;
  }>;
  notes: string[];
}
export interface BiSnapshot {
  id: string;
  clubId: string;
  actorId: string;
  topic: BiTopic;
  filters: BiFilters;
  data: BiData;
  factVersion: string;
  createdAt: string;
}
export class BackofficeBiRepository {
  constructor(readonly database: DatabaseSync) {}
  save(snapshot: BiSnapshot) {
    this.database
      .prepare(
        "INSERT INTO backoffice_bi_snapshots(id,club_id,actor_id,topic,filters_json,data_json,fact_version,created_at) VALUES(?,?,?,?,?,?,?,?)",
      )
      .run(
        snapshot.id,
        snapshot.clubId,
        snapshot.actorId,
        snapshot.topic,
        JSON.stringify(snapshot.filters),
        JSON.stringify(snapshot.data),
        snapshot.factVersion,
        snapshot.createdAt,
      );
  }
  get(clubId: string, id: string): BiSnapshot | null {
    const row = this.database
      .prepare("SELECT * FROM backoffice_bi_snapshots WHERE club_id=? AND id=?")
      .get(clubId, id);
    return row
      ? {
          id: String(row.id),
          clubId: String(row.club_id),
          actorId: String(row.actor_id),
          topic: row.topic as BiTopic,
          filters: JSON.parse(String(row.filters_json)),
          data: JSON.parse(String(row.data_json)),
          factVersion: String(row.fact_version),
          createdAt: String(row.created_at),
        }
      : null;
  }
}
