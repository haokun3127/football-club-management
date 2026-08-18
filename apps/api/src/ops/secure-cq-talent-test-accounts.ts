import type { DatabaseSync } from "node:sqlite";

const clubId = "club-chongqing-talent";
const appClientId = "app-client-cq-talent-wechat-main";
const roleJson = JSON.stringify(["parent", "coach"]);

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
  const manifest = buildManifest();
  const now = input.now ?? new Date().toISOString();

  if (input.dryRun) {
    validateTarget(database, input.phones, manifest);
    const existing = readExistingManifest(database, input.phones, manifest);
    return existing && hasCompleteDemoData(database, existing)
      ? { status: "already_present", manifest: existing }
      : { status: "dry_run", manifest };
  }

  validateTarget(database, input.phones, manifest);
  const existing = readExistingManifest(database, input.phones, manifest);
  const alreadyComplete = existing !== null && hasCompleteDemoData(database, existing);
  if (alreadyComplete) {
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
    phones.length !== 7
    || phones.some((phone) => typeof phone !== "string" || !/^\d{6,20}$/.test(phone))
    || new Set(phones).size !== 7
  ) {
    throw new Error("Exactly seven unique runtime phone values are required.");
  }
}

function buildManifest(): SecureCqTalentTestAccountManifest {
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
      studentIds: [1, 2, 3, 4, 5, 6, 7, 8].map((child) => "student-cq-talent-secure-test-" + slot + "-" + child),
      guardianBindingIds: [1, 2].map((child) => "guardian-cq-talent-secure-test-" + slot + "-" + child),
      contactIds: [1, 2].map((child) => "contact-cq-talent-secure-test-" + slot + "-" + child),
      teamMemberIds: [1, 2, 3, 4, 5, 6, 7, 8].map((child) => "team-member-cq-talent-secure-test-" + slot + "-" + child),
      eventId: "event-cq-talent-secure-test-" + slot,
      participantIds: [1, 2, 3, 4, 5, 6, 7, 8].map((child) => "participant-cq-talent-secure-test-" + slot + "-" + child),
    })),
    sideEffects: {},
  };
}

export function getSecureCqTalentTestAccountEventIds(
  account: SecureCqTalentTestAccountManifestEntry,
): string[] {
  return [
    account.eventId,
    "event-cq-talent-secure-test-" + account.slot + "-history-training",
    "event-cq-talent-secure-test-" + account.slot + "-future-training",
    "event-cq-talent-secure-test-" + account.slot + "-completed-match",
    "event-cq-talent-secure-test-" + account.slot + "-scheduled-match",
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
      && hasRows(database, "match_events", records.matchEventIds)
      && hasRows(database, "tactical_boards", records.tacticalBoardIds)
      && hasOperationalProfilesForGuardianStudents(database, account)
      && hasRows(database, "insurance_policies", records.insurancePolicyIds)
      && hasRows(database, "private_lesson_requests", records.privateLessonRequestIds)
      && hasRows(database, "communication_logs", records.communicationLogIds);
  });
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
    "INSERT INTO calendar_events (id, club_id, type, title, starts_at, ends_at, timezone, primary_team_id, owner_coach_id, status, created_at, updated_at) VALUES (?, ?, 'training', ?, ?, ?, 'Asia/Shanghai', ?, ?, 'scheduled', ?, ?)",
  ).run(
    account.eventId,
    clubId,
    "Secure demo current training " + account.slot,
    shiftIso(now, 0, 2),
    shiftIso(now, 0, 4),
    account.teamId,
    account.coachId,
    now,
    now,
  );

  account.studentIds.forEach((studentId, index) => {
    database.prepare(
      "INSERT INTO student_profiles (id, club_id, name, birth_date, gender, dominant_foot, current_level, created_at, updated_at) VALUES (?, ?, ?, '2015-01-01', 'unspecified', 'right', 'U10 development', ?, ?)",
    ).run(studentId, clubId, "Secure player " + account.slot + "-" + (index + 1), now, now);
    if (index < 2) {
      database.prepare(
        "INSERT INTO student_guardian_bindings (id, club_id, student_id, parent_id, relationship, is_primary_contact, created_at, updated_at) VALUES (?, ?, ?, ?, 'guardian', 1, ?, ?)",
      ).run(account.guardianBindingIds[index]!, clubId, studentId, account.parentId, now, now);
      database.prepare(
        "INSERT INTO student_contacts (id, club_id, student_id, name, relationship, phone, is_primary_contact, receives_notifications, created_at, updated_at) VALUES (?, ?, ?, ?, 'guardian', ?, 1, 1, ?, ?)",
      ).run(account.contactIds[index]!, clubId, studentId, "Secure parent " + account.slot, phone, now, now);
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
  const events = buildDemoEvents(account, now);
  const assessmentCatalog = loadDemoAssessmentCatalog(database);

  database.prepare(
    "UPDATE calendar_events SET title = ?, starts_at = ?, ends_at = ?, status = ?, updated_at = ? WHERE id = ? AND club_id = ? AND primary_team_id = ? AND owner_coach_id = ?",
  ).run(
    events[0]!.title,
    events[0]!.startsAt,
    events[0]!.endsAt,
    events[0]!.status,
    now,
    events[0]!.id,
    clubId,
    account.teamId,
    account.coachId,
  );

  events.slice(1).forEach((event) => {
    insertDemoRow(database, "calendar_events",
      "id, club_id, type, title, starts_at, ends_at, timezone, primary_team_id, owner_coach_id, status, notes, created_at, updated_at",
      [event.id, clubId, event.type, event.title, event.startsAt, event.endsAt, "Asia/Shanghai", account.teamId, account.coachId, event.status, event.notes, now, now]);
  });

  account.studentIds.forEach((studentId, index) => {
    database.prepare(
      "INSERT INTO student_profiles (id, club_id, name, birth_date, gender, dominant_foot, current_level, created_at, updated_at) VALUES (?, ?, ?, ?, 'unspecified', ?, 'U10 development', ?, ?) ON CONFLICT(id) DO NOTHING",
    ).run(
      studentId,
      clubId,
      "Secure player " + account.slot + "-" + (index + 1),
      "2015-" + String((index % 9) + 1).padStart(2, "0") + "-" + String((index % 20) + 1).padStart(2, "0"),
      index % 3 === 0 ? "left" : "right",
      now,
      now,
    );
    database.prepare(
      "INSERT INTO team_members (id, club_id, team_id, student_id, starts_at, is_primary_team, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 'active', ?, ?) ON CONFLICT DO NOTHING",
    ).run(account.teamMemberIds[index]!, clubId, account.teamId, studentId, now.slice(0, 10), now, now);
    database.prepare(
      "INSERT INTO event_participants (id, club_id, event_id, student_id, status, note, created_at, updated_at) VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?) ON CONFLICT DO NOTHING",
    ).run(account.participantIds[index]!, clubId, account.eventId, studentId, "secure demo roster", now, now);

    events.slice(1).forEach((event) => {
      insertDemoRow(database, "event_participants",
        "id, club_id, event_id, student_id, status, note, created_at, updated_at",
        [participantIdForEvent(account, event.id, index), clubId, event.id, studentId, event.participantStatuses[index]!, "secure demo " + event.participantStatuses[index], now, now]);
    });

    const openingBalance = 12 - index;
    insertDemoRow(database, "lesson_credit_ledger",
      "id, club_id, student_id, team_id, event_id, occurred_at, entry_type, lesson_delta, balance_after, source, source_id, actor_user_id, note, created_at, updated_at",
      [records.lessonLedgerIds[index * 2]!, clubId, studentId, account.teamId, null, shiftIso(now, -30, 0), "credit", openingBalance, openingBalance, "secure_demo", "secure-demo-opening-" + account.slot + "-" + (index + 1), account.userId, "Secure demo opening lesson balance", now, now]);
    insertDemoRow(database, "lesson_credit_ledger",
      "id, club_id, student_id, team_id, event_id, occurred_at, entry_type, lesson_delta, balance_after, source, source_id, actor_user_id, note, created_at, updated_at",
      [records.lessonLedgerIds[index * 2 + 1]!, clubId, studentId, account.teamId, eventIdFor(account, "history-training"), shiftIso(now, -14, 2), "debit", -1, openingBalance - 1, "attendance", eventIdFor(account, "history-training") + "-" + studentId, account.userId, "Secure demo attendance debit", now, now]);

    const assessmentId = records.assessmentIds[index]!;
    insertDemoRow(database, "player_assessments",
      "id, club_id, student_id, template_id, template_version_id, assessed_by_coach_id, assessed_at, event_id, summary, created_at, updated_at",
      [assessmentId, clubId, studentId, assessmentCatalog.templateId, assessmentCatalog.templateVersionId, account.coachId, shiftIso(now, -6, 0), eventIdFor(account, "history-training"), "Secure demo eight-dimension assessment", now, now]);

    assessmentCatalog.rawItems.forEach((item, metricIndex) => {
      const score = 62 + ((account.slot * 7 + index * 5 + metricIndex * 4) % 31);
      const rawId = records.assessmentRawResultIds[index * 8 + metricIndex]!;
      const scoreId = records.assessmentScoreIds[index * 8 + metricIndex]!;
      const recordId = records.metricRecordIds[index * 8 + metricIndex]!;
      const lineageId = records.metricLineageIds[index * 8 + metricIndex]!;
      const radarMetric = assessmentCatalog.radarMetrics[metricIndex]!;
      const valueJson = JSON.stringify({ kind: "score_0_100", score });

      insertDemoRow(database, "assessment_raw_results",
        "id, club_id, assessment_id, test_item_id, metric_id, value_json, recorded_by_coach_id, note, created_at, updated_at",
        [rawId, clubId, assessmentId, item.id, item.metricId, valueJson, account.coachId, "Secure demo raw test result", now, now]);
      insertDemoRow(database, "assessment_scores",
        "id, club_id, assessment_id, metric_id, value_json, normalized_score, raw_result_id, comment, created_at, updated_at",
        [scoreId, clubId, assessmentId, item.metricId, valueJson, Number((score / 100).toFixed(2)), rawId, "Secure demo normalized score", now, now]);
      insertDemoRow(database, "player_metric_records",
        "id, club_id, student_id, metric_id, value_json, source, occurred_at, event_id, assessment_id, template_version_id, raw_result_id, source_record_id, recorded_by_coach_id, visibility, confidence, note, lineage_id, created_at, updated_at",
        [recordId, clubId, studentId, radarMetric.metricId, valueJson, "assessment", shiftIso(now, -6, 0), eventIdFor(account, "history-training"), assessmentId, assessmentCatalog.templateVersionId, rawId, scoreId, account.coachId, "published_summary", 0.92, "Secure demo radar metric", lineageId, now, now]);
      insertDemoRow(database, "metric_lineages",
        "id, club_id, output_record_id, definition_id, definition_version, input_record_ids_json, computed_at, created_at, updated_at",
        [lineageId, clubId, recordId, radarMetric.definitionId, radarMetric.definitionVersion, JSON.stringify([rawId]), shiftIso(now, -6, 0), now, now]);
    });
  });

  insertDemoRow(database, "matches",
    "id, club_id, event_id, match_type, opponent_name, home_score, away_score, status, created_at, updated_at",
    [records.matchIds[0]!, clubId, eventIdFor(account, "completed-match"), "friendly", "Secure Demo Opponent " + account.slot, 4, 2, "completed", now, now]);
  insertDemoRow(database, "matches",
    "id, club_id, event_id, match_type, opponent_name, home_score, away_score, status, created_at, updated_at",
    [records.matchIds[1]!, clubId, eventIdFor(account, "scheduled-match"), "league", "Secure Demo Future Opponent " + account.slot, null, null, "scheduled", now, now]);
  account.studentIds.forEach((studentId, index) => {
    insertDemoRow(database, "match_events",
      "id, club_id, match_id, type, student_id, minute, linked_metric_id, note, created_at, updated_at",
      [records.matchEventIds[index]!, clubId, records.matchIds[0]!, ["goal", "assist", "interception", "save"][index % 4]!, studentId, 8 + index * 7, assessmentCatalog.radarMetrics[index]!.metricId, "Secure demo match event", now, now]);
  });

  const tacticalPositions = [
    ["GK", 0.5, 0.08], ["LB", 0.2, 0.28], ["CB", 0.4, 0.24], ["RB", 0.72, 0.3],
    ["CM", 0.32, 0.5], ["CM", 0.54, 0.5], ["LW", 0.18, 0.74], ["ST", 0.56, 0.78],
  ] as const;
  insertDemoRow(database, "tactical_boards",
    "id, club_id, event_id, formation_name, pitch_type, players_json, updated_by_coach_id, created_at, updated_at",
    [records.tacticalBoardIds[0]!, clubId, eventIdFor(account, "scheduled-match"), "4-3-3", "full",
      JSON.stringify(account.studentIds.map((studentId, index) => ({
        studentId,
        displayName: "Secure player " + account.slot + "-" + (index + 1),
        role: "starter",
        positionLabel: tacticalPositions[index]![0],
        x: tacticalPositions[index]![1],
        y: tacticalPositions[index]![2],
      }))), account.coachId, now, now]);

  account.studentIds.slice(0, 2).forEach((studentId, index) => {
    insertDemoRow(database, "student_operational_profiles",
      "id, club_id, student_id, region, school, acquisition_channel, student_status, communication_stage, responsible_coach_id, insurance_expires_at, total_checkins, latest_checkin_at, total_recharges, lesson_balance, notes, created_at, updated_at",
      [records.operationalProfileIds[index]!, clubId, studentId, "重庆", "Secure Demo School " + (index + 1), "secure_demo", "active", index === 0 ? "training_follow_up" : "assessment_complete", account.coachId, shiftIso(now, 365, 0).slice(0, 10), 18 + index * 3, shiftIso(now, -14, 2), 2, 11 - index, "Secure demo operational profile", now, now]);
    insertDemoRow(database, "insurance_policies",
      "id, club_id, student_id, purchased_at, expires_at, policy_number, provider, sport, approved, review_status, source, source_id, actor_user_id, external_ref, note, created_at, updated_at",
      [records.insurancePolicyIds[index]!, clubId, studentId, shiftIso(now, -120, 0).slice(0, 10), shiftIso(now, 365, 0).slice(0, 10), "SECURE-DEMO-" + account.slot + "-" + (index + 1), "Secure Demo Insurance", "football", 1, "approved", "secure_demo", "secure-demo-insurance-" + account.slot + "-" + (index + 1), account.userId, "secure-demo-insurance-" + account.slot + "-" + (index + 1), "Secure demo insurance policy", now, now]);
    insertDemoRow(database, "private_lesson_requests",
      "id, club_id, student_id, coach_name, date, time_slot, goals_json, note, status, requested_by_user_id, created_at, updated_at",
      [records.privateLessonRequestIds[index]!, clubId, studentId, "Secure coach " + account.slot, shiftIso(now, 9 + index, 0).slice(0, 10), "18:00-19:00", JSON.stringify(index === 0 ? ["first_touch", "passing"] : ["confidence", "shooting"]), "Secure demo private lesson request", "pending", account.userId, now, now]);
    [0, 1].forEach((entry) => {
      insertDemoRow(database, "communication_logs",
        "id, club_id, student_id, occurred_at, channel, stage, contact_name, operator_user_id, summary, next_follow_up_at, created_at, updated_at",
        [records.communicationLogIds[index * 2 + entry]!, clubId, studentId, shiftIso(now, -7 + entry * 3, 0), "wechat", entry === 0 ? "training_feedback" : "follow_up", "Secure parent " + account.slot, account.userId, entry === 0 ? "Secure demo training feedback sent." : "Secure demo follow-up confirmed.", shiftIso(now, 7 + entry, 0), now, now]);
    });
  });
}

type DemoEvent = {
  id: string;
  type: "training" | "match";
  title: string;
  startsAt: string;
  endsAt: string;
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

function buildDemoEvents(account: SecureCqTalentTestAccountManifestEntry, now: string): DemoEvent[] {
  return [
    { id: account.eventId, type: "training", title: "本周技术训练 · 演示 " + account.slot, startsAt: shiftIso(now, 0, 2), endsAt: shiftIso(now, 0, 4), status: "scheduled", notes: "Secure demo current technical training.", participantStatuses: ["confirmed", "confirmed", "invited", "confirmed", "confirmed", "invited", "confirmed", "confirmed"] },
    { id: eventIdFor(account, "history-training"), type: "training", title: "基础技术训练 · 演示回顾 " + account.slot, startsAt: shiftIso(now, -14, 0), endsAt: shiftIso(now, -14, 2), status: "completed", notes: "Secure demo historical training with attendance.", participantStatuses: ["present", "late", "absent", "leave_requested", "present", "excused", "present", "present"] },
    { id: eventIdFor(account, "future-training"), type: "training", title: "下周进攻训练 · 演示预告 " + account.slot, startsAt: shiftIso(now, 4, 1), endsAt: shiftIso(now, 4, 3), status: "scheduled", notes: "Secure demo future training.", participantStatuses: ["confirmed", "invited", "confirmed", "confirmed", "invited", "confirmed", "confirmed", "confirmed"] },
    { id: eventIdFor(account, "completed-match"), type: "match", title: "周末友谊赛 · 演示战报 " + account.slot, startsAt: shiftIso(now, -10, 0), endsAt: shiftIso(now, -10, 2), status: "completed", notes: "Secure demo completed match.", participantStatuses: ["present", "present", "present", "late", "present", "present", "present", "present"] },
    { id: eventIdFor(account, "scheduled-match"), type: "match", title: "周末联赛 · 演示排兵 " + account.slot, startsAt: shiftIso(now, 8, 0), endsAt: shiftIso(now, 8, 2), status: "scheduled", notes: "Secure demo scheduled match with tactical board.", participantStatuses: ["confirmed", "confirmed", "confirmed", "invited", "confirmed", "confirmed", "confirmed", "confirmed"] },
  ];
}

function demoRecordIds(account: SecureCqTalentTestAccountManifestEntry) {
  const eventIds = getSecureCqTalentTestAccountEventIds(account);
  const participantIds = eventIds.flatMap((eventId) => account.studentIds.map((_, index) => participantIdForEvent(account, eventId, index)));
  return {
    eventIds,
    participantIds,
    lessonLedgerIds: account.studentIds.flatMap((_, index) => [
      "lesson-ledger-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-credit",
      "lesson-ledger-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-debit",
    ]),
    assessmentIds: account.studentIds.map((_, index) => "assessment-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    assessmentRawResultIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "assessment-raw-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    assessmentScoreIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "assessment-score-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    metricRecordIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "metric-record-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    metricLineageIds: account.studentIds.flatMap((_, studentIndex) => Array.from({ length: demoMetricCount }, (_, metricIndex) => "metric-lineage-cq-talent-secure-test-" + account.slot + "-" + (studentIndex + 1) + "-" + (metricIndex + 1))),
    matchIds: ["match-cq-talent-secure-test-" + account.slot + "-completed", "match-cq-talent-secure-test-" + account.slot + "-scheduled"],
    matchEventIds: account.studentIds.map((_, index) => "match-event-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    tacticalBoardIds: ["tactical-board-cq-talent-secure-test-" + account.slot + "-scheduled"],
    operationalProfileIds: account.studentIds.slice(0, 2).map((_, index) => "operational-profile-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    insurancePolicyIds: account.studentIds.slice(0, 2).map((_, index) => "insurance-policy-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    privateLessonRequestIds: account.studentIds.slice(0, 2).map((_, index) => "private-lesson-cq-talent-secure-test-" + account.slot + "-" + (index + 1)),
    communicationLogIds: account.studentIds.slice(0, 2).flatMap((_, index) => ["communication-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-1", "communication-cq-talent-secure-test-" + account.slot + "-" + (index + 1) + "-2"]),
  };
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

function eventIdFor(account: SecureCqTalentTestAccountManifestEntry, key: "history-training" | "future-training" | "completed-match" | "scheduled-match"): string {
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

type Row = Record<string, string | null>;
