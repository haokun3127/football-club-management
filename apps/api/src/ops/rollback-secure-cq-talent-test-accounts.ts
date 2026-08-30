import type { DatabaseSync } from "node:sqlite";
import {
  assertCompleteSecureCqTalentTestAccountInstallation,
  createSecureCqTalentTestAccountManifest,
  getSecureCqTalentTestAccountEventIds,
  type SecureCqTalentTestAccountManifest,
} from "./secure-cq-talent-test-accounts.js";

export interface SecureCqTalentTestAccountRollbackResult {
  status: "rolled_back";
  accountCount: number;
}

export function rollbackSecureCqTalentTestAccounts(
  database: DatabaseSync,
  manifest: SecureCqTalentTestAccountManifest,
): SecureCqTalentTestAccountRollbackResult {
  validateRollbackManifest(manifest);
  database.exec("BEGIN IMMEDIATE;");
  try {
    assertCompleteSecureCqTalentTestAccountInstallation(database, manifest);
    const users = manifest.accountIds.map((account) => account.userId);
    const memberships = manifest.accountIds.map((account) => account.membershipId);
    const parents = manifest.accountIds.map((account) => account.parentId);
    const coaches = manifest.accountIds.map((account) => account.coachId);
    const teams = manifest.accountIds.map((account) => account.teamId);
    const events = manifest.accountIds.flatMap((account) => getSecureCqTalentTestAccountEventIds(account));
    const students = manifest.accountIds.flatMap((account) => account.studentIds);
    const placeholders = (items: string[]) => items.map(() => "?").join(", ");
    const sideEffects = manifest.sideEffects ?? {};
    const club = "club-chongqing-talent";
    const clubValues = (items: string[]) => [club, ...items];
    const removeByClub = (table: string, column: string, items: string[]) => {
      if (!items.length) return;
      database.prepare(`DELETE FROM ${table} WHERE club_id = ? AND ${column} IN (${placeholders(items)})`).run(...clubValues(items));
    };
    const removeById = (table: string, column: string, items: string[]) => {
      if (!items.length) return;
      database.prepare(`DELETE FROM ${table} WHERE ${column} IN (${placeholders(items)})`).run(...items);
    };

    removeById("http_idempotency_records", "key", sideEffects.httpIdempotencyKeys ?? []);
    removeByClub("app_client_sessions", "id", sideEffects.appClientSessionIds ?? []);
    removeByClub("app_client_sessions", "user_id", users);
    removeByClub("privacy_audit_logs", "actor_user_id", users);
    removeByClub("consent_events", "actor_user_id", users);
    removeByClub("student_consent_records", "guardian_user_id", users);
    removeByClub("privacy_requests", "requested_by_user_id", users);
    removeByClub("privacy_requests", "resolved_by_user_id", users);
    removeByClub("privacy_requests", "student_id", students);
    removeByClub("custom_field_values", "target_id", students);
    removeByClub("communication_logs", "student_id", students);
    removeByClub("insurance_policies", "student_id", students);
    removeByClub("student_operational_profiles", "student_id", students);
    removeByClub("payment_reviews", "payment_event_id", paymentIdsForStudents(database, students));
    removeByClub("payment_events", "student_id", students);
    removeByClub("lesson_credit_ledger", "id", sideEffects.lessonLedgerIds ?? []);
    removeByClub("lesson_credit_ledger", "student_id", students);
    removeByClub("lesson_credit_ledger", "event_id", events);
    removeByClub("lesson_credit_ledger", "actor_user_id", users);
    removeByClub("metric_lineages", "id", sideEffects.metricLineageIds ?? []);
    removeByClub("metric_lineages", "output_record_id", metricRecordIds(database, club, students, events, coaches, sideEffects));
    removeByClub("assessment_scores", "id", sideEffects.assessmentScoreIds ?? []);
    removeByClub("assessment_raw_results", "id", sideEffects.assessmentRawResultIds ?? []);
    removeByClub("assessment_scores", "assessment_id", assessmentIds(database, club, students, events, coaches, sideEffects));
    removeByClub("assessment_raw_results", "assessment_id", assessmentIds(database, club, students, events, coaches, sideEffects));
    removeByClub("player_metric_records", "id", metricRecordIds(database, club, students, events, coaches, sideEffects));
    removeByClub("player_assessments", "id", assessmentIds(database, club, students, events, coaches, sideEffects));
    removeByClub("match_events", "id", sideEffects.matchEventIds ?? []);
    removeByClub("match_events", "match_id", matchIds(database, club, events, sideEffects));
    removeByClub("match_rosters", "match_id", matchIds(database, club, events, sideEffects));
    removeByClub("matches", "id", sideEffects.matchIds ?? []);
    removeByClub("matches", "event_id", events);
    removeByClub("private_lesson_requests", "id", sideEffects.privateLessonRequestIds ?? []);
    removeByClub("private_lesson_requests", "student_id", students);
    removeByClub("private_lesson_requests", "requested_by_user_id", users);
    removeByClub("event_change_requests", "id", sideEffects.eventChangeRequestIds ?? []);
    removeByClub("event_change_requests", "event_id", events);
    removeByClub("event_change_requests", "requested_by_user_id", users);
    removeByClub("tactical_boards", "id", sideEffects.tacticalBoardIds ?? []);
    removeByClub("tactical_boards", "event_id", events);
    removeByClub("tactical_boards", "updated_by_coach_id", coaches);
    removeByClub("event_participants", "event_id", events);
    removeByClub("calendar_events", "id", events);
    removeByClub("student_contacts", "student_id", students);
    removeByClub("student_guardian_bindings", "parent_id", parents);
    removeByClub("student_guardian_bindings", "student_id", students);
    removeByClub("team_members", "team_id", teams);
    removeByClub("teams", "id", teams);
    removeByClub("coach_profiles", "id", coaches);
    removeByClub("student_profiles", "id", students);
    removeByClub("parent_profiles", "id", parents);
    removeByClub("club_user_memberships", "id", memberships);
    removeById("user_accounts", "id", users);
    database.exec("COMMIT;");
    return { status: "rolled_back", accountCount: manifest.accountIds.length };
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function validateRollbackManifest(manifest: SecureCqTalentTestAccountManifest): void {
  const expectedAccountIds = createSecureCqTalentTestAccountManifest().accountIds;
  if (
    manifest.version !== 2
    || manifest.clubId !== "club-chongqing-talent"
    || manifest.appClientId !== "app-client-cq-talent-wechat-main"
    || JSON.stringify(manifest.accountIds) !== JSON.stringify(expectedAccountIds)
  ) {
    throw new Error("Unsupported secure test-account rollback manifest.");
  }
  validateSideEffectNamespaces(manifest.sideEffects);
}

function validateSideEffectNamespaces(
  sideEffects: SecureCqTalentTestAccountManifest["sideEffects"],
): void {
  if (!sideEffects) return;
  const prefixes: Record<keyof NonNullable<SecureCqTalentTestAccountManifest["sideEffects"]>, string> = {
    appClientSessionIds: "session-cq-talent-secure-test-",
    httpIdempotencyKeys: "cq-talent-secure-test-",
    lessonLedgerIds: "lesson-ledger-cq-talent-secure-test-",
    privateLessonRequestIds: "private-lesson-cq-talent-secure-test-",
    eventChangeRequestIds: "event-change-cq-talent-secure-test-",
    tacticalBoardIds: "tactical-board-cq-talent-secure-test-",
    assessmentIds: "assessment-cq-talent-secure-test-",
    assessmentRawResultIds: "assessment-raw-cq-talent-secure-test-",
    assessmentScoreIds: "assessment-score-cq-talent-secure-test-",
    metricRecordIds: "metric-record-cq-talent-secure-test-",
    metricLineageIds: "metric-lineage-cq-talent-secure-test-",
    matchIds: "match-cq-talent-secure-test-",
    matchRosterIds: "match-roster-cq-talent-secure-test-",
    matchEventIds: "match-event-cq-talent-secure-test-",
  };
  for (const [key, prefix] of Object.entries(prefixes) as Array<[keyof typeof prefixes, string]>) {
    if (sideEffects[key]?.some((id) => !id.startsWith(prefix))) {
      throw new Error("Unsupported secure test-account rollback manifest.");
    }
  }
}

function paymentIdsForStudents(database: DatabaseSync, students: string[]): string[] {
  if (!students.length) return [];
  const placeholders = students.map(() => "?").join(", ");
  return (database.prepare(
    `SELECT id FROM payment_events WHERE club_id = ? AND student_id IN (${placeholders})`,
  ).all("club-chongqing-talent", ...students) as Array<{ id: string }>).map((row) => row.id);
}

function assessmentIds(
  database: DatabaseSync,
  clubId: string,
  students: string[],
  events: string[],
  coaches: string[],
  sideEffects: NonNullable<SecureCqTalentTestAccountManifest["sideEffects"]>,
): string[] {
  const ids = new Set(sideEffects.assessmentIds ?? []);
  const filters: string[] = [];
  const values: string[] = [clubId];
  if (students.length) {
    filters.push(`student_id IN (${students.map(() => "?").join(", ")})`);
    values.push(...students);
  }
  if (events.length) {
    filters.push(`event_id IN (${events.map(() => "?").join(", ")})`);
    values.push(...events);
  }
  if (coaches.length) {
    filters.push(`assessed_by_coach_id IN (${coaches.map(() => "?").join(", ")})`);
    values.push(...coaches);
  }
  if (filters.length) {
    const rows = database.prepare(`SELECT id FROM player_assessments WHERE club_id = ? AND (${filters.join(" OR ")})`).all(...values) as Array<{ id: string }>;
    rows.forEach((row) => ids.add(row.id));
  }
  return [...ids];
}

function metricRecordIds(
  database: DatabaseSync,
  clubId: string,
  students: string[],
  events: string[],
  coaches: string[],
  sideEffects: NonNullable<SecureCqTalentTestAccountManifest["sideEffects"]>,
): string[] {
  const ids = new Set(sideEffects.metricRecordIds ?? []);
  const filters: string[] = [];
  const values: string[] = [clubId];
  if (students.length) {
    filters.push(`student_id IN (${students.map(() => "?").join(", ")})`);
    values.push(...students);
  }
  if (events.length) {
    filters.push(`event_id IN (${events.map(() => "?").join(", ")})`);
    values.push(...events);
  }
  if (coaches.length) {
    filters.push(`recorded_by_coach_id IN (${coaches.map(() => "?").join(", ")})`);
    values.push(...coaches);
  }
  if (filters.length) {
    const rows = database.prepare(`SELECT id FROM player_metric_records WHERE club_id = ? AND (${filters.join(" OR ")})`).all(...values) as Array<{ id: string }>;
    rows.forEach((row) => ids.add(row.id));
  }
  return [...ids];
}

function matchIds(
  database: DatabaseSync,
  clubId: string,
  events: string[],
  sideEffects: NonNullable<SecureCqTalentTestAccountManifest["sideEffects"]>,
): string[] {
  const ids = new Set(sideEffects.matchIds ?? []);
  if (!events.length) return [...ids];
  const placeholders = events.map(() => "?").join(", ");
  const rows = database.prepare(`SELECT id FROM matches WHERE club_id = ? AND event_id IN (${placeholders})`).all(clubId, ...events) as Array<{ id: string }>;
  rows.forEach((row) => ids.add(row.id));
  return [...ids];
}
