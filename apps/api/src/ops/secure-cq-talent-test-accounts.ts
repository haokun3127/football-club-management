import type { DatabaseSync } from "node:sqlite";

const clubId = "club-chongqing-talent";
const appClientId = "app-client-cq-talent-wechat-main";
const roleJson = JSON.stringify(["parent", "coach"]);
const completedTrainingEventKeys = [
  "history-training",
  "history-training-2",
  "history-training-3",
  "history-training-4",
  "history-training-5",
] as const;
const completedMatchEventDetails = [
  { type: "goal", note: "禁区前沿接球后低射破门" },
  { type: "assist", note: "右路突破后倒三角传中助攻" },
  { type: "foul", note: "中场回追时拉人犯规" },
  { type: "yellow_card", note: "战术犯规，裁判出示黄牌" },
  { type: "own_goal", note: "回传解围失误造成乌龙" },
  { type: "save", note: "近距离封堵对方射门" },
  { type: "tackle", note: "中场预判成功完成抢断" },
  { type: "goal", note: "反击中接直塞推射得分" },
] as const;
const demoTeamRosterSize = 19;
const demoStartingLineupSize = 11;
const demoMatchPositions = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "FW", "FW", "FW"] as const;
const demoTacticalPositions = [
  ["守门员", 0.5, 0.1], ["左后卫", 0.18, 0.28], ["左中卫", 0.4, 0.25], ["右中卫", 0.6, 0.25], ["右后卫", 0.82, 0.28],
  ["左中场", 0.27, 0.52], ["中场", 0.5, 0.48], ["右中场", 0.73, 0.52],
  ["左边锋", 0.2, 0.76], ["前锋", 0.5, 0.82], ["右边锋", 0.8, 0.76],
] as const;
type DemoEventKey = (typeof completedTrainingEventKeys)[number] | "future-training" | "completed-match" | "scheduled-match";

export interface SecureCqTalentTestAccountInput {
  phones: readonly string[];
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
  matchRosterIds?: string[];
}

export interface SecureCqTalentTestAccountManifest {
  version: 2;
  clubId: string;
  appClientId: string;
  accountIds: SecureCqTalentTestAccountManifestEntry[];
  sideEffects?: SecureCqTalentTestAccountSideEffects;
}

export type SecureCqTalentTestAccountResult =
  | { status: "dry_run"; manifest: SecureCqTalentTestAccountManifest }
  | { status: "imported"; manifest: SecureCqTalentTestAccountManifest }
  | { status: "refreshed"; manifest: SecureCqTalentTestAccountManifest }
  | { status: "already_present"; manifest: SecureCqTalentTestAccountManifest };

export function readSecureCqTalentTestAccountPhones(
  environment: Record<string, string | undefined>,
): string[] {
  const phones = Array.from({ length: 7 }, (_, index) =>
    environment[`SECURE_CQ_TALENT_TEST_PHONE_${index + 1}`],
  );
  validatePhones(phones);
  return phones as string[];
}

export function importSecureCqTalentTestAccounts(
  database: DatabaseSync,
  input: SecureCqTalentTestAccountInput,
): SecureCqTalentTestAccountResult {
  validatePhones(input.phones);
  const manifest = createSecureCqTalentTestAccountManifest();
  const now = input.now ?? new Date().toISOString();

  if (input.dryRun) {
    validateTarget(database, input.phones, manifest);
    const existing = readExistingManifest(database, input.phones, manifest);
    return existing && hasCurrentDemoData(database, existing, now)
      ? { status: "already_present", manifest: existing }
      : { status: "dry_run", manifest };
  }

  validateTarget(database, input.phones, manifest);
  const existing = readExistingManifest(database, input.phones, manifest);
  const wasComplete = existing !== null && hasCompleteDemoData(database, existing);
  const alreadyCurrent = wasComplete && existing !== null && hasCurrentDemoData(database, existing, now);
  if (alreadyCurrent) {
    return { status: "already_present", manifest: existing };
  }
  database.exec("BEGIN IMMEDIATE;");
  try {
    validateTarget(database, input.phones, manifest);
    input.phones.forEach((phone, index) => {
      const account = manifest.accountIds[index]!;
      if (!database.prepare("SELECT id FROM user_accounts WHERE id = ?").get(account.userId)) {
        insertAccount(database, account, phone, now);
      }
      ensureDemoData(database, account, now);
    });
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
  return { status: wasComplete ? "refreshed" : "imported", manifest };
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
    phones.length !== 7
    || phones.some((phone) => typeof phone !== "string" || !/^\d{6,20}$/.test(phone))
    || new Set(phones).size !== 7
  ) {
    throw new Error("Exactly seven unique runtime phone values are required.");
  }
}

export function createSecureCqTalentTestAccountManifest(): SecureCqTalentTestAccountManifest {
  return {
    version: 2,
    clubId,
    appClientId,
    accountIds: [1, 2, 3, 4, 5, 6, 7].map((slot) => ({
      slot,
      userId: "user-cq-talent-secure-test-" + slot,
      membershipId: "membership-cq-talent-secure-test-" + slot,
      parentId: "parent-cq-talent-secure-test-" + slot,
      coachId: "coach-cq-talent-secure-test-" + slot,
      teamId: "team-cq-talent-secure-test-" + slot,
      studentIds: Array.from({ length: demoTeamRosterSize }, (_, index) => "student-cq-talent-secure-test-" + slot + "-" + (index + 1)),
      guardianBindingIds: [1, 2].map((child) => "guardian-cq-talent-secure-test-" + slot + "-" + child),
      contactIds: [1, 2].map((child) => "contact-cq-talent-secure-test-" + slot + "-" + child),
      teamMemberIds: Array.from({ length: demoTeamRosterSize }, (_, index) => "team-member-cq-talent-secure-test-" + slot + "-" + (index + 1)),
      eventId: "event-cq-talent-secure-test-" + slot,
      participantIds: Array.from({ length: demoTeamRosterSize }, (_, index) => "participant-cq-talent-secure-test-" + slot + "-" + (index + 1)),
    })),
    sideEffects: {},
  };
}

export function getSecureCqTalentTestAccountEventIds(
  account: SecureCqTalentTestAccountManifestEntry,
): string[] {
  return [
    account.eventId,
    ...completedTrainingEventKeys.map((key) => eventIdFor(account, key)),
    eventIdFor(account, "future-training"),
    eventIdFor(account, "completed-match"),
    eventIdFor(account, "scheduled-match"),
  ];
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
  if (users.every((user, index) => !user || user.phone === phones[index])) {
    if (users.every((user) => !user)) return null;
    if (users.every((user, index) => !user || hasBaseInstallation(database, manifest.accountIds[index]!))) return manifest;
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
    hasBaseInstallation(database, account)
  );
}

function hasBaseInstallation(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
): boolean {
  return Boolean(database.prepare("SELECT id FROM user_accounts WHERE id = ? AND phone IS NOT NULL AND roles_json = ? AND status = 'active'").get(account.userId, roleJson))
    &&
    (
    hasRows(database, "club_user_memberships", [account.membershipId])
    && hasRows(database, "parent_profiles", [account.parentId])
    && hasRows(database, "coach_profiles", [account.coachId])
    && hasRows(database, "teams", [account.teamId])
    && hasRows(database, "calendar_events", [account.eventId])
    && hasRows(database, "student_profiles", account.studentIds.slice(0, 2))
    && hasRows(database, "student_guardian_bindings", account.guardianBindingIds)
    && hasRows(database, "student_contacts", account.contactIds)
    && hasRows(database, "team_members", account.teamMemberIds.slice(0, 2))
    && hasRows(database, "event_participants", account.participantIds.slice(0, 2))
    && hasExpectedOwnership(database, account)
  );
}

function hasRows(database: DatabaseSync, table: string, ids: readonly string[]): boolean {
  const placeholders = ids.map(() => "?").join(", ");
  const row = database.prepare(
    "SELECT COUNT(*) AS count FROM " + table + " WHERE club_id = ? AND id IN (" + placeholders + ")",
  ).get(clubId, ...ids) as { count: number };
  return row.count === ids.length;
}

function hasOperationalProfilesForGuardianStudents(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
): boolean {
  const guardianStudentIds = account.studentIds.slice(0, 2);
  const placeholders = guardianStudentIds.map(() => "?").join(", ");
  // The table is unique by (club_id, student_id). Older secure slots can retain
  // their pre-existing operational rows under non-canonical IDs; do not overwrite
  // those rows merely to make this controlled operation's ID manifest complete.
  const row = database.prepare(
    "SELECT COUNT(*) AS count FROM student_operational_profiles WHERE club_id = ? AND student_id IN (" + placeholders + ")",
  ).get(clubId, ...guardianStudentIds) as { count: number };
  return row.count === guardianStudentIds.length;
}

function hasExpectedOwnership(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
  rosterStudentIds: readonly string[] = account.studentIds.slice(0, 2),
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

  const hasRosterRows = rosterStudentIds.every((studentId, index) =>
    hasRow(
      "SELECT id FROM student_profiles WHERE id = ? AND club_id = ?",
      studentId,
      clubId,
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
  const hasGuardianRows = account.studentIds.slice(0, 2).every((studentId, index) =>
    hasRow(
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
    ),
  );
  return hasRosterRows && hasGuardianRows;
}

function hasCompleteDemoData(
  database: DatabaseSync,
  manifest: SecureCqTalentTestAccountManifest,
): boolean {
  return manifest.accountIds.every((account) => {
    const records = demoRecordIds(account);
    return hasBaseInstallation(database, account)
      && hasRows(database, "student_profiles", account.studentIds)
      && hasRows(database, "team_members", account.teamMemberIds)
      && hasRows(database, "calendar_events", records.eventIds)
      && hasRows(database, "event_participants", records.participantIds)
      && hasRows(database, "lesson_credit_ledger", records.lessonLedgerIds)
      && hasRows(database, "player_assessments", records.assessmentIds)
      && hasRows(database, "assessment_raw_results", records.assessmentRawResultIds)
      && hasRows(database, "assessment_scores", records.assessmentScoreIds)
      && hasRows(database, "player_metric_records", records.metricRecordIds)
      && hasRows(database, "metric_lineages", records.metricLineageIds)
      && hasExpectedOwnership(database, account, account.studentIds)
      && hasRows(database, "matches", records.matchIds)
      && hasRows(database, "match_rosters", records.matchRosterIds)
      && hasRows(database, "match_events", records.matchEventIds)
      && hasRows(database, "tactical_boards", records.tacticalBoardIds)
      && hasOperationalProfilesForGuardianStudents(database, account)
      && hasRows(database, "insurance_policies", records.insurancePolicyIds)
      && hasRows(database, "private_lesson_requests", records.privateLessonRequestIds)
      && hasRows(database, "communication_logs", records.communicationLogIds);
  });
}

function hasCurrentDemoData(
  database: DatabaseSync,
  manifest: SecureCqTalentTestAccountManifest,
  now: string,
): boolean {
  if (!hasCompleteDemoData(database, manifest)) return false;

  return manifest.accountIds.every((account) => {
    const labels = demoLabels(account);
    const events = buildDemoEvents(account, now);
    if (hasSupersededSettlementLedgerRows(database, account)) return false;
    const storedEvents = database.prepare(`
      SELECT id, type, title, starts_at, ends_at, location_id, status, notes
      FROM calendar_events
      WHERE club_id = ? AND id IN (${events.map(() => "?").join(", ")})
    `).all(clubId, ...events.map((event) => event.id)) as Array<{
      id: string;
      type: string;
      title: string;
      starts_at: string;
      ends_at: string;
      location_id: string | null;
      status: string;
      notes: string | null;
    }>;
    const eventById = new Map(storedEvents.map((event) => [event.id, event]));
    const eventsMatch = events.every((event) => {
      const stored = eventById.get(event.id);
      return stored
        && stored.type === event.type
        && stored.title === event.title
        && stored.starts_at === event.startsAt
        && stored.ends_at === event.endsAt
        && stored.location_id === event.locationId
        && stored.status === event.status
        && stored.notes === event.notes;
    });
    if (!eventsMatch) return false;

    const records = demoRecordIds(account);
    const storedMatchEvents = database.prepare(`
      SELECT id, type, minute, note
      FROM match_events
      WHERE club_id = ? AND id IN (${records.matchEventIds.map(() => "?").join(", ")})
    `).all(clubId, ...records.matchEventIds) as Array<{
      id: string;
      type: string;
      minute: number | null;
      note: string | null;
    }>;
    const matchEventById = new Map(storedMatchEvents.map((event) => [event.id, event]));
    const matchEventsMatch = completedMatchEventDetails.every((detail, index) => {
      const stored = matchEventById.get(records.matchEventIds[index]!);
      return stored
        && stored.type === detail.type
        && stored.minute === 8 + index * 7
        && stored.note === detail.note;
    });
    if (!matchEventsMatch) return false;

    const identity = database.prepare(`
      SELECT
        (SELECT display_name FROM user_accounts WHERE id = ?) AS account_name,
        (SELECT name FROM parent_profiles WHERE id = ?) AS parent_name,
        (SELECT name FROM coach_profiles WHERE id = ?) AS coach_name,
        (SELECT name FROM teams WHERE id = ?) AS team_name,
        (SELECT opponent_name FROM matches WHERE id = ?) AS completed_opponent,
        (SELECT opponent_name FROM matches WHERE id = ?) AS scheduled_opponent
    `).get(
      account.userId,
      account.parentId,
      account.coachId,
      account.teamId,
      "match-cq-talent-secure-test-" + account.slot + "-completed",
      "match-cq-talent-secure-test-" + account.slot + "-scheduled",
    ) as {
      account_name?: string;
      parent_name?: string;
      coach_name?: string;
      team_name?: string;
      completed_opponent?: string;
      scheduled_opponent?: string;
    };
    return identity.account_name === labels.accountName
      && identity.parent_name === labels.parentName
      && identity.coach_name === labels.coachName
      && identity.team_name === labels.teamName
      && identity.completed_opponent === labels.completedOpponent
      && identity.scheduled_opponent === labels.scheduledOpponent;
  });
}

function insertAccount(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
  phone: string,
  now: string,
): void {
  const labels = demoLabels(account);
  database.prepare(
    "INSERT INTO user_accounts (id, display_name, phone, roles_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
  ).run(account.userId, labels.accountName, phone, roleJson, now, now);
  database.prepare(
    "INSERT INTO club_user_memberships (id, club_id, user_id, roles_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
  ).run(account.membershipId, clubId, account.userId, roleJson, now, now);
  database.prepare(
    "INSERT INTO parent_profiles (id, club_id, user_id, name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(account.parentId, clubId, account.userId, labels.parentName, phone, now, now);
  database.prepare(
    "INSERT INTO coach_profiles (id, club_id, user_id, name, specialties_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
  ).run(account.coachId, clubId, account.userId, labels.coachName, JSON.stringify(["少儿训练", "技术训练"]), now, now);
  database.prepare(
    "INSERT INTO teams (id, club_id, name, age_group, level, default_coach_id, status, created_at, updated_at) VALUES (?, ?, ?, 'U10', 'development', ?, 'active', ?, ?)",
  ).run(account.teamId, clubId, labels.teamName, account.coachId, now, now);
  database.prepare(
    "INSERT INTO calendar_events (id, club_id, type, title, starts_at, ends_at, timezone, location_id, primary_team_id, owner_coach_id, status, created_at, updated_at) VALUES (?, ?, 'training', ?, ?, ?, 'Asia/Shanghai', ?, ?, ?, 'scheduled', ?, ?)",
  ).run(
    account.eventId,
    clubId,
    "本周技术训练",
    shiftIso(now, 0, 2),
    shiftIso(now, 0, 4),
    "venue-cq-talent-jiulongpo",
    account.teamId,
    account.coachId,
    now,
    now,
  );

  account.studentIds.forEach((studentId, index) => {
    database.prepare(
      "INSERT INTO student_profiles (id, club_id, name, birth_date, gender, dominant_foot, current_level, created_at, updated_at) VALUES (?, ?, ?, '2015-01-01', 'unspecified', 'right', '少儿基础组', ?, ?)",
    ).run(studentId, clubId, labels.playerNames[index]!, now, now);
    if (index < 2) {
      database.prepare(
        "INSERT INTO student_guardian_bindings (id, club_id, student_id, parent_id, relationship, is_primary_contact, created_at, updated_at) VALUES (?, ?, ?, ?, 'guardian', 1, ?, ?)",
      ).run(account.guardianBindingIds[index]!, clubId, studentId, account.parentId, now, now);
      database.prepare(
        "INSERT INTO student_contacts (id, club_id, student_id, name, relationship, phone, is_primary_contact, receives_notifications, created_at, updated_at) VALUES (?, ?, ?, ?, 'guardian', ?, 1, 1, ?, ?)",
      ).run(account.contactIds[index]!, clubId, studentId, labels.parentName, phone, now, now);
    }
    database.prepare(
      "INSERT INTO team_members (id, club_id, team_id, student_id, starts_at, is_primary_team, status, created_at, updated_at) VALUES (?, ?, ?, ?, '2026-08-01', 1, 'active', ?, ?)",
    ).run(account.teamMemberIds[index]!, clubId, account.teamId, studentId, now, now);
    database.prepare(
      "INSERT INTO event_participants (id, club_id, event_id, student_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'confirmed', ?, ?)",
    ).run(account.participantIds[index]!, clubId, account.eventId, studentId, now, now);
  });
}

function ensureDemoData(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
  now: string,
): void {
  const records = demoRecordIds(account);
  const labels = demoLabels(account);
  const events = buildDemoEvents(account, now);
  const completedTrainingEvents = events.filter((event) => event.type === "training" && event.status === "completed");
  const assessmentCatalog = loadDemoAssessmentCatalog(database);

  refreshDemoIdentity(database, account, labels, now);
  removeSupersededSettlementLedgerRows(database, account);

  database.prepare(
    "UPDATE calendar_events SET title = ?, starts_at = ?, ends_at = ?, location_id = ?, status = ?, notes = ?, updated_at = ? WHERE id = ? AND club_id = ? AND primary_team_id = ? AND owner_coach_id = ?",
  ).run(
    events[0]!.title,
    events[0]!.startsAt,
    events[0]!.endsAt,
    events[0]!.locationId,
    events[0]!.status,
    events[0]!.notes,
    now,
    events[0]!.id,
    clubId,
    account.teamId,
    account.coachId,
  );

  events.slice(1).forEach((event) => {
    upsertDemoRow(database, "calendar_events",
      "id, club_id, type, title, starts_at, ends_at, timezone, location_id, primary_team_id, owner_coach_id, status, notes, created_at, updated_at",
      [event.id, clubId, event.type, event.title, event.startsAt, event.endsAt, "Asia/Shanghai", event.locationId, account.teamId, account.coachId, event.status, event.notes, now, now]);
  });

  account.studentIds.forEach((studentId, index) => {
    upsertDemoRow(database, "student_profiles",
      "id, club_id, name, birth_date, gender, dominant_foot, current_level, created_at, updated_at",
      [studentId, clubId, labels.playerNames[index]!, "2015-" + String((index % 9) + 1).padStart(2, "0") + "-" + String((index % 20) + 1).padStart(2, "0"), "unspecified", index % 3 === 0 ? "left" : "right", "少儿基础组", now, now]);
    database.prepare(
      "INSERT INTO team_members (id, club_id, team_id, student_id, starts_at, is_primary_team, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 'active', ?, ?) ON CONFLICT DO NOTHING",
    ).run(account.teamMemberIds[index]!, clubId, account.teamId, studentId, now.slice(0, 10), now, now);
    upsertDemoRow(database, "event_participants",
      "id, club_id, event_id, student_id, status, note, created_at, updated_at",
      [account.participantIds[index]!, clubId, account.eventId, studentId, "confirmed", "已加入本周训练", now, now]);

    events.slice(1).forEach((event) => {
      const participantStatus = event.participantStatuses[index] ?? "confirmed";
      upsertDemoRow(database, "event_participants",
        "id, club_id, event_id, student_id, status, note, created_at, updated_at",
        [participantIdForEvent(account, event.id, index), clubId, event.id, studentId, participantStatus, participantNote(participantStatus), now, now]);
    });

    const openingBalance = 12 - index;
    const ledgerOffset = index * (completedTrainingEvents.length + 1);
    upsertDemoRow(database, "lesson_credit_ledger",
      "id, club_id, student_id, team_id, event_id, occurred_at, entry_type, lesson_delta, balance_after, source, source_id, actor_user_id, note, created_at, updated_at",
      [records.lessonLedgerIds[ledgerOffset]!, clubId, studentId, account.teamId, null, shiftIso(now, -30, 0), "credit", openingBalance, openingBalance, "secure_demo", "secure-demo-opening-" + account.slot + "-" + (index + 1), account.userId, "开通体验课时", now, now]);
    completedTrainingEvents.forEach((event, trainingIndex) => {
      upsertDemoRow(database, "lesson_credit_ledger",
        "id, club_id, student_id, team_id, event_id, occurred_at, entry_type, lesson_delta, balance_after, source, source_id, actor_user_id, note, created_at, updated_at",
        [records.lessonLedgerIds[ledgerOffset + trainingIndex + 1]!, clubId, studentId, account.teamId, event.id, event.endsAt, "debit", -1, openingBalance - trainingIndex - 1, "attendance", event.id + "-" + studentId, account.userId, event.title + "销课", now, now]);
    });

    const assessmentId = records.assessmentIds[index]!;
    upsertDemoRow(database, "player_assessments",
      "id, club_id, student_id, template_id, template_version_id, assessed_by_coach_id, assessed_at, event_id, summary, created_at, updated_at",
      [assessmentId, clubId, studentId, assessmentCatalog.templateId, assessmentCatalog.templateVersionId, account.coachId, shiftIso(now, -6, 0), eventIdFor(account, "history-training"), "八项能力综合测评", now, now]);

    assessmentCatalog.rawItems.forEach((item, metricIndex) => {
      const score = 62 + ((account.slot * 7 + index * 5 + metricIndex * 4) % 31);
      const rawId = records.assessmentRawResultIds[index * 8 + metricIndex]!;
      const scoreId = records.assessmentScoreIds[index * 8 + metricIndex]!;
      const recordId = records.metricRecordIds[index * 8 + metricIndex]!;
      const lineageId = records.metricLineageIds[index * 8 + metricIndex]!;
      const radarMetric = assessmentCatalog.radarMetrics[metricIndex]!;
      const valueJson = JSON.stringify({ kind: "score_0_100", score });

      upsertDemoRow(database, "assessment_raw_results",
        "id, club_id, assessment_id, test_item_id, metric_id, value_json, recorded_by_coach_id, note, created_at, updated_at",
        [rawId, clubId, assessmentId, item.id, item.metricId, valueJson, account.coachId, "本次测评原始成绩", now, now]);
      upsertDemoRow(database, "assessment_scores",
        "id, club_id, assessment_id, metric_id, value_json, normalized_score, raw_result_id, comment, created_at, updated_at",
        [scoreId, clubId, assessmentId, item.metricId, valueJson, Number((score / 100).toFixed(2)), rawId, "已换算为能力得分", now, now]);
      upsertDemoRow(database, "player_metric_records",
        "id, club_id, student_id, metric_id, value_json, source, occurred_at, event_id, assessment_id, template_version_id, raw_result_id, source_record_id, recorded_by_coach_id, visibility, confidence, note, lineage_id, created_at, updated_at",
        [recordId, clubId, studentId, radarMetric.metricId, valueJson, "assessment", shiftIso(now, -6, 0), eventIdFor(account, "history-training"), assessmentId, assessmentCatalog.templateVersionId, rawId, scoreId, account.coachId, "published_summary", 0.92, "本次测评能力指标", lineageId, now, now]);
      upsertDemoRow(database, "metric_lineages",
        "id, club_id, output_record_id, definition_id, definition_version, input_record_ids_json, computed_at, created_at, updated_at",
        [lineageId, clubId, recordId, radarMetric.definitionId, radarMetric.definitionVersion, JSON.stringify([rawId]), shiftIso(now, -6, 0), now, now]);
    });
  });

  upsertDemoRow(database, "matches",
    "id, club_id, event_id, match_type, opponent_name, home_score, away_score, status, created_at, updated_at",
    [records.matchIds[0]!, clubId, eventIdFor(account, "completed-match"), "friendly", labels.completedOpponent, 4, 2, "completed", now, now]);
  upsertDemoRow(database, "matches",
    "id, club_id, event_id, match_type, opponent_name, home_score, away_score, status, created_at, updated_at",
    [records.matchIds[1]!, clubId, eventIdFor(account, "scheduled-match"), "league", labels.scheduledOpponent, null, null, "scheduled", now, now]);
  const matchRosterMatches = [
    { matchId: records.matchIds[0]!, eventId: eventIdFor(account, "completed-match") },
    { matchId: records.matchIds[1]!, eventId: eventIdFor(account, "scheduled-match") },
  ];
  matchRosterMatches.forEach(({ matchId, eventId }, matchIndex) => {
    account.studentIds.forEach((studentId, index) => {
      upsertDemoRow(database, "match_rosters",
        "id, club_id, match_id, student_id, team_id, started, minutes_played, position, created_at, updated_at",
        [records.matchRosterIds[matchIndex * account.studentIds.length + index]!, clubId, matchId, studentId, account.teamId, index < demoStartingLineupSize ? 1 : 0, matchIndex === 0 && index < demoStartingLineupSize ? Math.max(20, 60 - index * 4) : 0, matchIndex === 0 && index < demoStartingLineupSize ? demoMatchPositions[index]! : null, now, now]);
    });
  });
  account.studentIds.slice(0, completedMatchEventDetails.length).forEach((studentId, index) => {
    const detail = completedMatchEventDetails[index]!;
    const eventType = detail.type;
    upsertDemoRow(database, "match_events",
      "id, club_id, match_id, type, student_id, minute, linked_metric_id, note, created_at, updated_at",
      [records.matchEventIds[index]!, clubId, records.matchIds[0]!, eventType, studentId, 8 + index * 7, eventType === "foul" || eventType === "yellow_card" || eventType === "own_goal" ? null : assessmentCatalog.radarMetrics[index]!.metricId, detail.note, now, now]);
  });

  upsertDemoRow(database, "tactical_boards",
    "id, club_id, event_id, formation_name, pitch_type, players_json, updated_by_coach_id, created_at, updated_at",
    [records.tacticalBoardIds[0]!, clubId, eventIdFor(account, "scheduled-match"), "4-3-3", "full",
      JSON.stringify(account.studentIds.map((studentId, index) => ({
        studentId,
        displayName: labels.playerNames[index]!,
        role: index < demoStartingLineupSize ? "starter" : "substitute",
        positionLabel: index < demoStartingLineupSize ? demoTacticalPositions[index]![0] : undefined,
        x: index < demoStartingLineupSize ? demoTacticalPositions[index]![1] : 0.5,
        y: index < demoStartingLineupSize ? demoTacticalPositions[index]![2] : 0.95,
      }))), account.coachId, now, now]);

  account.studentIds.slice(0, 2).forEach((studentId, index) => {
    upsertCanonicalDemoRow(database, "student_operational_profiles",
      "id, club_id, student_id, region, school, acquisition_channel, student_status, communication_stage, responsible_coach_id, insurance_expires_at, total_checkins, latest_checkin_at, total_recharges, lesson_balance, notes, created_at, updated_at",
      [records.operationalProfileIds[index]!, clubId, studentId, "重庆", "重庆天才足球训练营", "secure_demo", "active", index === 0 ? "training_follow_up" : "assessment_complete", account.coachId, shiftIso(now, 365, 0).slice(0, 10), 18 + index * 3, shiftIso(now, -14, 2), 2, 11 - index, "成长档案已更新", now, now]);
    upsertDemoRow(database, "insurance_policies",
      "id, club_id, student_id, purchased_at, expires_at, policy_number, provider, sport, approved, review_status, source, source_id, actor_user_id, external_ref, note, created_at, updated_at",
      [records.insurancePolicyIds[index]!, clubId, studentId, shiftIso(now, -120, 0).slice(0, 10), shiftIso(now, 365, 0).slice(0, 10), "演示保单" + account.slot + "-" + (index + 1), "重庆天才运动保障", "足球", 1, "approved", "secure_demo", "secure-demo-insurance-" + account.slot + "-" + (index + 1), account.userId, "secure-demo-insurance-" + account.slot + "-" + (index + 1), "运动保障已审核通过", now, now]);
    upsertDemoRow(database, "private_lesson_requests",
      "id, club_id, student_id, coach_name, date, time_slot, goals_json, note, status, requested_by_user_id, created_at, updated_at",
      [records.privateLessonRequestIds[index]!, clubId, studentId, labels.coachName, shiftIso(now, 9 + index, 0).slice(0, 10), "18:00-19:00", JSON.stringify(index === 0 ? ["控球", "传球"] : ["信心", "射门"]), "针对本周训练表现进行强化", "pending", account.userId, now, now]);
    [0, 1].forEach((entry) => {
      upsertDemoRow(database, "communication_logs",
        "id, club_id, student_id, occurred_at, channel, stage, contact_name, operator_user_id, summary, next_follow_up_at, created_at, updated_at",
        [records.communicationLogIds[index * 2 + entry]!, clubId, studentId, shiftIso(now, -7 + entry * 3, 0), "wechat", entry === 0 ? "training_feedback" : "follow_up", labels.parentName, account.userId, entry === 0 ? "已发送本周训练反馈。" : "已确认下次训练跟进。", shiftIso(now, 7 + entry, 0), now, now]);
    });
  });
}

type DemoEvent = {
  id: string;
  type: "training" | "match";
  title: string;
  startsAt: string;
  endsAt: string;
  locationId: string;
  status: "scheduled" | "completed";
  notes: string;
  participantStatuses: string[];
};

type DemoAssessmentCatalog = {
  templateId: string;
  templateVersionId: string;
  rawItems: Array<{ id: string; metricId: string }>;
  radarMetrics: Array<{ metricId: string; definitionId: string; definitionVersion: string }>;
};

const demoMetricCount = 8;
const demoPlayerNames = [
  "丁宁",
  "方圆",
  "李明",
  "林一诺",
  "王旭东",
  "张晨曦",
  "白子涵",
  "陈思远",
  "赵子墨",
  "孙雨泽",
  "周奕辰",
  "吴奕凡",
  "郑思远",
  "冯浩然",
  "曹子轩",
  "何书言",
  "陆星河",
  "杜明远",
  "沈奕航",
] as const;

const demoIdentityProfiles = [
  { name: "罗志炫", teamName: "U10精英队", completedOpponent: "山城少年足球队", scheduledOpponent: "两江青训足球队" },
  { name: "骆啸宇", teamName: "U11精英队", completedOpponent: "渝北青训队", scheduledOpponent: "江北少年足球队" },
  { name: "郭飞", teamName: "U12精英队", completedOpponent: "南岸青少年队", scheduledOpponent: "九龙坡训练队" },
  { name: "刘锐", teamName: "U10发展队", completedOpponent: "巴南少年足球队", scheduledOpponent: "沙坪坝青训队" },
  { name: "吴文静", teamName: "U11发展队", completedOpponent: "大渡口少年队", scheduledOpponent: "渝中校园队" },
  { name: "唐宇婧", teamName: "U12发展队", completedOpponent: "北碚青训队", scheduledOpponent: "两江新区少年队" },
  { name: "李佳新", teamName: "U9精英队", completedOpponent: "高新少年足球队", scheduledOpponent: "璧山青训队" },
] as const;

type DemoLabels = {
  accountName: string;
  parentName: string;
  coachName: string;
  teamName: string;
  playerNames: string[];
  completedOpponent: string;
  scheduledOpponent: string;
};

function demoLabels(account: SecureCqTalentTestAccountManifestEntry): DemoLabels {
  const profile = demoIdentityProfiles[account.slot - 1] ?? demoIdentityProfiles[0];
  return {
    accountName: profile.name,
    parentName: profile.name,
    coachName: profile.name,
    teamName: profile.teamName,
    playerNames: account.studentIds.map((_, index) => demoPlayerNames[index]!),
    completedOpponent: profile.completedOpponent,
    scheduledOpponent: profile.scheduledOpponent,
  };
}

function refreshDemoIdentity(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
  labels: DemoLabels,
  now: string,
): void {
  database.prepare("UPDATE user_accounts SET display_name = ?, updated_at = ? WHERE id = ?").run(
    labels.accountName,
    now,
    account.userId,
  );
  database.prepare("UPDATE parent_profiles SET name = ?, updated_at = ? WHERE id = ? AND club_id = ?").run(
    labels.parentName,
    now,
    account.parentId,
    clubId,
  );
  database.prepare("UPDATE coach_profiles SET name = ?, specialties_json = ?, updated_at = ? WHERE id = ? AND club_id = ?").run(
    labels.coachName,
    JSON.stringify(["少儿训练", "技术训练"]),
    now,
    account.coachId,
    clubId,
  );
  database.prepare("UPDATE teams SET name = ?, age_group = ?, updated_at = ? WHERE id = ? AND club_id = ?").run(
    labels.teamName,
    "少儿组",
    now,
    account.teamId,
    clubId,
  );
  account.studentIds.forEach((studentId, index) => {
    database.prepare("UPDATE student_profiles SET name = ?, current_level = ?, updated_at = ? WHERE id = ? AND club_id = ?").run(
      labels.playerNames[index]!,
      "少儿基础组",
      now,
      studentId,
      clubId,
    );
    if (index < 2) {
      database.prepare("UPDATE student_contacts SET name = ?, updated_at = ? WHERE id = ? AND club_id = ?").run(
        labels.parentName,
        now,
        account.contactIds[index]!,
        clubId,
      );
    }
  });
}

function buildDemoEvents(account: SecureCqTalentTestAccountManifestEntry, now: string): DemoEvent[] {
  const anchor = startOfDemoDay(now);
  const weekStart = startOfDemoWeek(now);
  return [
    { id: account.eventId, type: "training", title: "本周技术训练", startsAt: shiftIso(anchor, 0, 2), endsAt: shiftIso(anchor, 0, 4), locationId: "venue-cq-talent-jiulongpo", status: "scheduled", notes: "围绕控球、传接和小组配合开展训练。", participantStatuses: ["confirmed", "confirmed", "invited", "confirmed", "confirmed", "invited", "confirmed", "confirmed"] },
    { id: eventIdFor(account, "history-training"), type: "training", title: "基础技术训练回顾", startsAt: shiftIso(weekStart, -13, 0), endsAt: shiftIso(weekStart, -13, 2), locationId: "venue-cq-talent-sport-uni", status: "completed", notes: "已完成带球、传球和射门基础训练。", participantStatuses: ["present", "late", "present", "present", "present", "late", "present", "present"] },
    { id: eventIdFor(account, "history-training-2"), type: "training", title: "传接配合专项训练", startsAt: shiftIso(weekStart, -11, 0), endsAt: shiftIso(weekStart, -11, 2), locationId: "venue-cq-talent-nanan", status: "completed", notes: "已完成接球转身、短传配合和跑位训练。", participantStatuses: ["present", "present", "late", "present", "present", "present", "late", "present"] },
    { id: eventIdFor(account, "history-training-3"), type: "training", title: "攻防转换训练", startsAt: shiftIso(weekStart, -6, 0), endsAt: shiftIso(weekStart, -6, 2), locationId: "venue-cq-talent-jiulongpo", status: "completed", notes: "已完成抢断后的快速推进和回防组织训练。", participantStatuses: ["present", "late", "present", "present", "present", "present", "present", "late"] },
    { id: eventIdFor(account, "history-training-4"), type: "training", title: "射门终结训练", startsAt: shiftIso(weekStart, -4, 0), endsAt: shiftIso(weekStart, -4, 2), locationId: "venue-cq-talent-sport-uni", status: "completed", notes: "已完成禁区前射门、补射和终结选择训练。", participantStatuses: ["late", "present", "present", "present", "late", "present", "present", "present"] },
    { id: eventIdFor(account, "history-training-5"), type: "training", title: "小组对抗训练", startsAt: shiftIso(weekStart, 0, 0), endsAt: shiftIso(weekStart, 0, 2), locationId: "venue-cq-talent-nanan", status: "completed", notes: "已完成四对四对抗和小组协同训练。", participantStatuses: ["present", "present", "late", "present", "present", "present", "present", "late"] },
    { id: eventIdFor(account, "future-training"), type: "training", title: "周末进攻训练", startsAt: shiftIso(anchor, 4, 1), endsAt: shiftIso(anchor, 4, 3), locationId: "venue-cq-talent-jiulongpo", status: "scheduled", notes: "安排进攻跑位、边路配合和小范围对抗。", participantStatuses: ["confirmed", "invited", "confirmed", "confirmed", "invited", "confirmed", "confirmed", "confirmed"] },
    { id: eventIdFor(account, "completed-match"), type: "match", title: "周末友谊赛战报", startsAt: shiftIso(weekStart, -5, 0), endsAt: shiftIso(weekStart, -5, 2), locationId: "venue-cq-talent-nanan", status: "completed", notes: "友谊赛已完成，已记录关键比赛事件。", participantStatuses: ["present", "present", "present", "late", "present", "present", "present", "present"] },
    { id: eventIdFor(account, "scheduled-match"), type: "match", title: "周末联赛排兵", startsAt: shiftIso(anchor, 8, 0), endsAt: shiftIso(anchor, 8, 2), locationId: "venue-cq-talent-jiulongpo", status: "scheduled", notes: "联赛前已完成首发阵容和战术布置。", participantStatuses: ["confirmed", "confirmed", "confirmed", "invited", "confirmed", "confirmed", "confirmed", "confirmed"] },
  ];
}

function startOfDemoDay(now: string): string {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error("Secure demo data requires a valid ISO timestamp.");
  date.setUTCHours(8, 0, 0, 0);
  return date.toISOString();
}

function startOfDemoWeek(now: string): string {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error("Secure demo data requires a valid ISO timestamp.");
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(8, 0, 0, 0);
  return date.toISOString();
}

function participantNote(status: string): string {
  const labels: Record<string, string> = {
    confirmed: "已确认参加",
    invited: "已发送邀请",
    present: "已到场",
    late: "迟到到场",
    absent: "未到场",
    leave_requested: "已提交请假",
    excused: "已批准请假",
  };
  return labels[status] ?? "已记录出勤状态";
}

function demoRecordIds(account: SecureCqTalentTestAccountManifestEntry) {
  const eventIds = getSecureCqTalentTestAccountEventIds(account);
  const participantIds = eventIds.flatMap((eventId) => account.studentIds.map((_, index) => participantIdForEvent(account, eventId, index)));
  return {
    eventIds,
    participantIds,
    lessonLedgerIds: account.studentIds.flatMap((_, index) => [
      "lesson-ledger-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-credit",
      ...completedTrainingEventKeys.map((_, trainingIndex) => "lesson-ledger-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-debit-" + (trainingIndex + 1)),
    ]),
    assessmentIds: account.studentIds.map((_, index) => "assessment-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    assessmentRawResultIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "assessment-raw-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    assessmentScoreIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "assessment-score-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    metricRecordIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "metric-record-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    metricLineageIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "metric-lineage-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    matchIds: ["match-cq-talent-secure-test-" + account.slot + "-completed", "match-cq-talent-secure-test-" + account.slot + "-scheduled"],
    matchRosterIds: ["completed", "scheduled"].flatMap((matchKey) => account.studentIds.map((_, index) => "match-roster-cq-talent-secure-test-" + account.slot + "-" + matchKey + "-" + (index + 1))),
    matchEventIds: account.studentIds.slice(0, completedMatchEventDetails.length).map((_, index) => "match-event-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    tacticalBoardIds: ["tactical-board-cq-talent-secure-test-" + account.slot + "-scheduled"],
    operationalProfileIds: account.studentIds.slice(0, 2).map((_, index) => "operational-profile-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    insurancePolicyIds: account.studentIds.slice(0, 2).map((_, index) => "insurance-policy-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    privateLessonRequestIds: account.studentIds.slice(0, 2).map((_, index) => "private-lesson-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    communicationLogIds: account.studentIds.slice(0, 2).flatMap((_, index) => ["communication-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-1", "communication-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-2"]),
  };
}

function supersededSettlementLedgerIds(account: SecureCqTalentTestAccountManifestEntry): string[] {
  return account.studentIds.map((_, index) =>
    "lesson-ledger-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-debit",
  );
}

function hasSupersededSettlementLedgerRows(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
): boolean {
  const ids = supersededSettlementLedgerIds(account);
  const placeholders = ids.map(() => "?").join(", ");
  const row = database.prepare(
    "SELECT COUNT(*) AS count FROM lesson_credit_ledger WHERE club_id = ? AND id IN (" + placeholders + ")",
  ).get(clubId, ...ids) as { count: number };
  return row.count > 0;
}

function removeSupersededSettlementLedgerRows(
  database: DatabaseSync,
  account: SecureCqTalentTestAccountManifestEntry,
): void {
  const ids = supersededSettlementLedgerIds(account);
  const placeholders = ids.map(() => "?").join(", ");
  database.prepare(
    "DELETE FROM lesson_credit_ledger WHERE club_id = ? AND id IN (" + placeholders + ")",
  ).run(clubId, ...ids);
}

function loadDemoAssessmentCatalog(database: DatabaseSync): DemoAssessmentCatalog {
  const template = database.prepare("SELECT id, template_id FROM assessment_template_versions WHERE id = 'assessment-template-version-cq-talent-elite-20260326' AND club_id = ? AND status = 'active'").get(clubId) as { id: string; template_id: string } | undefined;
  const rawItems = database.prepare("SELECT id, metric_id FROM assessment_test_items WHERE club_id = ? AND id LIKE 'assessment-test-cq-talent-%' ORDER BY id LIMIT 8").all(clubId) as Array<{ id: string; metric_id: string }>;
  const radarMetrics = database.prepare("SELECT node.metric_id, definition.id AS definition_id, definition.version AS definition_version FROM metric_view_nodes node JOIN derived_metric_definitions definition ON definition.output_metric_id = node.metric_id WHERE node.view_id = 'metric-view-cq-talent-elite-core-radar' AND node.metric_id IS NOT NULL ORDER BY node.sort_order").all() as Array<{ metric_id: string; definition_id: string; definition_version: string }>;
  if (!template || rawItems.length !== demoMetricCount || radarMetrics.length !== demoMetricCount) {
    throw new Error("Secure demo data requires the eight-dimension Chongqing Talent assessment catalog.");
  }
  return {
    templateId: template.template_id,
    templateVersionId: template.id,
    rawItems: rawItems.map((item) => ({ id: item.id, metricId: item.metric_id })),
    radarMetrics: radarMetrics.map((item) => ({ metricId: item.metric_id, definitionId: item.definition_id, definitionVersion: item.definition_version })),
  };
}

function eventIdFor(account: SecureCqTalentTestAccountManifestEntry, key: DemoEventKey): string {
  return "event-cq-talent-secure-test-" + account.slot + "-" + key;
}

function participantIdForEvent(account: SecureCqTalentTestAccountManifestEntry, eventId: string, studentIndex: number): string {
  if (eventId === account.eventId) return account.participantIds[studentIndex]!;
  return "participant-" + eventId.slice("event-".length) + "-" + (studentIndex + 1);
}

function shiftIso(now: string, dayOffset: number, hourOffset: number): string {
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error("Secure demo data requires a valid ISO timestamp.");
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(date.getUTCHours() + hourOffset);
  return date.toISOString();
}

type DemoSqlValue = string | number | null;

function insertDemoRow(database: DatabaseSync, table: string, columns: string, values: DemoSqlValue[]): void {
  const placeholders = values.map(() => "?").join(", ");
  database.prepare("INSERT INTO " + table + " (" + columns + ") VALUES (" + placeholders + ") ON CONFLICT DO NOTHING").run(...values);
}

function upsertDemoRow(database: DatabaseSync, table: string, columns: string, values: DemoSqlValue[]): void {
  const columnNames = columns.split(",").map((column) => column.trim());
  const placeholders = values.map(() => "?").join(", ");
  const updates = columnNames
    .filter((column) => column !== "id" && column !== "created_at")
    .map((column) => column + " = excluded." + column)
    .join(", ");
  database.prepare(
    "INSERT INTO " + table + " (" + columns + ") VALUES (" + placeholders + ") ON CONFLICT(id) DO UPDATE SET " + updates,
  ).run(...values);
}

function upsertCanonicalDemoRow(database: DatabaseSync, table: string, columns: string, values: DemoSqlValue[]): void {
  const id = values[0];
  if (typeof id !== "string") throw new Error("Canonical secure demo rows require a string id.");
  if (database.prepare("SELECT id FROM " + table + " WHERE id = ?").get(id)) {
    upsertDemoRow(database, table, columns, values);
    return;
  }
  insertDemoRow(database, table, columns, values);
}

type Row = Record<string, string | null>;
