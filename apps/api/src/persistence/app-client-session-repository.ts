import type { EntityId } from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";
import type { AppRole } from "../auth/app-roles.js";

type SqlRow = Record<string, unknown>;

export interface AppClientSessionRecord {
  id: string;
  tokenHash: string;
  clubId: EntityId;
  appClientId: EntityId;
  userId: EntityId;
  membershipId: EntityId;
  activeRole: AppRole | null;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class AppClientSessionRepository {
  constructor(private readonly database: DatabaseSync) {}

  findByTokenHash(tokenHash: string): AppClientSessionRecord | null {
    const row = this.database.prepare("SELECT * FROM app_client_sessions WHERE token_hash = ?").get(tokenHash) as SqlRow | undefined;
    return row ? mapSession(row) : null;
  }

  create(session: AppClientSessionRecord): void {
    this.insert(session);
  }

  rotate(tokenHash: string, replacement: AppClientSessionRecord, revokedAt: string): boolean {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      const result = this.database.prepare(`
        UPDATE app_client_sessions
        SET revoked_at = ?, updated_at = ?
        WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
      `).run(revokedAt, revokedAt, tokenHash, revokedAt);
      if (result.changes !== 1) {
        this.database.exec("ROLLBACK;");
        return false;
      }

      this.insert(replacement);
      this.database.exec("COMMIT;");
      return true;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  private insert(session: AppClientSessionRecord): void {
    this.database.prepare(`
      INSERT INTO app_client_sessions (
        id, token_hash, club_id, app_client_id, user_id, membership_id,
        active_role, expires_at, revoked_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.tokenHash,
      session.clubId,
      session.appClientId,
      session.userId,
      session.membershipId,
      session.activeRole,
      session.expiresAt,
      session.revokedAt ?? null,
      session.createdAt,
      session.updatedAt,
    );
  }
}

function mapSession(row: SqlRow): AppClientSessionRecord {
  const activeRole = row.active_role;
  if (activeRole !== null && activeRole !== "parent" && activeRole !== "coach") {
    throw new Error("Expected active_role to be parent, coach, or null.");
  }

  return {
    id: requireString(row, "id"),
    tokenHash: requireString(row, "token_hash"),
    clubId: requireString(row, "club_id"),
    appClientId: requireString(row, "app_client_id"),
    userId: requireString(row, "user_id"),
    membershipId: requireString(row, "membership_id"),
    activeRole,
    expiresAt: requireString(row, "expires_at"),
    revokedAt: optionalString(row, "revoked_at"),
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
