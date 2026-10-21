import { createHash, randomUUID } from "node:crypto";
import type { EntityId } from "@football-club/domain";
import type { AppRole } from "./app-roles.js";
import type { AppClientSessionRecord, AppClientSessionRepository } from "../persistence/app-client-session-repository.js";

export interface AppClientSessionInput {
  clubId: EntityId;
  appClientId: EntityId;
  userId: EntityId;
  membershipId: EntityId;
  activeRole: AppRole | null;
}

export interface AppClientSessionDelivery {
  token: string;
  expiresInSeconds: number;
  expiresAt: string;
  activeRole: AppRole | null;
}

export function hasBearerAuthorization(authorization: string | undefined): boolean {
  return /^Bearer(?:\s|$)/i.test(authorization?.trim() ?? "");
}

export function parseBearerToken(authorization: string | undefined): string | undefined {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization?.trim() ?? "");
  return match?.[1];
}

export class SessionRegistry {
  // 会话默认 30 天：俱乐部内部应用，家长/教练授权一次长期使用（原 7200s 导致每 2 小时强制重新授权）
  static readonly DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;
  private readonly preferences = new Map<string,{defaultRole:AppRole|null;lastActiveRole:AppRole|null}>();
  private readonly sessions = new Map<string, AppClientSessionRecord>();

  constructor(private readonly repository?: AppClientSessionRepository) {}

  async create(input: AppClientSessionInput, expiresInSeconds = SessionRegistry.DEFAULT_TTL_SECONDS): Promise<AppClientSessionDelivery> {
    const created = this.createRecord(input, expiresInSeconds);
    if (this.repository) {
      this.repository.create(created.record);
    } else {
      this.sessions.set(created.record.tokenHash, created.record);
    }
    if(input.activeRole)this.rememberRole(input,input.activeRole);
    return created.delivery;
  }

  async resolve(token: string | undefined): Promise<AppClientSessionRecord | null> {
    if (!token) return null;
    const tokenHash = hashToken(token);
    const session = this.repository
      ? this.repository.findByTokenHash(tokenHash)
      : this.sessions.get(tokenHash) ?? null;
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) {
      return null;
    }
    return session;
  }

  async revoke(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    const tokenHash = hashToken(token);
    const now = new Date().toISOString();
    if (this.repository) {
      return this.repository.revoke(tokenHash, now);
    }
    const existing = this.sessions.get(tokenHash);
    if (!existing || existing.revokedAt || Date.parse(existing.expiresAt) <= Date.parse(now)) {
      return false;
    }
    this.sessions.set(tokenHash, { ...existing, revokedAt: now, updatedAt: now });
    return true;
  }

  async rotate(token: string | undefined, input: AppClientSessionInput, expiresInSeconds = SessionRegistry.DEFAULT_TTL_SECONDS): Promise<AppClientSessionDelivery | null> {
    if (!token) return null;
    const now = new Date().toISOString();
    const replacement = this.createRecord(input, expiresInSeconds, now);
    const tokenHash = hashToken(token);

    if (this.repository) {
      if(!this.repository.rotate(tokenHash,replacement.record,now))return null;
      if(input.activeRole)this.rememberRole(input,input.activeRole);
      return replacement.delivery;
    }

    const existing = this.sessions.get(tokenHash);
    if (!existing || existing.revokedAt || Date.parse(existing.expiresAt) <= Date.parse(now)) {
      return null;
    }
    this.sessions.set(tokenHash, { ...existing, revokedAt: now, updatedAt: now });
    this.sessions.set(replacement.record.tokenHash, replacement.record);
    if(input.activeRole)this.rememberRole(input,input.activeRole);
    return replacement.delivery;
  }

  rolePreference(scope:Pick<AppClientSessionInput,"clubId"|"appClientId"|"userId">) {
    return this.repository?.rolePreference(scope) ?? this.preferences.get(JSON.stringify([scope.clubId,scope.appClientId,scope.userId])) ?? {defaultRole:null,lastActiveRole:null};
  }
  setDefaultRole(scope:Pick<AppClientSessionInput,"clubId"|"appClientId"|"userId">,role:AppRole|null) {
    if(this.repository)this.repository.saveRolePreference(scope,"default_role",role);
    else this.preferences.set(JSON.stringify([scope.clubId,scope.appClientId,scope.userId]),{...this.rolePreference(scope),defaultRole:role});
  }
  private rememberRole(scope:Pick<AppClientSessionInput,"clubId"|"appClientId"|"userId">,role:AppRole) {
    if(this.repository)this.repository.saveRolePreference(scope,"last_active_role",role);
    else this.preferences.set(JSON.stringify([scope.clubId,scope.appClientId,scope.userId]),{...this.rolePreference(scope),lastActiveRole:role});
  }

  private createRecord(input: AppClientSessionInput, expiresInSeconds: number, now = new Date().toISOString()) {
    const token = `wx-session-${randomUUID()}`;
    const record: AppClientSessionRecord = {
      id: `app-client-session-${randomUUID()}`,
      tokenHash: hashToken(token),
      clubId: input.clubId,
      appClientId: input.appClientId,
      userId: input.userId,
      membershipId: input.membershipId,
      activeRole: input.activeRole,
      expiresAt: new Date(Date.parse(now) + expiresInSeconds * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    return {
      record,
      delivery: {
        token,
        expiresInSeconds,
        expiresAt: record.expiresAt,
        activeRole: record.activeRole,
      } satisfies AppClientSessionDelivery,
    };
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
