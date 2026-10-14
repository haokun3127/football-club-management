import type { DatabaseSync } from "node:sqlite";
import type { ModelDefinition } from "../application/backoffice-model-types.js";
import type { DerivedMetricDefinition } from "@football-club/domain";
export class BackofficeModelRepository {
  constructor(private readonly database: DatabaseSync) {}
  definition(clubId: string, id: string): ModelDefinition | null {
    const row = this.database
      .prepare(
        "SELECT definition_json FROM backoffice_model_definitions WHERE club_id=? AND template_version_id=?",
      )
      .get(clubId, id);
    return row
      ? (JSON.parse(String(row.definition_json)) as ModelDefinition)
      : null;
  }
  save(clubId: string, id: string, definition: ModelDefinition, now: string) {
    this.database
      .prepare(
        "INSERT INTO backoffice_model_definitions(template_version_id,club_id,definition_json,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(template_version_id) DO UPDATE SET definition_json=excluded.definition_json,updated_at=excluded.updated_at",
      )
      .run(id, clubId, JSON.stringify(definition), now, now);
  }
  clearDraftEdges(clubId: string, versionId: string, graphId: string) {
    this.database
      .prepare(
        "DELETE FROM assessment_metric_bindings WHERE club_id=? AND template_version_id=?",
      )
      .run(clubId, versionId);
    this.database
      .prepare(
        "DELETE FROM metric_dependencies WHERE scope_club_id=? AND graph_version_id=?",
      )
      .run(clubId, graphId);
  }
  display(clubId: string, id: string) {
    const view = this.database
      .prepare("SELECT id FROM metric_views WHERE scope_club_id=? AND id=?")
      .get(clubId, `model-view-${id}`);
    const rows = view
      ? this.database
          .prepare(
            "SELECT id,metric_id,parent_view_node_id,label,sort_order FROM metric_view_nodes WHERE scope_club_id=? AND view_id=? ORDER BY sort_order,id",
          )
          .all(clubId, String(view.id))
      : [];
    const groups = rows
      .filter(
        (row) => row.metric_id === null && row.parent_view_node_id === null,
      )
      .map((row) => ({
        name: String(row.label),
        metricIds: rows
          .filter(
            (child) =>
              child.parent_view_node_id === row.id &&
              typeof child.metric_id === "string",
          )
          .map((child) => String(child.metric_id)),
      }));
    return groups;
  }
  clearDisplay(clubId: string, id: string) {
    this.database
      .prepare(
        "DELETE FROM metric_view_nodes WHERE scope_club_id=? AND view_id=?",
      )
      .run(clubId, `model-view-${id}`);
  }
  saveFormula(row: DerivedMetricDefinition) {
    if (row.catalogScope.scope !== "club")
      throw new Error("Model formula must belong to a club");
    this.database
      .prepare(
        `INSERT INTO derived_metric_definitions(id,catalog_scope,scope_club_id,code,name,output_metric_id,method,input_metric_ids_json,version,weights_json,input_scale,max_score,rounding,output_unit,created_at,updated_at) VALUES(?,'club',?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET method=excluded.method,input_metric_ids_json=excluded.input_metric_ids_json,weights_json=excluded.weights_json,input_scale=excluded.input_scale,max_score=excluded.max_score,rounding=excluded.rounding,updated_at=excluded.updated_at`,
      )
      .run(
        row.id,
        row.catalogScope.clubId,
        row.code,
        row.name,
        row.outputMetricId,
        row.method,
        JSON.stringify(row.inputMetricIds),
        row.version,
        JSON.stringify(row.weights ?? {}),
        row.inputScale ?? null,
        row.maxScore ?? null,
        row.rounding ?? null,
        row.outputUnit ?? "score",
        row.createdAt,
        row.updatedAt,
      );
  }
}
