import type { DatabaseSync } from "node:sqlite";
import { transaction } from "./transaction.js";

export interface BackofficeCredential { clubId: string; username: string; userId: string; passwordHash: string; }
export interface BackofficeSession { tokenHash: string; clubId: string; userId: string; membershipId: string; expiresAt: string; }

export class BackofficeAuthRepository {
  constructor(private readonly database: DatabaseSync) {}

  credential(clubId: string, username: string): BackofficeCredential | null {
    const row = this.database.prepare("SELECT user_id, password_hash FROM backoffice_credentials WHERE club_id=? AND username=?").get(clubId, username);
    return row ? { clubId, username, userId: String(row.user_id), passwordHash: String(row.password_hash) } : null;
  }

  async provision(credential: BackofficeCredential): Promise<void> {
    await transaction(this.database, async () => {
      const now = new Date().toISOString();
      const existing = this.credential(credential.clubId, credential.username);
      if (existing && existing.userId !== credential.userId) throw new Error("Account already belongs to another user");
      this.database.prepare(`INSERT INTO backoffice_credentials (club_id,username,user_id,password_hash,updated_at) VALUES (?,?,?,?,?)
        ON CONFLICT(club_id,username) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at`)
        .run(credential.clubId, credential.username, credential.userId, credential.passwordHash, now);
      this.database.prepare("UPDATE backoffice_sessions SET revoked_at=? WHERE club_id=? AND user_id=? AND revoked_at IS NULL")
        .run(now, credential.clubId, credential.userId);
    });
  }

  /** Reserve an attempt before password work. Both limits persist across restarts. */
  async reserveAttempt(buckets: Array<{ key: string; limit: number }>, now: Date): Promise<boolean> {
    return transaction(this.database, async () => {
      const instant = now.toISOString();
      this.database.prepare("DELETE FROM backoffice_login_attempts WHERE expires_at<=?").run(instant);
      if (buckets.some(b => Number(this.database.prepare("SELECT attempts FROM backoffice_login_attempts WHERE bucket=?").get(b.key)?.attempts ?? 0) >= b.limit)) return false;
      for (const bucket of buckets) this.database.prepare(`INSERT INTO backoffice_login_attempts (bucket,attempts,expires_at) VALUES (?,1,?)
        ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1`).run(bucket.key, new Date(now.getTime() + 15 * 60_000).toISOString());
      return true;
    });
  }

  async createSession(credential: BackofficeCredential, session: BackofficeSession, now: string): Promise<boolean> {
    return transaction(this.database, async () => {
      // A password rotation during scrypt must not mint a session from the old password.
      if (this.credential(credential.clubId, credential.username)?.passwordHash !== credential.passwordHash) return false;
      this.database.prepare("DELETE FROM backoffice_sessions WHERE expires_at<=?").run(now);
      this.database.prepare(`INSERT INTO backoffice_sessions (token_hash,club_id,username,user_id,membership_id,created_at,expires_at)
        VALUES (?,?,?,?,?,?,?)`).run(session.tokenHash, session.clubId, credential.username, session.userId, session.membershipId, now, session.expiresAt);
      return true;
    });
  }

  session(tokenHash: string, now: string): BackofficeSession | null {
    const row = this.database.prepare("SELECT * FROM backoffice_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?").get(tokenHash, now);
    return row ? { tokenHash, clubId: String(row.club_id), userId: String(row.user_id), membershipId: String(row.membership_id), expiresAt: String(row.expires_at) } : null;
  }

  async revoke(tokenHash: string, now: string): Promise<void> {
    await transaction(this.database, async () => { this.database.prepare("UPDATE backoffice_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").run(now, tokenHash); });
  }
}
