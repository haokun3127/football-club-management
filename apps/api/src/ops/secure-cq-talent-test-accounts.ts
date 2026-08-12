import type { DatabaseSync } from "node:sqlite";

const clubId = "club-chongqing-talent";
const appClientId = "app-client-cq-talent-wechat-main";
const roleJson = JSON.stringify(["parent", "coach"]);

export interface SecureCqTalentTestAccountInput {
  phones: readonly [string, string, string];
  dryRun?: boolean;
  now?: string;
}

export interface SecureCqTalentTestAccountManifestEntry {
  slot: number;
  userId: string;
  membershipId: string;
  parentId: string;
  coachId: string;
  teamId: string;
  studentIds: string[];
  guardianBindingIds: string[];
  contactIds: string[];
  teamMemberIds: string[];
  eventId: string;
  participantIds: string[];
}

export interface SecureCqTalentTestAccountSideEffects {
  appClientSessionIds?: string[];
  httpIdempotencyKeys?: string[];
  lessonLedgerIds?: string[];
  privateLessonRequestIds?: string[];
  eventChangeRequestIds?: string[];
  tacticalBoardIds?: string[];
  assessmentIds?: string[];
  assessmentRawResultIds?: string[];
  assessmentScoreIds?: string[];
  metricRecordIds?: string[];
  metricLineageIds?: string[];
  matchIds?: string[];
  matchEventIds?: string[];
}

export interface SecureCqTalentTestAccountManifest {
  version: 1;
  clubId: string;
  appClientId: string;
  accountIds: SecureCqTalentTestAccountManifestEntry[];
  sideEffects?: SecureCqTalentTestAccountSideEffects;
}

export type SecureCqTalentTestAccountResult =
  | { status: "dry_run"; manifest: SecureCqTalentTestAccountManifest }
  | { status: "imported"; manifest: SecureCqTalentTestAccountManifest }
  | { status: "already_present"; manifest: SecureCqTalentTestAccountManifest };

export function readSecureCqTalentTestAccountPhones(
  environment: Record<string, string | undefined>,
): [string, string, string] {
  const phones = [
    environment.SECURE_CQ_TALENT_TEST_PHONE_1,
    environment.SECURE_CQ_TALENT_TEST_PHONE_2,
    environment.SECURE_CQ_TALENT_TEST_PHONE_3,
  ];
  validatePhones(phones);
  return phones as [string, string, string];
}

export function importSecureCqTalentTestAccounts(
  database: DatabaseSync,
  input: SecureCqTalentTestAccountInput,
): SecureCqTalentTestAccountResult {
  validatePhones(input.phones);
  const manifest = buildManifest();
  const now = input.now ?? new Date().toISOString();

  if (input.dryRun) {
    validateTarget(database, input.phones, manifest);
    const existing = readExistingManifest(database, input.phones, manifest);
    return existing ? { status: "already_present", manifest: existing } : { status: "dry_run", manifest };
  }

  validateTarget(database, input.phones, manifest);
  readExistingManifest(database, input.phones, manifest);
  database.exec("BEGIN IMMEDIATE;");
  try {
    validateTarget(database, input.phones, manifest);
    const existing = readExistingManifest(database, input.phones, manifest);
    if (existing) {
      database.exec("COMMIT;");
      return { status: "already_present", manifest: existing };
    }
    input.phones.forEach((phone, index) => insertAccount(database, manifest.accountIds[index]!, phone, now));
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
  return { status: "imported", manifest };
}

export function assertCompleteSecureCqTalentTestAccountInstallation(
  database: DatabaseSync,
  manifest: SecureCqTalentTestAccountManifest,
): void {
  if (!hasCompleteInstallation(database, manifest)) {
    throw new Error("Incomplete secure test-account installation; refusing rollback.");
  }
}

function validatePhones(phones: readonly (string | undefined)[]): void {
  if (
    phones.length !== 3
    || phones.some((phone) => typeof phone !== "string" || !/^\d{6,20}$/.test(phone))
    || new Set(phones).size !== 3
  ) {
    throw new Error("Exactly three unique runtime phone values are required.");
  }
}

function buildManifest(): SecureCqTalentTestAccountManifest {
  return {
    version: 1,
    clubId,
    appClientId,
    accountIds: [1, 2, 3].map((slot) => ({
      slot,
      userId: "user-cq-talent-secure-test-" + slot,
      membershipId: "membership-cq-talent-secure-test-" + slot,
      parentId: "parent-cq-talent-secure-test-" + slot,
      coachId: "coach-cq-talent-secure-test-" + slot,
      teamId: "team-cq-talent-secure-test-" + slot,
      studentIds: [1, 2].map((child) => "student-cq-talent-secure-test-" + slot + "-" + child),
      guardianBindingIds: [1, 2].map((child) => "guardian-cq-talent-secure-test-" + slot + "-" + child),
      contactIds: [1, 2].map((child) => "contact-cq-talent-secure-test-" + slot + "-" + child),
      teamMemberIds: [1, 2].map((child) => "team-member-cq-talent-secure-test-" + slot + "-" + child),
      eventId: "event-cq-talent-secure-test-" + slot,
      participantIds: [1, 2].map((child) => "participant-cq-talent-secure-test-" + slot + "-" + child),
    })),
    sideEffects: {},
  };
}

function validateTarget(
  database: DatabaseSync,
  phones: readonly string[],
  manifest: SecureCqTalentTestAccountManifest,
): void {
  if (
    !database.prepare("SELECT id FROM clubs WHERE id = ?").get(clubId)
    || !database.prepare("SELECT id FROM club_app_clients WHERE id = ? AND club_id = ?").get(appClientId, clubId)
  ) {
    throw new Error("Secure test-account import requires the target club and app client.");
  }

  manifest.accountIds.forEach((account, index) => {
    const user = database.prepare(
      "SELECT phone, roles_json, status FROM user_accounts WHERE id = ?",
    ).get(account.userId) as Row | undefined;
    if (user && (user.phone !== phones[index] || user.roles_json !== roleJson || user.status !== "active")) {
      throw new Error("Fixed identity id " + account.userId + " is already owned by an incompatible row.");
    }
    const phoneOwner = database.prepare(
      "SELECT id FROM user_accounts WHERE phone = ? AND id <> ?",
    ).get(phones[index]!, account.userId);
    if (phoneOwner) throw new Error("A runtime phone is already owned by another user account.");

    const fixedRows = [
      ["club_user_memberships", account.membershipId, "user_id", account.userId],
      ["parent_profiles", account.parentId, "user_id", account.userId],
      ["coach_profiles", account.coachId, "user_id", account.userId],
      ["teams", account.teamId, "default_coach_id", account.coachId],
      ["calendar_events", account.eventId, "owner_coach_id", account.coachId],
    ] as const;
    for (const [table, id, ownerColumn, ownerId] of fixedRows) {
      const row = database.prepare(
        "SELECT " + ownerColumn + " FROM " + table + " WHERE id = ? AND club_id = ?",
      ).get(id, clubId) as Row | undefined;
      if (row && row[ownerColumn] !== ownerId) {
        throw new Error("Fixed identity row " + id + " is already owned by an incompatible row.");
      }
    }
  });
}

function readExistingManifest(
  database: DatabaseSync,
  phones: readonly string[],
  manifest: SecureCqTalentTestAccountManifest,
): SecureCqTalentTestAccountManifest | null {
  const users = manifest.accountIds.map((account) =>
    database.prepare("SELECT phone FROM user_accounts WHERE id = ?").get(account.userId) as Row | undefined);
  if (users.every((user, index) => user?.phone === phones[index])) {
    if (hasCompleteInstallation(database, manifest)) return manifest;
    throw new Error("Secure test-account import found a partial existing installation.");
  }
  if (users.some(Boolean)) throw new Error("Secure test-account import found a partial existing installation.");
  return null;
}

function hasCompleteInstallation(
  database: DatabaseSync,
  manifest: SecureCqTalentTestAccountManifest,
): boolean {
  return manifest.accountIds.every((account) =>
    hasRows(database, "club_user_memberships", [account.membershipId])
    && hasRows(database, "parent_profiles", [account.parentId])
    && hasRows(database, "coach_profiles", [account.coachId])
    && hasRows(database, "teams", [account.teamId])
    && hasRows(database, "calendar_events", [account.eventId])
    && hasRows(database, "student_profiles", account.studentIds)
    && hasRows(database, "student_guardian_bindings", account.guardianBindingIds)
    && hasRows(database, "student_contacts", account.contactIds)
    && hasRows(database, "team_members", account.teamMemberIds)
    && hasRows(database, "event_participants", account.participantIds),
  ) && manifest.accountIds.every((account) => hasExpectedOwnership(database, account));
}

function hasRows(database: DatabaseSync, table: string, ids: readonly string[]): boolean {
  const placeholders = ids.map(() => "?").join(", ");
  const row = database.prepare(
    "SELECT COUNT(*) AS count FROM " + table + " WHERE club_id = ? AND id IN (" + placeholders + ")",
  ).get(clubId, ...ids) as { count: number };
  return row.count === ids.length;
}

function hasExpectedOwnership(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
): boolean {
  const hasRow = (sql: string, ...values: string[]) => Boolean(database.prepare(sql).get(...values));
  if (!hasRow(
    "SELECT id FROM club_user_memberships WHERE id = ? AND club_id = ? AND user_id = ? AND roles_json = ? AND status = 'active'",
    account.membershipId,
    clubId,
    account.userId,
    roleJson,
  ) || !hasRow(
    "SELECT id FROM parent_profiles WHERE id = ? AND club_id = ? AND user_id = ?",
    account.parentId,
    clubId,
    account.userId,
  ) || !hasRow(
    "SELECT id FROM coach_profiles WHERE id = ? AND club_id = ? AND user_id = ? AND status = 'active'",
    account.coachId,
    clubId,
    account.userId,
  ) || !hasRow(
    "SELECT id FROM teams WHERE id = ? AND club_id = ? AND default_coach_id = ?",
    account.teamId,
    clubId,
    account.coachId,
  ) || !hasRow(
    "SELECT id FROM calendar_events WHERE id = ? AND club_id = ? AND primary_team_id = ? AND owner_coach_id = ?",
    account.eventId,
    clubId,
    account.teamId,
    account.coachId,
  )) {
    return false;
  }

  return account.studentIds.every((studentId, index) =>
    hasRow(
      "SELECT id FROM student_profiles WHERE id = ? AND club_id = ?",
      studentId,
      clubId,
    ) && hasRow(
      "SELECT id FROM student_guardian_bindings WHERE id = ? AND club_id = ? AND student_id = ? AND parent_id = ?",
      account.guardianBindingIds[index]!,
      clubId,
      studentId,
      account.parentId,
    ) && hasRow(
      "SELECT id FROM student_contacts WHERE id = ? AND club_id = ? AND student_id = ?",
      account.contactIds[index]!,
      clubId,
      studentId,
    ) && hasRow(
      "SELECT id FROM team_members WHERE id = ? AND club_id = ? AND team_id = ? AND student_id = ?",
      account.teamMemberIds[index]!,
      clubId,
      account.teamId,
      studentId,
    ) && hasRow(
      "SELECT id FROM event_participants WHERE id = ? AND club_id = ? AND event_id = ? AND student_id = ?",
      account.participantIds[index]!,
      clubId,
      account.eventId,
      studentId,
    ),
  );
}

function insertAccount(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
  phone: string,
  now: string,
): void {
  database.prepare(
    "INSERT INTO user_accounts (id, display_name, phone, roles_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
  ).run(account.userId, "Secure test account " + account.slot, phone, roleJson, now, now);
  database.prepare(
    "INSERT INTO club_user_memberships (id, club_id, user_id, roles_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
  ).run(account.membershipId, clubId, account.userId, roleJson, now, now);
  database.prepare(
    "INSERT INTO parent_profiles (id, club_id, user_id, name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(account.parentId, clubId, account.userId, "Secure parent " + account.slot, phone, now, now);
  database.prepare(
    "INSERT INTO coach_profiles (id, club_id, user_id, name, specialties_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
  ).run(account.coachId, clubId, account.userId, "Secure coach " + account.slot, JSON.stringify(["U10", "technical"]), now, now);
  database.prepare(
    "INSERT INTO teams (id, club_id, name, age_group, level, default_coach_id, status, created_at, updated_at) VALUES (?, ?, ?, 'U10', 'development', ?, 'active', ?, ?)",
  ).run(account.teamId, clubId, "Secure test team " + account.slot, account.coachId, now, now);
  database.prepare(
    "INSERT INTO calendar_events (id, club_id, type, title, starts_at, ends_at, timezone, primary_team_id, owner_coach_id, status, created_at, updated_at) VALUES (?, ?, 'training', ?, '2026-08-12T10:00:00.000Z', '2026-08-12T11:00:00.000Z', 'Asia/Shanghai', ?, ?, 'scheduled', ?, ?)",
  ).run(account.eventId, clubId, "Secure test training " + account.slot, account.teamId, account.coachId, now, now);

  account.studentIds.forEach((studentId, index) => {
    database.prepare(
      "INSERT INTO student_profiles (id, club_id, name, birth_date, gender, dominant_foot, current_level, created_at, updated_at) VALUES (?, ?, ?, '2015-01-01', 'unspecified', 'right', 'U10 development', ?, ?)",
    ).run(studentId, clubId, "Secure player " + account.slot + "-" + (index + 1), now, now);
    database.prepare(
      "INSERT INTO student_guardian_bindings (id, club_id, student_id, parent_id, relationship, is_primary_contact, created_at, updated_at) VALUES (?, ?, ?, ?, 'guardian', 1, ?, ?)",
    ).run(account.guardianBindingIds[index]!, clubId, studentId, account.parentId, now, now);
    database.prepare(
      "INSERT INTO student_contacts (id, club_id, student_id, name, relationship, phone, is_primary_contact, receives_notifications, created_at, updated_at) VALUES (?, ?, ?, ?, 'guardian', ?, 1, 1, ?, ?)",
    ).run(account.contactIds[index]!, clubId, studentId, "Secure parent " + account.slot, phone, now, now);
    database.prepare(
      "INSERT INTO team_members (id, club_id, team_id, student_id, starts_at, is_primary_team, status, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-08-01', 1, 'active', ?, ?)",
    ).run(account.teamMemberIds[index]!, clubId, account.teamId, studentId, now, now);
    database.prepare(
      "INSERT INTO event_participants (id, club_id, event_id, student_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'confirmed', ?, ?)",
    ).run(account.participantIds[index]!, clubId, account.eventId, studentId, now, now);
  });
}

type Row = Record<string, string | null>;
