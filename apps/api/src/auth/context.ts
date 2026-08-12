import type { ClubUserMembership, EntityId, UserAccount } from "@football-club/domain";
import type { FastifyRequest } from "fastify";
import type { ClubUserMembershipRepository, UserAccountRepository } from "../persistence/platform-repositories.js";
import type { AppClientSessionRecord } from "../persistence/app-client-session-repository.js";

export interface AuthContext {
  user: UserAccount;
  clubId: EntityId;
  membership: ClubUserMembership;
  appClientSession?: AppClientSessionRecord;
}

export interface MembershipResolver {
  resolve(request: FastifyRequest, clubId: EntityId): Promise<AuthContext | null>;
  resolveByUserId?(clubId: EntityId, userId: EntityId): Promise<AuthContext | null>;
  resolveByPhone?(clubId: EntityId, phone: string): Promise<AuthContext | null>;
}

export interface HeaderMembershipResolverOptions {
  allowHeaderIdentity?: boolean;
}

export class HeaderMembershipResolver implements MembershipResolver {
  private readonly allowHeaderIdentity: boolean;

  constructor(
    private readonly users: UserAccountRepository,
    private readonly memberships: ClubUserMembershipRepository,
    private readonly defaultUserId: string | null | undefined = process.env.API_DEFAULT_USER_ID ?? (process.env.NODE_ENV === "production" ? undefined : "user-coach-1"),
    options: HeaderMembershipResolverOptions = {},
  ) {
    this.allowHeaderIdentity = options.allowHeaderIdentity ?? process.env.NODE_ENV !== "production";
  }

  async resolve(request: FastifyRequest, clubId: EntityId): Promise<AuthContext | null> {
    if (!this.allowHeaderIdentity) return null;
    const userId = headerValue(request.headers["x-user-id"]) ?? this.defaultUserId;
    if (!userId) return null;
    const [user, membership] = await Promise.all([
      this.users.getById(userId),
      this.memberships.findActiveByClubAndUser(clubId, userId),
    ]);

    if (!user || user.status !== "active" || !membership) {
      return null;
    }

    return {
      user,
      clubId,
      membership,
    };
  }

  async resolveByPhone(clubId: EntityId, phone: string): Promise<AuthContext | null> {
    const users = await this.users.listByPhone(phone);
    const matches: AuthContext[] = [];
    for (const user of users) {
      if (user.status !== "active") continue;
      const membership = await this.memberships.findActiveByClubAndUser(clubId, user.id);
      if (membership) matches.push({ user, clubId, membership });
    }
    return matches.length === 1 ? matches[0]! : null;
  }

  async resolveByUserId(clubId: EntityId, userId: EntityId): Promise<AuthContext | null> {
    const user = await this.users.getById(userId);
    if (!user || user.status !== "active") return null;
    const membership = await this.memberships.findActiveByClubAndUser(clubId, user.id);
    return membership ? { user, clubId, membership } : null;
  }
}

/**
 * Production entrypoints must never accept a caller-supplied `X-User-Id` as
 * authentication. Keep that policy in one named factory so a later bootstrap
 * edit cannot silently turn the development resolver into production auth.
 */
export function createProductionMembershipResolver(
  users: UserAccountRepository,
  memberships: ClubUserMembershipRepository,
): HeaderMembershipResolver {
  return new HeaderMembershipResolver(users, memberships, undefined, {
    allowHeaderIdentity: false,
  });
}

/**
 * Select the bootstrap policy once. Production rejects the legacy debug
 * header; development/test servers retain their explicit header smoke path.
 */
export function createEntrypointMembershipResolver(
  users: UserAccountRepository,
  memberships: ClubUserMembershipRepository,
  environment: { NODE_ENV?: string } = process.env,
): HeaderMembershipResolver {
  if (environment.NODE_ENV === "development" || environment.NODE_ENV === "test") {
    return new HeaderMembershipResolver(users, memberships, undefined, {
      allowHeaderIdentity: true,
    });
  }
  return createProductionMembershipResolver(users, memberships);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
