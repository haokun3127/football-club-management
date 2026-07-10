import type { ClubUserMembership, EntityId, UserAccount } from "@football-club/domain";
import type { FastifyRequest } from "fastify";
import type { ClubUserMembershipRepository, UserAccountRepository } from "../persistence/platform-repositories.js";

export interface AuthContext {
  user: UserAccount;
  clubId: EntityId;
  membership: ClubUserMembership;
}

export interface MembershipResolver {
  resolve(request: FastifyRequest, clubId: EntityId): Promise<AuthContext | null>;
  resolveByPhone?(clubId: EntityId, phone: string): Promise<AuthContext | null>;
}

export class HeaderMembershipResolver implements MembershipResolver {
  constructor(
    private readonly users: UserAccountRepository,
    private readonly memberships: ClubUserMembershipRepository,
    private readonly defaultUserId: string | null | undefined = process.env.API_DEFAULT_USER_ID ?? (process.env.NODE_ENV === "production" ? undefined : "user-coach-1"),
  ) {}

  async resolve(request: FastifyRequest, clubId: EntityId): Promise<AuthContext | null> {
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
    const user = await this.users.getByPhone(phone);
    if (!user || user.status !== "active") return null;
    const membership = await this.memberships.findActiveByClubAndUser(clubId, user.id);
    return membership ? { user, clubId, membership } : null;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
