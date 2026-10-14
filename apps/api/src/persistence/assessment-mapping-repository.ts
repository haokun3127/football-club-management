import type { ScoreMappingDefinition } from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";
export interface MappingVersion {
  id: string;
  clubId: string;
  testItemId: string;
  status: "draft" | "active" | "archived";
  definition: ScoreMappingDefinition;
  createdAt: string;
  updatedAt: string;
}
export class AssessmentMappingRepository {
  constructor(private readonly database: DatabaseSync) {}
  list(clubId: string): MappingVersion[] {
    return this.database
      .prepare(
        "SELECT * FROM assessment_mapping_versions WHERE club_id=? ORDER BY updated_at DESC,id",
      )
      .all(clubId)
      .map(decode);
  }
  get(clubId: string, id: string): MappingVersion | null {
    const row = this.database
      .prepare(
        "SELECT * FROM assessment_mapping_versions WHERE club_id=? AND id=?",
      )
      .get(clubId, id);
    return row ? decode(row) : null;
  }
  save(row: MappingVersion) {
    this.database
      .prepare(
        `INSERT INTO assessment_mapping_versions(id,club_id,test_item_id,stage,status,definition_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)
   ON CONFLICT(id) DO UPDATE SET status=excluded.status,definition_json=excluded.definition_json,updated_at=excluded.updated_at`,
      )
      .run(
        row.id,
        row.clubId,
        row.testItemId,
        row.definition.stage,
        row.status,
        JSON.stringify(row.definition),
        row.createdAt,
        row.updatedAt,
      );
  }
}
function decode(row: Record<string, unknown>): MappingVersion {
  const value = JSON.parse(
    String(row.definition_json),
  ) as ScoreMappingDefinition;
  if (value.stage !== row.stage) throw new Error("Invalid mapping document");
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    testItemId: String(row.test_item_id),
    status: row.status as MappingVersion["status"],
    definition: value,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
