import type { SessionPlan } from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";

type SqlRow = Record<string, unknown>;

export class SessionPlanRepository {
  constructor(private readonly database: DatabaseSync) {}

  listByClub(clubId: string): SessionPlan[] {
    const rows = this.database.prepare(`
      SELECT *
      FROM session_plans
      WHERE catalog_scope = 'system' OR catalog_club_id = ?
      ORDER BY updated_at, id
    `).all(clubId) as SqlRow[];

    return rows.map(mapSessionPlan);
  }

  getById(clubId: string, id: string): SessionPlan | null {
    const row = this.database.prepare(`
      SELECT *
      FROM session_plans
      WHERE id = ?
        AND (catalog_scope = 'system' OR catalog_club_id = ?)
    `).get(id, clubId) as SqlRow | undefined;

    return row ? mapSessionPlan(row) : null;
  }

  save(plan: SessionPlan): SessionPlan {
    this.database.prepare(`
      INSERT INTO session_plans (
        id, catalog_scope, catalog_club_id, base_item_id, name,
        objective_ids_json, metric_ids_json, blocks_json, estimated_minutes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        catalog_scope = excluded.catalog_scope,
        catalog_club_id = excluded.catalog_club_id,
        base_item_id = excluded.base_item_id,
        name = excluded.name,
        objective_ids_json = excluded.objective_ids_json,
        metric_ids_json = excluded.metric_ids_json,
        blocks_json = excluded.blocks_json,
        estimated_minutes = excluded.estimated_minutes,
        updated_at = excluded.updated_at
    `).run(
      plan.id,
      plan.catalogScope.scope,
      plan.catalogScope.scope === "club" ? plan.catalogScope.clubId : null,
      plan.catalogScope.scope === "club" ? plan.catalogScope.baseItemId ?? null : null,
      plan.name,
      JSON.stringify(plan.objectiveIds),
      JSON.stringify(plan.metricIds),
      JSON.stringify(plan.blocks),
      plan.estimatedMinutes,
      plan.createdAt,
      plan.updatedAt,
    );

    return this.getByIdForPlan(plan)!;
  }

  insertIfAbsent(plan: SessionPlan): void {
    this.database.prepare(`
      INSERT INTO session_plans (
        id, catalog_scope, catalog_club_id, base_item_id, name,
        objective_ids_json, metric_ids_json, blocks_json, estimated_minutes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(
      plan.id,
      plan.catalogScope.scope,
      plan.catalogScope.scope === "club" ? plan.catalogScope.clubId : null,
      plan.catalogScope.scope === "club" ? plan.catalogScope.baseItemId ?? null : null,
      plan.name,
      JSON.stringify(plan.objectiveIds),
      JSON.stringify(plan.metricIds),
      JSON.stringify(plan.blocks),
      plan.estimatedMinutes,
      plan.createdAt,
      plan.updatedAt,
    );
  }

  private getByIdForPlan(plan: SessionPlan): SessionPlan | null {
    const row = this.database.prepare("SELECT * FROM session_plans WHERE id = ?").get(plan.id) as SqlRow | undefined;
    return row ? mapSessionPlan(row) : null;
  }
}

function mapSessionPlan(row: SqlRow): SessionPlan {
  const requiredString = (key: string): string => {
    const value = row[key];
    if (typeof value !== "string") throw new Error(`Expected ${key} to be a string.`);
    return value;
  };
  const requiredJsonArray = <T>(key: string): T[] => {
    const value: unknown = JSON.parse(requiredString(key));
    if (!Array.isArray(value)) throw new Error(`Expected ${key} to contain a JSON array.`);
    return value as T[];
  };
  const scope = requiredString("catalog_scope");
  const catalogScope = scope === "system"
    ? { scope: "system" as const }
    : {
        scope: "club" as const,
        clubId: requiredString("catalog_club_id"),
        ...(row.base_item_id ? { baseItemId: String(row.base_item_id) } : {}),
      };

  return {
    id: requiredString("id"),
    catalogScope,
    name: requiredString("name"),
    objectiveIds: requiredJsonArray<string>("objective_ids_json"),
    metricIds: requiredJsonArray<string>("metric_ids_json"),
    blocks: requiredJsonArray<SessionPlan["blocks"][number]>("blocks_json"),
    estimatedMinutes: Number(row.estimated_minutes),
    createdAt: requiredString("created_at"),
    updatedAt: requiredString("updated_at"),
  };
}
