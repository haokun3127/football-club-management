import type {
  Club,
  ClubScoped,
  ClubScopedRepository,
  ClubUserMembership,
  CoachProfile,
  EntityId,
  ParentProfile,
  StudentGuardianBinding,
  StudentProfile,
  Team,
  TeamMember,
  UserAccount,
} from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";

type SqlRow = Record<string, unknown>;

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

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error("Expected JSON string array.");
  }

  return parsed;
}

function booleanFromSql(value: unknown): boolean {
  return value === 1 || value === true;
}

export interface ClubScopedReader<TEntity extends ClubScoped> extends ClubScopedRepository<TEntity> {
  getByClubAndId(clubId: EntityId, id: EntityId): Promise<TEntity | null>;
}

export class ClubRepository {
  constructor(private readonly database: DatabaseSync) {}

  async getById(id: EntityId): Promise<Club | null> {
    const row = this.database.prepare("SELECT * FROM clubs WHERE id = ?").get(id) as SqlRow | undefined;

    return row ? mapClub(row) : null;
  }

  async list(): Promise<Club[]> {
    const rows = this.database.prepare("SELECT * FROM clubs ORDER BY name").all() as SqlRow[];

    return rows.map(mapClub);
  }

  async save(entity: Club): Promise<void> {
    this.database.prepare(`
      INSERT INTO clubs (id, name, code, timezone, locale, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        code = excluded.code,
        timezone = excluded.timezone,
        locale = excluded.locale,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.name,
      entity.code,
      entity.timezone,
      entity.locale,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

export class UserAccountRepository {
  constructor(private readonly database: DatabaseSync) {}

  listAll(): UserAccount[] {
    const rows = this.database.prepare("SELECT * FROM user_accounts ORDER BY id").all() as SqlRow[];
    return rows.map(mapUserAccount);
  }

  async getById(id: EntityId): Promise<UserAccount | null> {
    const row = this.database.prepare("SELECT * FROM user_accounts WHERE id = ?").get(id) as SqlRow | undefined;

    return row ? mapUserAccount(row) : null;
  }

  async getByPhone(phone: string): Promise<UserAccount | null> {
    const row = this.database.prepare("SELECT * FROM user_accounts WHERE phone = ?").get(phone) as SqlRow | undefined;
    return row ? mapUserAccount(row) : null;
  }

  async listByPhone(phone: string): Promise<UserAccount[]> {
    const rows = this.database.prepare("SELECT * FROM user_accounts WHERE phone = ? ORDER BY id").all(phone) as SqlRow[];
    return rows.map(mapUserAccount);
  }

  async save(entity: UserAccount): Promise<void> {
    this.database.prepare(`
      INSERT INTO user_accounts (id, display_name, phone, roles_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        phone = excluded.phone,
        roles_json = excluded.roles_json,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.displayName,
      entity.phone ?? null,
      JSON.stringify(entity.roles),
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

abstract class BaseClubScopedRepository<TEntity extends ClubScoped> implements ClubScopedReader<TEntity> {
  protected abstract readonly tableName: string;

  constructor(protected readonly database: DatabaseSync) {}

  listByClubSync(clubId: EntityId): TEntity[] {
    const rows = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE club_id = ? ORDER BY id`).all(clubId) as SqlRow[];
    return rows.map((row) => this.map(row));
  }

  async getById(): Promise<TEntity | null> {
    throw new Error("Club-scoped repositories require getByClubAndId(clubId, id).");
  }

  async getByClubAndId(clubId: EntityId, id: EntityId): Promise<TEntity | null> {
    const row = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE club_id = ? AND id = ?`).get(
      clubId,
      id,
    ) as SqlRow | undefined;

    return row ? this.map(row) : null;
  }

  async listByClub(clubId: EntityId): Promise<TEntity[]> {
    const rows = this.database.prepare(`SELECT * FROM ${this.tableName} WHERE club_id = ? ORDER BY id`).all(
      clubId,
    ) as SqlRow[];

    return rows.map((row) => this.map(row));
  }

  abstract save(entity: TEntity): Promise<void>;

  protected abstract map(row: SqlRow): TEntity;
}

export class ClubUserMembershipRepository extends BaseClubScopedRepository<ClubUserMembership> {
  protected readonly tableName = "club_user_memberships";

  async findActiveByClubAndUser(clubId: EntityId, userId: EntityId): Promise<ClubUserMembership | null> {
    const row = this.database.prepare(`
      SELECT * FROM club_user_memberships
      WHERE club_id = ? AND user_id = ? AND status = 'active'
    `).get(clubId, userId) as SqlRow | undefined;

    return row ? this.map(row) : null;
  }

  async save(entity: ClubUserMembership): Promise<void> {
    this.database.prepare(`
      INSERT INTO club_user_memberships (id, club_id, user_id, roles_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        user_id = excluded.user_id,
        roles_json = excluded.roles_json,
        status = excluded.status,
        updated_at = excluded.updated_at
      ON CONFLICT(club_id, user_id) DO UPDATE SET
        roles_json = excluded.roles_json,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.userId,
      JSON.stringify(entity.roles),
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  protected map(row: SqlRow): ClubUserMembership {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      userId: requireString(row, "user_id"),
      roles: parseStringArray(requireString(row, "roles_json")) as ClubUserMembership["roles"],
      status: requireString(row, "status") as ClubUserMembership["status"],
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

export class ParentProfileRepository extends BaseClubScopedRepository<ParentProfile> {
  protected readonly tableName = "parent_profiles";

  async save(entity: ParentProfile): Promise<void> {
    this.database.prepare(`
      INSERT INTO parent_profiles (id, club_id, user_id, name, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        user_id = excluded.user_id,
        name = excluded.name,
        phone = excluded.phone,
        updated_at = excluded.updated_at
    `).run(entity.id, entity.clubId, entity.userId, entity.name, entity.phone, entity.createdAt, entity.updatedAt);
  }

  protected map(row: SqlRow): ParentProfile {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      userId: requireString(row, "user_id"),
      name: requireString(row, "name"),
      phone: requireString(row, "phone"),
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

export class StudentGuardianBindingRepository extends BaseClubScopedRepository<StudentGuardianBinding> {
  protected readonly tableName = "student_guardian_bindings";

  async save(entity: StudentGuardianBinding): Promise<void> {
    this.database.prepare(`
      INSERT INTO student_guardian_bindings (
        id, club_id, student_id, parent_id, relationship, is_primary_contact, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        student_id = excluded.student_id,
        parent_id = excluded.parent_id,
        relationship = excluded.relationship,
        is_primary_contact = excluded.is_primary_contact,
        updated_at = excluded.updated_at
      ON CONFLICT(club_id, parent_id, student_id) DO UPDATE SET
        relationship = excluded.relationship,
        is_primary_contact = excluded.is_primary_contact,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.studentId,
      entity.parentId,
      entity.relationship,
      entity.isPrimaryContact ? 1 : 0,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  protected map(row: SqlRow): StudentGuardianBinding {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      studentId: requireString(row, "student_id"),
      parentId: requireString(row, "parent_id"),
      relationship: requireString(row, "relationship") as StudentGuardianBinding["relationship"],
      isPrimaryContact: booleanFromSql(row.is_primary_contact),
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

export class StudentProfileRepository extends BaseClubScopedRepository<StudentProfile> {
  protected readonly tableName = "student_profiles";

  async save(entity: StudentProfile): Promise<void> {
    this.database.prepare(`
      INSERT INTO student_profiles (
        id, club_id, name, birth_date, gender, dominant_foot, current_level, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        name = excluded.name,
        birth_date = excluded.birth_date,
        gender = excluded.gender,
        dominant_foot = excluded.dominant_foot,
        current_level = excluded.current_level,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.name,
      entity.birthDate,
      entity.gender ?? null,
      entity.dominantFoot ?? null,
      entity.currentLevel ?? null,
      entity.notes ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  protected map(row: SqlRow): StudentProfile {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      name: requireString(row, "name"),
      birthDate: requireString(row, "birth_date"),
      gender: optionalString(row, "gender") as StudentProfile["gender"],
      dominantFoot: optionalString(row, "dominant_foot") as StudentProfile["dominantFoot"],
      currentLevel: optionalString(row, "current_level"),
      notes: optionalString(row, "notes"),
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

export class CoachProfileRepository extends BaseClubScopedRepository<CoachProfile> {
  protected readonly tableName = "coach_profiles";

  async save(entity: CoachProfile): Promise<void> {
    this.database.prepare(`
      INSERT INTO coach_profiles (id, club_id, user_id, name, specialties_json, status, accepts_private_lessons, availability_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        user_id = excluded.user_id,
        name = excluded.name,
        specialties_json = excluded.specialties_json,
        status = excluded.status,
        accepts_private_lessons = excluded.accepts_private_lessons,
        availability_json = excluded.availability_json,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.userId,
      entity.name,
      JSON.stringify(entity.specialties),
      entity.status,
      entity.acceptsPrivateLessons === undefined ? 1 : entity.acceptsPrivateLessons ? 1 : 0,
      entity.availabilitySlots === undefined ? null : JSON.stringify(entity.availabilitySlots),
      entity.createdAt,
      entity.updatedAt,
    );
  }

  protected map(row: SqlRow): CoachProfile {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      userId: requireString(row, "user_id"),
      name: requireString(row, "name"),
      specialties: parseStringArray(requireString(row, "specialties_json")),
      status: requireString(row, "status") as CoachProfile["status"],
      acceptsPrivateLessons: row.accepts_private_lessons === undefined || row.accepts_private_lessons === null ? undefined : Number(row.accepts_private_lessons) !== 0,
      availabilitySlots: typeof row.availability_json === "string" ? parseStringArray(row.availability_json) : undefined,
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

export class TeamRepository extends BaseClubScopedRepository<Team> {
  protected readonly tableName = "teams";

  async save(entity: Team): Promise<void> {
    this.database.prepare(`
      INSERT INTO teams (
        id, club_id, name, age_group, level, default_coach_id, default_location_id, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        name = excluded.name,
        age_group = excluded.age_group,
        level = excluded.level,
        default_coach_id = excluded.default_coach_id,
        default_location_id = excluded.default_location_id,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.name,
      entity.ageGroup,
      entity.level,
      entity.defaultCoachId ?? null,
      entity.defaultLocationId ?? null,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  protected map(row: SqlRow): Team {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      name: requireString(row, "name"),
      ageGroup: requireString(row, "age_group"),
      level: requireString(row, "level") as Team["level"],
      defaultCoachId: optionalString(row, "default_coach_id"),
      defaultLocationId: optionalString(row, "default_location_id"),
      status: requireString(row, "status") as Team["status"],
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

export class TeamMemberRepository extends BaseClubScopedRepository<TeamMember> {
  protected readonly tableName = "team_members";

  async save(entity: TeamMember): Promise<void> {
    this.database.prepare(`
      INSERT INTO team_members (
        id, club_id, team_id, student_id, starts_at, ends_at, is_primary_team, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        club_id = excluded.club_id,
        team_id = excluded.team_id,
        student_id = excluded.student_id,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        is_primary_team = excluded.is_primary_team,
        status = excluded.status,
        updated_at = excluded.updated_at
      ON CONFLICT(club_id, team_id, student_id, starts_at) DO UPDATE SET
        ends_at = excluded.ends_at,
        is_primary_team = excluded.is_primary_team,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.teamId,
      entity.studentId,
      entity.startsAt,
      entity.endsAt ?? null,
      entity.isPrimaryTeam ? 1 : 0,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  protected map(row: SqlRow): TeamMember {
    return {
      id: requireString(row, "id"),
      clubId: requireString(row, "club_id"),
      teamId: requireString(row, "team_id"),
      studentId: requireString(row, "student_id"),
      startsAt: requireString(row, "starts_at"),
      endsAt: optionalString(row, "ends_at"),
      isPrimaryTeam: booleanFromSql(row.is_primary_team),
      status: requireString(row, "status") as TeamMember["status"],
      createdAt: requireString(row, "created_at"),
      updatedAt: requireString(row, "updated_at"),
    };
  }
}

function mapClub(row: SqlRow): Club {
  return {
    id: requireString(row, "id"),
    name: requireString(row, "name"),
    code: requireString(row, "code"),
    timezone: requireString(row, "timezone"),
    locale: requireString(row, "locale"),
    status: requireString(row, "status") as Club["status"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapUserAccount(row: SqlRow): UserAccount {
  return {
    id: requireString(row, "id"),
    displayName: requireString(row, "display_name"),
    phone: optionalString(row, "phone"),
    roles: parseStringArray(requireString(row, "roles_json")) as UserAccount["roles"],
    status: requireString(row, "status") as UserAccount["status"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}
