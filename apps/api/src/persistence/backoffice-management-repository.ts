import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import {
  backofficeResources,
  type BackofficeResource,
} from "../application/backoffice-resources.js";
import { transaction } from "./transaction.js";
export type BackofficeValues = Record<
  string,
  string | number | boolean | string[] | null
>;
export interface BackofficeRecord {
  id: string;
  revision: string;
  values: BackofficeValues;
  updatedAt: string;
  readOnly?: boolean;
}
export class BackofficeFault extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(code);
  }
}
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const column = (resource: BackofficeResource, key: string) =>
  resource.columns?.[key] ??
  key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
export class BackofficeManagementRepository {
  constructor(readonly database: DatabaseSync) {}
  transaction<T>(operation: () => Promise<T>): Promise<T> {
    return transaction(this.database, operation);
  }
  activeBrowser(clubId: string, userId: string, membershipId: string): boolean {
    const row = this.database
      .prepare(
        "SELECT m.roles_json FROM club_user_memberships m JOIN user_accounts u ON u.id=m.user_id WHERE m.club_id=? AND m.user_id=? AND m.id=? AND m.status='active' AND u.status='active'",
      )
      .get(clubId, userId, membershipId);
    return (
      !!row &&
      (JSON.parse(String(row.roles_json)) as string[]).some((role) =>
        ["owner", "admin", "operator"].includes(role),
      )
    );
  }
  activeAdmin(clubId: string, userId: string, membershipId: string): boolean {
    const row = this.database
      .prepare(
        "SELECT m.roles_json FROM club_user_memberships m JOIN user_accounts u ON u.id=m.user_id WHERE m.club_id=? AND m.user_id=? AND m.id=? AND m.status='active' AND u.status='active'",
      )
      .get(clubId, userId, membershipId);
    return (
      !!row &&
      (JSON.parse(String(row.roles_json)) as string[]).some((role) =>
        ["owner", "admin"].includes(role),
      )
    );
  }
  grants(clubId: string, userId: string): string[] {
    return this.database
      .prepare(
        "SELECT capability FROM backoffice_grants WHERE club_id=? AND user_id=? ORDER BY capability",
      )
      .all(clubId, userId)
      .map((row) => String(row.capability));
  }
  replaceGrants(clubId: string, userId: string, capabilities: string[]) {
    if (
      !this.database
        .prepare(
          "SELECT id FROM club_user_memberships WHERE club_id=? AND user_id=? AND status='active'",
        )
        .get(clubId, userId)
    )
      throw new BackofficeFault(400, "invalid_reference");
    this.database
      .prepare("DELETE FROM backoffice_grants WHERE club_id=? AND user_id=?")
      .run(clubId, userId);
    for (const capability of capabilities)
      this.database
        .prepare(
          "INSERT INTO backoffice_grants(club_id,user_id,capability) VALUES(?,?,?)",
        )
        .run(clubId, userId, capability);
  }
  clubIds(): string[] {
    return this.database
      .prepare("SELECT id FROM clubs ORDER BY id")
      .all()
      .map((row) => String(row.id));
  }
  accounts(clubId: string) {
    return this.database
      .prepare(
        "SELECT u.id,u.display_name AS name,m.status FROM user_accounts u JOIN club_user_memberships m ON m.user_id=u.id WHERE m.club_id=? ORDER BY u.display_name",
      )
      .all(clubId)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        status: String(row.status),
      }));
  }
  list(resource: BackofficeResource, clubId: string): BackofficeRecord[] {
    const fields = resource.document
      ? "data_json"
      : resource.fields
          .filter((f) => !f.virtual || f.key === "balanceAfter")
          .map((f) => `${column(resource, f.key)} AS "${f.key}"`)
          .join(",");
    const rows = this.database
      .prepare(
        `SELECT id,created_at,updated_at,${fields} FROM ${resource.table} WHERE ${resource.scopeColumn ?? "club_id"}=? ORDER BY id`,
      )
      .all(clubId);
    return rows.map((row) => {
      const values: BackofficeValues = resource.document
        ? (JSON.parse(String(row.data_json)) as BackofficeValues)
        : {};
      if (!resource.document)
        for (const field of resource.fields.filter(
          (f) => !f.virtual || f.key === "balanceAfter",
        )) {
          const value = row[field.key];
          values[field.key] =
            value === null || value === undefined
              ? null
              : field.kind === "tags" || field.multiple
                ? (JSON.parse(String(value)) as string[])
                : field.kind === "boolean"
                  ? value === 1
                  : field.kind === "number"
                    ? Number(value)
                    : field.kind === "date"
                      ? String(value).slice(0, 10)
                      : String(value);
        }
      return {
        id: String(row.id),
        revision: digest({ id: row.id, updatedAt: row.updated_at, values }),
        values,
        updatedAt: String(row.updated_at),
      };
    });
  }
  save(
    resource: BackofficeResource,
    clubId: string,
    id: string,
    values: BackofficeValues,
    now: string,
    create: boolean,
    actor?: string,
  ): void {
    if (resource.document) {
      const sql = create
        ? `INSERT INTO ${resource.table}(id,club_id,data_json,created_at,updated_at) VALUES(?,?,?,?,?)`
        : `UPDATE ${resource.table} SET data_json=?,updated_at=? WHERE ${resource.scopeColumn ?? "club_id"}=? AND id=?`;
      this.database
        .prepare(sql)
        .run(
          ...(create
            ? [id, clubId, JSON.stringify(values), now, now]
            : [JSON.stringify(values), now, clubId, id]),
        );
      return;
    }
    const entries = resource.fields
      .filter((f) => !f.virtual)
      .map(
        (field) =>
          [
            column(resource, field.key),
            values[field.key] == null
              ? field.kind === "boolean"
                ? 0
                : null
              : field.kind === "tags" || field.multiple
                ? JSON.stringify(values[field.key])
                : field.kind === "boolean"
                  ? values[field.key]
                    ? 1
                    : 0
                  : values[field.key],
          ] as [string, SQLInputValue],
      );
    if (resource.key === "credits")
      entries.push(
        ["source", "manual_review"],
        ["actor_user_id", actor ?? null],
        ["balance_after", Number(values.balanceAfter)],
      );
    if (resource.key === "insurance")
      entries.push(
        ["approved", values.reviewStatus === "approved" ? 1 : 0],
        ["source", "manual_review"],
      );
    if (resource.key === "metrics" && create)
      entries.push(["catalog_scope", "club"], ["version", "1"]);
    if (resource.key === "events" && create)
      entries.push(["timezone", "Asia/Shanghai"]);
    if (create) {
      const names = [
        "id",
        resource.scopeColumn ?? "club_id",
        ...entries.map(([key]) => key),
        "created_at",
        "updated_at",
      ];
      this.database
        .prepare(
          `INSERT INTO ${resource.table}(${names.join(",")}) VALUES(${names.map(() => "?").join(",")})`,
        )
        .run(id, clubId, ...entries.map(([, value]) => value), now, now);
    } else
      this.database
        .prepare(
          `UPDATE ${resource.table} SET ${entries.map(([key]) => `${key}=?`).join(",")},updated_at=? WHERE ${resource.scopeColumn ?? "club_id"}=? AND id=?`,
        )
        .run(...entries.map(([, value]) => value), now, clubId, id);
  }
  audit(
    clubId: string,
    resource: string,
    id: string,
    actor: string,
    action: string,
    before: unknown,
    after: unknown,
    requestId: string,
    now = new Date().toISOString(),
  ) {
    this.database
      .prepare(
        "INSERT INTO backoffice_audit(club_id,resource,record_id,actor_user_id,occurred_at,action,before_json,after_json,request_id) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .run(
        clubId,
        resource,
        id,
        actor,
        now,
        action,
        before === undefined ? null : JSON.stringify(before),
        after === undefined ? null : JSON.stringify(after),
        requestId,
      );
  }
  history(clubId: string, resource: string, id: string) {
    return this.database
      .prepare(
        "SELECT a.id,u.display_name AS actor,a.occurred_at,a.action,a.before_json,a.after_json FROM backoffice_audit a JOIN user_accounts u ON u.id=a.actor_user_id WHERE a.club_id=? AND a.resource=? AND a.record_id=? ORDER BY a.id DESC LIMIT 100",
      )
      .all(clubId, resource, id)
      .map((row) => ({
        id: Number(row.id),
        actor: String(row.actor),
        occurredAt: String(row.occurred_at),
        action: String(row.action),
        before: row.before_json
          ? (JSON.parse(String(row.before_json)) as BackofficeValues)
          : null,
        after: row.after_json
          ? (JSON.parse(String(row.after_json)) as BackofficeValues)
          : null,
      }));
  }
  replay(
    clubId: string,
    actor: string,
    requestId: string,
    hash: string,
  ): unknown {
    const row = this.database
      .prepare(
        "SELECT request_hash,response_json FROM backoffice_mutations WHERE club_id=? AND actor_user_id=? AND request_id=?",
      )
      .get(clubId, actor, requestId);
    if (!row) return undefined;
    if (row.request_hash !== hash)
      throw new BackofficeFault(409, "request_reused");
    return JSON.parse(String(row.response_json));
  }
  remember(
    clubId: string,
    actor: string,
    requestId: string,
    hash: string,
    response: unknown,
  ) {
    this.database
      .prepare(
        "INSERT INTO backoffice_mutations(club_id,actor_user_id,request_id,request_hash,response_json) VALUES(?,?,?,?,?)",
      )
      .run(clubId, actor, requestId, hash, JSON.stringify(response));
  }
  enrollScout(clubId: string, id: string) {
    const row = this.database
      .prepare(
        "SELECT status FROM scout_profiles WHERE club_id=? AND student_id=?",
      )
      .get(clubId, id);
    if (!row) throw new BackofficeFault(404, "not_found");
    this.database
      .prepare(
        "UPDATE scout_profiles SET status='enrolled' WHERE club_id=? AND student_id=?",
      )
      .run(clubId, id);
    return row.status === "active";
  }
  newId(resource: string) {
    return `${resource}-${randomUUID()}`;
  }
  document(
    resourceKey: string,
    clubId: string,
    id: string,
    values: BackofficeValues,
    now: string,
  ): void {
    const resource = backofficeResources.find(
      (item) => item.key === resourceKey && item.document,
    );
    if (!resource) throw new Error("Unknown business catalog");
    if (
      !this.database
        .prepare(`SELECT id FROM ${resource.table} WHERE club_id=? AND id=?`)
        .get(clubId, id)
    )
      this.save(resource, clubId, id, values, now, true);
  }
}
