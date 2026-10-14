import type { DatabaseSync } from "node:sqlite";
import type { BackofficeValues } from "./backoffice-management-repository.js";
export interface ImportRow {
  rowNumber: number;
  rawId: string;
  externalId: string;
  values: BackofficeValues;
  targetId?: string;
  expectedRevision: string | null;
  action: "create" | "update" | "duplicate";
  status: "pending" | "success" | "failed" | "duplicate";
  error?: string;
  resultId?: string;
}
export interface ImportBatch {
  id: string;
  clubId: string;
  actorId: string;
  resourceKey: string;
  sourceName: string;
  mappingVersion: string;
  blankPolicy: "preserve" | "clear";
  fields: string[];
  rows: ImportRow[];
  createdAt: string;
  updatedAt: string;
}
export class BackofficeImportRepository {
  constructor(readonly database: DatabaseSync) {}
  get(clubId: string, id: string): ImportBatch | null {
    const row = this.database
      .prepare(
        "SELECT * FROM backoffice_import_batches WHERE club_id=? AND id=?",
      )
      .get(clubId, id);
    return row
      ? {
          id: String(row.id),
          clubId: String(row.club_id),
          actorId: String(row.actor_id),
          resourceKey: String(row.resource_key),
          sourceName: String(row.source_name),
          mappingVersion: String(row.mapping_version),
          blankPolicy: row.blank_policy as ImportBatch["blankPolicy"],
          fields: JSON.parse(String(row.fields_json)),
          rows: JSON.parse(String(row.rows_json)),
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        }
      : null;
  }
  list(clubId: string) {
    return this.database
      .prepare(
        "SELECT id FROM backoffice_import_batches WHERE club_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .all(clubId)
      .map((row) => this.get(clubId, String(row.id))!);
  }
  save(batch: ImportBatch, confirmed = false) {
    this.database
      .prepare(
        "INSERT INTO backoffice_import_batches(id,club_id,actor_id,resource_key,source_name,mapping_version,blank_policy,fields_json,rows_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET rows_json=excluded.rows_json,updated_at=excluded.updated_at WHERE club_id=excluded.club_id",
      )
      .run(
        batch.id,
        batch.clubId,
        batch.actorId,
        batch.resourceKey,
        batch.sourceName,
        batch.mappingVersion,
        batch.blankPolicy,
        JSON.stringify(batch.fields),
        JSON.stringify(batch.rows),
        batch.createdAt,
        batch.updatedAt,
      );
    this.updateRun(batch, confirmed);
  }
  updateRun(batch: ImportBatch, confirmed = false) {
    const now = batch.updatedAt,
      completed = !batch.rows.some((row) => row.status === "pending");
    this.database
      .prepare(
        "UPDATE external_sync_runs SET failed_records=?,imported_records=?,updated_at=?,status=CASE WHEN ? THEN ? ELSE status END,started_at=CASE WHEN ? THEN COALESCE(started_at,?) ELSE started_at END,finished_at=CASE WHEN ? AND ? THEN ? ELSE finished_at END WHERE club_id=? AND id=?",
      )
      .run(
        batch.rows.filter((row) => row.status === "failed").length,
        batch.rows.filter((row) => row.status === "success").length,
        now,
        confirmed ? 1 : 0,
        completed ? "completed" : "running",
        confirmed ? 1 : 0,
        now,
        confirmed ? 1 : 0,
        completed ? 1 : 0,
        now,
        batch.clubId,
        batch.id,
      );
  }
  link(clubId: string, connectionId: string, externalId: string) {
    const row = this.database
      .prepare(
        `SELECT l.target_id,r.payload_hash,r.id FROM external_raw_records r JOIN external_record_links l ON l.raw_record_id=r.id AND l.club_id=r.club_id WHERE r.club_id=? AND r.connection_id=? AND r.external_record_id=? AND l.link_status='confirmed' ORDER BY l.confirmed_at DESC,l.id DESC LIMIT 1`,
      )
      .get(clubId, connectionId, externalId);
    return row
      ? {
          targetId: String(row.target_id),
          hash: String(row.payload_hash),
          rawId: String(row.id),
        }
      : null;
  }
  confirmedRaw(clubId: string, rawId: string) {
    const row = this.database
      .prepare(
        "SELECT target_id FROM external_record_links WHERE club_id=? AND raw_record_id=? AND link_status='confirmed' LIMIT 1",
      )
      .get(clubId, rawId);
    return row ? String(row.target_id) : null;
  }
  confirmLink(
    batch: ImportBatch,
    row: ImportRow,
    actorId: string,
    targetId: string,
  ) {
    const now = new Date().toISOString();
    this.database
      .prepare(
        "UPDATE external_raw_records SET review_status='confirmed',validation_errors_json=NULL,updated_at=? WHERE club_id=? AND id=?",
      )
      .run(now, batch.clubId, row.rawId);
    this.database
      .prepare(
        "INSERT INTO external_record_links(id,club_id,raw_record_id,target_type,target_id,link_status,confirmed_by,confirmed_at,created_at,updated_at) VALUES(?,?,?,?,?,'confirmed',?,?,?,?) ON CONFLICT(id) DO NOTHING",
      )
      .run(
        `import-link-${row.rawId}`,
        batch.clubId,
        row.rawId,
        batch.resourceKey,
        targetId,
        actorId,
        now,
        now,
        now,
      );
  }
}
