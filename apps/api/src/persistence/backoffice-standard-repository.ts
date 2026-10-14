import type { DatabaseSync } from "node:sqlite";
export interface StandardDefinition {
  name: string;
  version: string;
  targetType: "project" | "metric";
  targetId: string;
  unit: string;
  direction: "higher" | "lower" | "within";
  minimum: number;
  maximum: number;
  applicability: string;
  ageMinimum?: number;
  ageMaximum?: number;
  ageReferenceDate?: string;
  teamLevel?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  basis: "trial" | "official";
  reference: string;
  modelVersionId?: string;
}
export interface StandardVersion {
  id: string;
  clubId: string;
  familyId: string;
  status: "draft" | "active" | "archived";
  definition: StandardDefinition;
  createdAt: string;
  updatedAt: string;
}
export class BackofficeStandardRepository {
  constructor(private readonly database: DatabaseSync) {}
  list(clubId: string) {
    return this.database
      .prepare(
        "SELECT * FROM backoffice_standard_versions WHERE club_id=? ORDER BY updated_at DESC,id",
      )
      .all(clubId)
      .map(decode);
  }
  get(clubId: string, id: string) {
    const row = this.database
      .prepare(
        "SELECT * FROM backoffice_standard_versions WHERE club_id=? AND id=?",
      )
      .get(clubId, id);
    return row ? decode(row) : null;
  }
  save(row: StandardVersion) {
    this.database
      .prepare(
        `INSERT INTO backoffice_standard_versions(id,club_id,family_id,version,status,definition_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,status=excluded.status,definition_json=excluded.definition_json,updated_at=excluded.updated_at`,
      )
      .run(
        row.id,
        row.clubId,
        row.familyId,
        row.definition.version,
        row.status,
        JSON.stringify(row.definition),
        row.createdAt,
        row.updatedAt,
      );
  }
}
function decode(row: Record<string, unknown>): StandardVersion {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    familyId: String(row.family_id),
    status: row.status as StandardVersion["status"],
    definition: JSON.parse(String(row.definition_json)) as StandardDefinition,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
