import type {
  AbilityMetric,
  AssessmentMetricBinding,
  AssessmentTemplate,
  AssessmentTemplateVersion,
  AssessmentTestItem,
  CatalogScope,
  EntityId,
  MetricDependency,
  MetricGraphVersion,
  MetricView,
  MetricViewNode,
  PrivacyAuditLog,
  PrivacyFieldPolicy,
  PrivacyNoticeVersion,
  PrivacyRequest,
  PrivacyRetentionPolicy,
  StudentConsentRecord,
} from "@football-club/domain";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type {
  ConfirmExternalRecordInput,
  ClubAppClient,
  DataCapabilityConfig,
  ExternalFieldMapping,
  ExternalRawRecord,
  ExternalRecordLink,
  ExternalSyncRun,
  ExternalSyncPolicy,
  ExternalSystemConnection,
  ExternalTableMapping,
  HttpIdempotencyRecord,
  InsurancePolicy,
  InsurancePolicyInput,
  InsurancePolicySummary,
  ImportPreview,
  ImportPreviewFilters,
  LessonAdjustmentInput,
  LessonLedgerEntry,
  LessonLedgerSummary,
  StudentDetail,
  StudentListFilters,
  StudentListItem,
  StudentOperationalStatusSummary,
  SyncRunDetail,
} from "../data-capability/types.js";

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

function optionalNumber(row: SqlRow, key: string): number | undefined {
  const value = row[key];

  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "number") {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function numberFromSql(row: SqlRow, key: string): number {
  const value = row[key];

  if (typeof value !== "number") {
    throw new Error(`Expected ${key} to be a number.`);
  }

  return value;
}

function booleanFromSql(value: unknown): boolean {
  return value === 1 || value === true;
}

function booleanToSql(value: boolean | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  return value ? 1 : 0;
}

function deriveLessonBalance(entries: LessonLedgerEntry[]): number {
  return [...entries]
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.id.localeCompare(right.id))
    .reduce((balance, entry) =>
      entry.entryType === "external_snapshot" && entry.balanceAfter !== undefined
        ? entry.balanceAfter
        : balance + entry.lessonDelta,
    0);
}

function latestLessonLedgerEntry(entries: LessonLedgerEntry[]): LessonLedgerEntry | undefined {
  return [...entries].sort((left, right) =>
    Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
    || Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
    || left.id.localeCompare(right.id),
  )[0];
}

function insuranceReviewStatus(row: SqlRow): InsurancePolicy["reviewStatus"] {
  const explicit = optionalString(row, "review_status");
  if (explicit === "pending" || explicit === "approved" || explicit === "rejected") {
    return explicit;
  }

  if (row.approved === null || row.approved === undefined) {
    return "pending";
  }

  return booleanFromSql(row.approved) ? "approved" : "rejected";
}

function deriveInsuranceCurrentStatus(
  policy: Pick<InsurancePolicy, "expiresAt" | "reviewStatus"> | undefined,
  now = new Date(),
): InsurancePolicy["currentStatus"] {
  if (!policy) {
    return "unknown";
  }

  if (policy.reviewStatus !== "approved") {
    return "pending";
  }

  return Date.parse(policy.expiresAt) >= Date.parse(now.toISOString().slice(0, 10)) ? "active" : "expired";
}

function validateLessonAdjustment(input: LessonAdjustmentInput): void {
  if (input.entryType === "credit" && input.source !== "offline_recharge") {
    throw new Error("Lesson credits must come from confirmed offline recharge.");
  }

  if (input.entryType === "debit" && input.source !== "attendance") {
    throw new Error("Lesson debits must come from confirmed attendance.");
  }

  if (input.entryType === "adjustment" && input.source !== "manual_adjustment") {
    throw new Error("Manual lesson corrections must use manual_adjustment source.");
  }

  if (input.entryType === "credit" && input.lessonDelta <= 0) {
    throw new Error("Lesson credit delta must be positive.");
  }

  if (input.entryType === "debit" && input.lessonDelta >= 0) {
    throw new Error("Lesson debit delta must be negative.");
  }

  if (input.entryType === "adjustment" && input.lessonDelta === 0) {
    throw new Error("Lesson adjustment delta cannot be zero.");
  }
}

function jsonObject(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  const parsed: unknown = JSON.parse(value);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function jsonArray(value: string | undefined): unknown[] | undefined {
  if (!value) {
    return undefined;
  }

  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array.");
  }

  return parsed;
}

function jsonRecordArray(value: string | undefined): Array<Record<string, unknown>> | undefined {
  const parsed = jsonArray(value);
  if (!parsed) {
    return undefined;
  }
  if (!parsed.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    throw new Error("Expected JSON object array.");
  }

  return parsed as Array<Record<string, unknown>>;
}

function booleanRecord(value: string | undefined): Record<string, boolean> | undefined {
  const parsed = jsonObject(value);
  if (!parsed) {
    return undefined;
  }
  for (const [key, flag] of Object.entries(parsed)) {
    if (typeof flag !== "boolean") {
      throw new Error(`Expected ${key} to be a boolean.`);
    }
  }

  return parsed as Record<string, boolean>;
}

function stringArrayRecord(value: string | undefined): Record<string, string[]> | undefined {
  const parsed = jsonObject(value);
  if (!parsed) {
    return undefined;
  }
  for (const [key, items] of Object.entries(parsed)) {
    if (!Array.isArray(items) || !items.every((item) => typeof item === "string")) {
      throw new Error(`Expected ${key} to be a string array.`);
    }
  }

  return parsed as Record<string, string[]>;
}

function catalogScope(row: SqlRow): CatalogScope {
  const scope = requireString(row, "catalog_scope") as CatalogScope["scope"];

  if (scope === "club") {
    return {
      scope,
      clubId: requireString(row, "scope_club_id"),
    };
  }

  return { scope: "system" };
}

function catalogScopeValues(scope: CatalogScope): [CatalogScope["scope"], string | null, string | null] {
  return scope.scope === "club"
    ? [scope.scope, scope.clubId, scope.baseItemId ?? null]
    : [scope.scope, null, null];
}

export class DataCapabilityRepository {
  constructor(private readonly database: DatabaseSync) {}

  getHttpIdempotencyRecord(key: string): HttpIdempotencyRecord | null {
    const row = this.database.prepare(`
      SELECT * FROM http_idempotency_records
      WHERE key = ? AND expires_at > ?
    `).get(key, new Date().toISOString()) as SqlRow | undefined;

    return row ? mapHttpIdempotencyRecord(row) : null;
  }

  saveHttpIdempotencyRecord(record: HttpIdempotencyRecord): void {
    this.database.prepare(`
      INSERT INTO http_idempotency_records (
        key, fingerprint, status_code, payload, content_type, created_at, expires_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        fingerprint = excluded.fingerprint,
        status_code = excluded.status_code,
        payload = excluded.payload,
        content_type = excluded.content_type,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
    `).run(
      record.key,
      record.fingerprint,
      record.statusCode,
      record.payload,
      record.contentType ?? null,
      record.createdAt,
      record.expiresAt,
    );
  }

  pruneHttpIdempotencyRecords(now: string): void {
    this.database.prepare(`
      DELETE FROM http_idempotency_records
      WHERE expires_at <= ?
    `).run(now);
  }

  listExternalConnections(clubId: EntityId): ExternalSystemConnection[] {
    const rows = this.database.prepare(`
      SELECT * FROM external_system_connections
      WHERE club_id = ?
      ORDER BY name
    `).all(clubId) as SqlRow[];

    return rows.map(mapExternalConnection);
  }

  listClubAppClients(clubId: EntityId): ClubAppClient[] {
    const rows = this.database.prepare(`
      SELECT * FROM club_app_clients
      WHERE club_id = ?
      ORDER BY channel, name
    `).all(clubId) as SqlRow[];

    return rows.map(mapClubAppClient);
  }

  findActiveClubAppClient(input: { appId?: string; clientKey?: string }): ClubAppClient | null {
    if (!input.appId && !input.clientKey) {
      return null;
    }

    const clauses = ["status = 'active'"];
    const params: SQLInputValue[] = [];
    if (input.appId) {
      clauses.push("app_id = ?");
      params.push(input.appId);
    }
    if (input.clientKey) {
      clauses.push("client_key = ?");
      params.push(input.clientKey);
    }

    const row = this.database.prepare(`
      SELECT * FROM club_app_clients
      WHERE ${clauses.join(" AND ")}
      ORDER BY updated_at DESC
      LIMIT 1
    `).get(...params) as SqlRow | undefined;

    return row ? mapClubAppClient(row) : null;
  }

  listExternalTableMappings(clubId: EntityId): ExternalTableMapping[] {
    const rows = this.database.prepare(`
      SELECT * FROM external_table_mappings
      WHERE club_id = ?
      ORDER BY external_table_key, mapping_version
    `).all(clubId) as SqlRow[];

    return rows.map(mapExternalTableMapping);
  }

  listExternalFieldMappings(clubId: EntityId): ExternalFieldMapping[] {
    const rows = this.database.prepare(`
      SELECT * FROM external_field_mappings
      WHERE club_id = ?
      ORDER BY table_mapping_id, external_field_key
    `).all(clubId) as SqlRow[];

    return rows.map(mapExternalFieldMapping);
  }

  listPrivacyFieldPolicies(clubId: EntityId): PrivacyFieldPolicy[] {
    const rows = this.database.prepare(`
      SELECT * FROM privacy_field_policies
      WHERE club_id = ? AND active = 1
      ORDER BY field_key
    `).all(clubId) as SqlRow[];

    return rows.map(mapPrivacyFieldPolicy);
  }

  listPrivacyNoticeVersions(clubId: EntityId): PrivacyNoticeVersion[] {
    const rows = this.database.prepare(`
      SELECT * FROM privacy_notice_versions
      WHERE club_id = ?
      ORDER BY active DESC, effective_at DESC, version DESC
    `).all(clubId) as SqlRow[];

    return rows.map(mapPrivacyNoticeVersion);
  }

  listPrivacyRetentionPolicies(clubId: EntityId): PrivacyRetentionPolicy[] {
    const rows = this.database.prepare(`
      SELECT * FROM privacy_retention_policies
      WHERE club_id = ? AND active = 1
      ORDER BY category
    `).all(clubId) as SqlRow[];

    return rows.map(mapPrivacyRetentionPolicy);
  }

  listStudentConsentRecords(clubId: EntityId, studentId: EntityId): StudentConsentRecord[] {
    const rows = this.database.prepare(`
      SELECT * FROM student_consent_records
      WHERE club_id = ? AND student_id = ?
      ORDER BY scope
    `).all(clubId, studentId) as SqlRow[];

    return rows.map(mapStudentConsentRecord);
  }

  listPrivacyAuditLogs(clubId: EntityId): PrivacyAuditLog[] {
    const rows = this.database.prepare(`
      SELECT * FROM privacy_audit_logs
      WHERE club_id = ?
      ORDER BY created_at DESC
    `).all(clubId) as SqlRow[];

    return rows.map(mapPrivacyAuditLog);
  }

  listPrivacyRequests(clubId: EntityId, studentId?: EntityId): PrivacyRequest[] {
    const rows = this.database.prepare(`
      SELECT * FROM privacy_requests
      WHERE club_id = ? AND (? IS NULL OR student_id = ?)
      ORDER BY requested_at DESC, id DESC
    `).all(clubId, studentId ?? null, studentId ?? null) as SqlRow[];

    return rows.map(mapPrivacyRequest);
  }

  listExternalSyncPolicies(clubId: EntityId): ExternalSyncPolicy[] {
    const rows = this.database.prepare(`
      SELECT * FROM external_sync_policies
      WHERE club_id = ?
      ORDER BY name
    `).all(clubId) as SqlRow[];

    return rows.map(mapExternalSyncPolicy);
  }

  getExternalSyncPolicy(clubId: EntityId, policyId: EntityId): ExternalSyncPolicy | null {
    const row = this.database.prepare(`
      SELECT * FROM external_sync_policies
      WHERE club_id = ? AND id = ?
    `).get(clubId, policyId) as SqlRow | undefined;

    return row ? mapExternalSyncPolicy(row) : null;
  }

  listSyncRuns(clubId: EntityId): ExternalSyncRun[] {
    const rows = this.database.prepare(`
      SELECT * FROM external_sync_runs
      WHERE club_id = ?
      ORDER BY created_at DESC
    `).all(clubId) as SqlRow[];

    return rows.map(mapExternalSyncRun);
  }

  getSyncRunDetail(clubId: EntityId, syncRunId: EntityId): SyncRunDetail | null {
    const syncRunRow = this.database.prepare(`
      SELECT * FROM external_sync_runs
      WHERE club_id = ? AND id = ?
    `).get(clubId, syncRunId) as SqlRow | undefined;

    if (!syncRunRow) {
      return null;
    }

    const rawRows = this.database.prepare(`
      SELECT * FROM external_raw_records
      WHERE club_id = ? AND sync_run_id = ?
      ORDER BY external_record_id
    `).all(clubId, syncRunId) as SqlRow[];
    const rawRecords = rawRows.map(mapExternalRawRecord);
    const invalidRecords = rawRecords.filter((record) => record.validationErrors?.length).length;

    return {
      syncRun: mapExternalSyncRun(syncRunRow),
      rawRecords,
      validationSummary: {
        totalRecords: rawRecords.length,
        validRecords: rawRecords.length - invalidRecords,
        invalidRecords,
        pendingRecords: rawRecords.filter((record) => record.reviewStatus === "pending").length,
        confirmedRecords: rawRecords.filter((record) => record.reviewStatus === "confirmed" || record.reviewStatus === "linked").length,
        rejectedRecords: rawRecords.filter((record) => record.reviewStatus === "rejected").length,
      },
    };
  }

  listStudents(clubId: EntityId, filters: StudentListFilters = {}): StudentListItem[] {
    const where = ["s.club_id = ?"];
    const params: SQLInputValue[] = [clubId];

    if (filters.studentStatus) {
      where.push("op.student_status = ?");
      params.push(filters.studentStatus);
    }

    if (filters.school) {
      where.push("op.school = ?");
      params.push(filters.school);
    }

    if (filters.coachId) {
      where.push(`(
        op.responsible_coach_id = ?
        OR EXISTS (
          SELECT 1 FROM team_members tm
          JOIN teams t ON t.id = tm.team_id AND t.club_id = tm.club_id
          WHERE tm.club_id = s.club_id
            AND tm.student_id = s.id
            AND tm.status = 'active'
            AND t.default_coach_id = ?
        )
      )`);
      params.push(filters.coachId, filters.coachId);
    }

    if (filters.teamId) {
      where.push(`EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.club_id = s.club_id
          AND tm.student_id = s.id
          AND tm.team_id = ?
          AND tm.status = 'active'
      )`);
      params.push(filters.teamId);
    }

    if (filters.insuranceExpiringSoon) {
      where.push("op.insurance_expires_at IS NOT NULL AND op.insurance_expires_at <= date('now', '+30 days')");
    }

    if (filters.lessonBalanceLow) {
      where.push("op.lesson_balance IS NOT NULL AND op.lesson_balance <= 4");
    }

    const rows = this.database.prepare(`
      SELECT s.id
      FROM student_profiles s
      LEFT JOIN student_operational_profiles op
        ON op.club_id = s.club_id AND op.student_id = s.id
      WHERE ${where.join(" AND ")}
      ORDER BY s.name, s.id
    `).all(...params) as SqlRow[];

    return rows
      .map((row) => this.getStudentDetail(clubId, requireString(row, "id")))
      .filter((detail): detail is StudentDetail => Boolean(detail));
  }

  getStudentDetail(clubId: EntityId, studentId: EntityId): StudentDetail | null {
    const student = this.database.prepare(`
      SELECT * FROM student_profiles
      WHERE club_id = ? AND id = ?
    `).get(clubId, studentId) as SqlRow | undefined;

    if (!student) {
      return null;
    }

    const operationalProfile = this.database.prepare(`
      SELECT * FROM student_operational_profiles
      WHERE club_id = ? AND student_id = ?
    `).get(clubId, studentId) as SqlRow | undefined;
    const contacts = this.database.prepare(`
      SELECT * FROM student_contacts
      WHERE club_id = ? AND student_id = ?
      ORDER BY is_primary_contact DESC, id
    `).all(clubId, studentId) as SqlRow[];
    const teams = this.database.prepare(`
      SELECT
        tm.id,
        tm.team_id,
        t.name,
        t.age_group,
        t.level,
        t.default_coach_id,
        c.name AS default_coach_name,
        tm.starts_at,
        tm.ends_at,
        tm.is_primary_team,
        tm.status
      FROM team_members tm
      JOIN teams t ON t.club_id = tm.club_id AND t.id = tm.team_id
      LEFT JOIN coach_profiles c ON c.club_id = t.club_id AND c.id = t.default_coach_id
      WHERE tm.club_id = ? AND tm.student_id = ?
      ORDER BY tm.is_primary_team DESC, tm.starts_at DESC
    `).all(clubId, studentId) as SqlRow[];
    const lessonLedger = this.database.prepare(`
      SELECT * FROM lesson_credit_ledger
      WHERE club_id = ? AND student_id = ?
      ORDER BY occurred_at DESC, id DESC
    `).all(clubId, studentId) as SqlRow[];
    const insurancePolicies = this.database.prepare(`
      SELECT * FROM insurance_policies
      WHERE club_id = ? AND student_id = ?
      ORDER BY expires_at DESC, id DESC
    `).all(clubId, studentId) as SqlRow[];
    const op = operationalProfile ? mapOperationalProfile(operationalProfile) : undefined;
    const latestInsurance = insurancePolicies[0] ? mapInsurancePolicy(insurancePolicies[0]) : undefined;
    const primaryContact = contacts.find((contact) => booleanFromSql(contact.is_primary_contact));

    return {
      id: requireString(student, "id"),
      clubId: requireString(student, "club_id"),
      name: requireString(student, "name"),
      birthDate: requireString(student, "birth_date"),
      gender: optionalString(student, "gender"),
      currentLevel: optionalString(student, "current_level"),
      operationalProfile: op,
      teams: teams.map(mapStudentTeam),
      primaryContact: primaryContact ? mapStudentContact(primaryContact) : undefined,
      contacts: contacts.map(mapStudentContact),
      lessonBalance: optionalNumber(operationalProfile ?? {}, "lesson_balance"),
      lessonLedger: lessonLedger.map(mapLessonLedger),
      insuranceStatus: {
        expiresAt: op?.insuranceExpiresAt ?? latestInsurance?.expiresAt,
        approved: latestInsurance?.approved,
        policyNumber: latestInsurance?.policyNumber,
      },
      insurancePolicies: insurancePolicies.map(mapInsurancePolicy),
      attendanceSnapshot: {
        totalCheckins: op?.totalCheckins,
        latestCheckinAt: op?.latestCheckinAt,
        lessonBalance: op?.lessonBalance,
        stage: op?.communicationStage,
      },
    };
  }

  getStudentOperationalStatusSummary(clubId: EntityId, studentId: EntityId): StudentOperationalStatusSummary | null {
    const student = this.database.prepare(`
      SELECT id FROM student_profiles
      WHERE club_id = ? AND id = ?
    `).get(clubId, studentId) as SqlRow | undefined;

    if (!student) {
      return null;
    }

    const lessonLedger = this.getLessonLedger(clubId, studentId);
    const insurance = this.listInsurancePolicies(clubId, studentId);
    const latestLessonEntry = latestLessonLedgerEntry(lessonLedger?.entries ?? []);
    const latestSyncRun = this.listSyncRuns(clubId)[0];

    return {
      clubId,
      studentId,
      lessonBalance: lessonLedger ? lessonLedger.balance : undefined,
      lesson: {
        balance: lessonLedger?.balance,
        updatedAt: latestLessonEntry?.updatedAt,
        source: latestLessonEntry?.source,
        status: latestLessonEntry
          ? latestLessonEntry.source === "external_import" ? "synced" : "confirmed"
          : "unknown",
      },
      insurance: {
        ...(insurance?.current ?? { status: "unknown" as const }),
        updatedAt: insurance?.policies[0]?.updatedAt,
        source: insurance?.policies[0]?.source,
        sourceId: insurance?.policies[0]?.sourceId,
      },
      sync: latestSyncRun
        ? { latestRun: { id: latestSyncRun.id, status: latestSyncRun.status, updatedAt: latestSyncRun.updatedAt } }
        : undefined,
    };
  }

  getLessonLedger(clubId: EntityId, studentId: EntityId): LessonLedgerSummary | null {
    const student = this.database.prepare(`
      SELECT id FROM student_profiles
      WHERE club_id = ? AND id = ?
    `).get(clubId, studentId) as SqlRow | undefined;

    if (!student) {
      return null;
    }

    const rows = this.database.prepare(`
      SELECT * FROM lesson_credit_ledger
      WHERE club_id = ? AND student_id = ?
      ORDER BY occurred_at DESC, id DESC
    `).all(clubId, studentId) as SqlRow[];
    const entries = rows.map(mapLessonLedger);

    return {
      clubId,
      studentId,
      balance: deriveLessonBalance(entries),
      entries,
    };
  }

  recordLessonAdjustment(clubId: EntityId, studentId: EntityId, input: LessonAdjustmentInput, options: { id: EntityId; paymentEventId?: EntityId; now: string }): LessonLedgerSummary {
    const student = this.database.prepare(`
      SELECT id FROM student_profiles
      WHERE club_id = ? AND id = ?
    `).get(clubId, studentId) as SqlRow | undefined;

    if (!student) {
      throw new Error("Student not found for club.");
    }

    validateLessonAdjustment(input);
    const existing = this.database.prepare(`
      SELECT * FROM lesson_credit_ledger
      WHERE club_id = ? AND id = ?
    `).get(clubId, options.id) as SqlRow | undefined;

    if (existing) {
      return this.getLessonLedger(clubId, studentId) as LessonLedgerSummary;
    }

    const current = this.getLessonLedger(clubId, studentId);
    const balanceAfter = (current?.balance ?? 0) + input.lessonDelta;
    const occurredAt = input.occurredAt ?? options.now;
    const eventId = input.eventId && this.existsByClubId("calendar_events", clubId, input.eventId) ? input.eventId : undefined;
    const teamId = input.teamId && this.existsByClubId("teams", clubId, input.teamId) ? input.teamId : undefined;
    let paymentEventId: EntityId | undefined;

    if (input.entryType === "credit") {
      paymentEventId = options.paymentEventId ?? `${options.id}-payment`;
      this.database.prepare(`
        INSERT INTO payment_events (
          id, club_id, student_id, occurred_at, payment_type, amount, lesson_hours,
          status, external_ref, note, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed_offline', ?, ?, ?, ?)
      `).run(
        paymentEventId,
        clubId,
        studentId,
        occurredAt,
        input.paymentType ?? null,
        input.amount ?? null,
        input.lessonDelta,
        input.sourceId ?? null,
        input.note ?? null,
        options.now,
        options.now,
      );
    }

    this.database.prepare(`
      INSERT INTO lesson_credit_ledger (
        id, club_id, student_id, team_id, event_id, payment_event_id, occurred_at,
        entry_type, lesson_delta, balance_after, source, source_id, actor_user_id,
        note, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      options.id,
      clubId,
      studentId,
      teamId ?? null,
      eventId ?? null,
      paymentEventId ?? null,
      occurredAt,
      input.entryType,
      input.lessonDelta,
      balanceAfter,
      input.source,
      input.sourceId ?? null,
      input.actorUserId ?? null,
      input.note ?? null,
      options.now,
      options.now,
    );
    this.upsertStudentOperationalProfile({ id: input.sourceId ?? options.id, clubId, normalizedPreview: {} } as ExternalRawRecord, studentId, options.now, {
      lessonBalance: balanceAfter,
    });

    return this.getLessonLedger(clubId, studentId) as LessonLedgerSummary;
  }

  listInsurancePolicies(clubId: EntityId, studentId: EntityId): InsurancePolicySummary | null {
    const student = this.database.prepare(`
      SELECT id FROM student_profiles
      WHERE club_id = ? AND id = ?
    `).get(clubId, studentId) as SqlRow | undefined;

    if (!student) {
      return null;
    }

    const policies = (this.database.prepare(`
      SELECT * FROM insurance_policies
      WHERE club_id = ? AND student_id = ?
      ORDER BY expires_at DESC, created_at DESC, id DESC
    `).all(clubId, studentId) as SqlRow[]).map(mapInsurancePolicy);
    const current = policies[0];

    return {
      clubId,
      studentId,
      current: {
        status: current?.currentStatus ?? "unknown",
        expiresAt: current?.expiresAt,
        policyNumber: current?.policyNumber,
        reviewStatus: current?.reviewStatus,
      },
      policies,
    };
  }

  createInsurancePolicy(clubId: EntityId, studentId: EntityId, input: InsurancePolicyInput, options: { id: EntityId; now: string }): InsurancePolicySummary {
    const student = this.database.prepare(`
      SELECT id FROM student_profiles
      WHERE club_id = ? AND id = ?
    `).get(clubId, studentId) as SqlRow | undefined;

    if (!student) {
      throw new Error("Student not found for club.");
    }

    this.database.prepare(`
      INSERT INTO insurance_policies (
        id, club_id, student_id, purchased_at, expires_at, policy_number, provider,
        sport, approved, review_status, source, source_id, actor_user_id,
        external_ref, note, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      options.id,
      clubId,
      studentId,
      input.purchasedAt ?? null,
      input.expiresAt,
      input.policyNumber ?? null,
      input.provider ?? null,
      input.sport ?? null,
      booleanToSql(input.reviewStatus === "approved" ? true : input.reviewStatus === "rejected" ? false : undefined),
      input.reviewStatus,
      input.source ?? "offline_insurance",
      input.sourceId ?? null,
      input.actorUserId ?? null,
      input.sourceId ?? null,
      input.note ?? null,
      options.now,
      options.now,
    );
    this.upsertStudentOperationalProfile({ id: input.sourceId ?? options.id, clubId, normalizedPreview: {} } as ExternalRawRecord, studentId, options.now, {
      insuranceExpiresAt: input.expiresAt,
    });

    return this.listInsurancePolicies(clubId, studentId) as InsurancePolicySummary;
  }

  getImportPreview(clubId: EntityId, filters: ImportPreviewFilters = {}): ImportPreview {
    const rows = this.database.prepare(`
      SELECT * FROM external_raw_records
      WHERE club_id = ?
        AND (? IS NULL OR connection_id = ?)
        AND (? IS NULL OR table_mapping_id = ?)
        AND (? IS NULL OR review_status = ?)
      ORDER BY created_at DESC
    `).all(
      clubId,
      filters.connectionId ?? null,
      filters.connectionId ?? null,
      filters.tableMappingId ?? null,
      filters.tableMappingId ?? null,
      filters.reviewStatus ?? null,
      filters.reviewStatus ?? null,
    ) as SqlRow[];

    return {
      records: rows.map(mapExternalRawRecord),
    };
  }

  confirmExternalRecord(
    clubId: EntityId,
    rawRecordId: EntityId,
    input: ConfirmExternalRecordInput,
    options: { linkId: EntityId; now: string },
  ): ExternalRecordLink | null {
    const existing = this.database.prepare(`
      SELECT * FROM external_raw_records
      WHERE club_id = ? AND id = ?
    `).get(clubId, rawRecordId) as SqlRow | undefined;

    if (!existing) {
      return null;
    }

    const rawRecord = mapExternalRawRecord(existing);
    if (rawRecord.validationErrors?.length) {
      throw new Error("Cannot confirm external record with validation errors.");
    }

    const existingLink = this.database.prepare(`
      SELECT * FROM external_record_links
      WHERE club_id = ? AND raw_record_id = ? AND link_status = 'confirmed'
      ORDER BY confirmed_at DESC
      LIMIT 1
    `).get(clubId, rawRecordId) as SqlRow | undefined;

    if (existingLink) {
      return mapExternalRecordLink(existingLink);
    }

    const link: ExternalRecordLink = {
      id: options.linkId,
      clubId,
      rawRecordId,
      targetType: input.targetType,
      targetId: input.targetId,
      linkStatus: "confirmed",
      confirmedBy: input.confirmedBy,
      confirmedAt: options.now,
      createdAt: options.now,
      updatedAt: options.now,
    };

    this.database.exec("BEGIN");
    try {
      this.database.prepare(`
        UPDATE external_raw_records
        SET review_status = 'confirmed', updated_at = ?
        WHERE club_id = ? AND id = ?
      `).run(options.now, clubId, rawRecordId);

      this.saveExternalRecordLink(link);
      this.applyExternalRecordToCoreFacts(rawRecord, input, options.now);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return link;
  }

  getConfig(clubId: EntityId, base: Pick<DataCapabilityConfig, "featureFlags" | "policies" | "customFields">): DataCapabilityConfig {
    return {
      ...base,
      metricGraphVersions: this.listMetricGraphVersions(clubId),
      metricDependencies: this.listMetricDependencies(clubId),
      metricViews: this.listMetricViews(clubId),
      metricViewNodes: this.listMetricViewNodes(clubId),
      assessmentTemplateVersions: this.listAssessmentTemplateVersions(clubId),
      assessmentMetricBindings: this.listAssessmentMetricBindings(clubId),
      appClients: this.listClubAppClients(clubId),
      externalConnections: this.listExternalConnections(clubId),
      syncPolicies: this.listExternalSyncPolicies(clubId),
      tableMappings: this.listExternalTableMappings(clubId),
      fieldMappings: this.listExternalFieldMappings(clubId),
      privacyFieldPolicies: this.listPrivacyFieldPolicies(clubId),
      privacyNoticeVersions: this.listPrivacyNoticeVersions(clubId),
      privacyRetentionPolicies: this.listPrivacyRetentionPolicies(clubId),
    };
  }

  listMetricGraphVersions(clubId: EntityId): MetricGraphVersion[] {
    const rows = this.database.prepare(`
      SELECT * FROM metric_graph_versions
      WHERE catalog_scope = 'system' OR scope_club_id = ?
      ORDER BY name, version
    `).all(clubId) as SqlRow[];

    return rows.map(mapMetricGraphVersion);
  }

  listMetricDependencies(clubId: EntityId): MetricDependency[] {
    const rows = this.database.prepare(`
      SELECT * FROM metric_dependencies
      WHERE catalog_scope = 'system' OR scope_club_id = ?
      ORDER BY graph_version_id, output_metric_id, sort_order
    `).all(clubId) as SqlRow[];

    return rows.map(mapMetricDependency);
  }

  listMetricViews(clubId: EntityId): MetricView[] {
    const rows = this.database.prepare(`
      SELECT * FROM metric_views
      WHERE catalog_scope = 'system' OR scope_club_id = ?
      ORDER BY graph_version_id, name
    `).all(clubId) as SqlRow[];

    return rows.map(mapMetricView);
  }

  listMetricViewNodes(clubId: EntityId): MetricViewNode[] {
    const rows = this.database.prepare(`
      SELECT * FROM metric_view_nodes
      WHERE catalog_scope = 'system' OR scope_club_id = ?
      ORDER BY view_id, parent_view_node_id, sort_order
    `).all(clubId) as SqlRow[];

    return rows.map(mapMetricViewNode);
  }

  listAssessmentTemplateVersions(clubId: EntityId): AssessmentTemplateVersion[] {
    const rows = this.database.prepare(`
      SELECT * FROM assessment_template_versions
      WHERE club_id = ?
      ORDER BY template_id, version
    `).all(clubId) as SqlRow[];

    return rows.map(mapAssessmentTemplateVersion);
  }

  listAssessmentTemplates(clubId: EntityId): AssessmentTemplate[] {
    const rows = this.database.prepare(`
      SELECT * FROM assessment_templates
      WHERE catalog_scope = 'system' OR scope_club_id = ?
      ORDER BY name
    `).all(clubId) as SqlRow[];

    return rows.map(mapAssessmentTemplate);
  }

  listAssessmentMetricBindings(clubId: EntityId): AssessmentMetricBinding[] {
    const rows = this.database.prepare(`
      SELECT * FROM assessment_metric_bindings
      WHERE club_id = ?
      ORDER BY template_version_id, sort_order
    `).all(clubId) as SqlRow[];

    return rows.map(mapAssessmentMetricBinding);
  }

  listAssessmentTestItems(clubId: EntityId): AssessmentTestItem[] {
    const rows = this.database.prepare(`
      SELECT * FROM assessment_test_items
      WHERE club_id = ?
      ORDER BY name
    `).all(clubId) as SqlRow[];

    return rows.map(mapAssessmentTestItem);
  }

  saveExternalConnection(entity: ExternalSystemConnection): void {
    this.database.prepare(`
      INSERT INTO external_system_connections (
        id, club_id, provider, name, status, config_json, last_synced_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider = excluded.provider,
        name = excluded.name,
        status = excluded.status,
        config_json = excluded.config_json,
        last_synced_at = excluded.last_synced_at,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.provider,
      entity.name,
      entity.status,
      JSON.stringify(entity.config),
      entity.lastSyncedAt ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveClubAppClient(entity: ClubAppClient): void {
    this.database.prepare(`
      INSERT INTO club_app_clients (
        id, club_id, channel, name, status, app_id, client_key, theme_json,
        navigation_json, role_entrypoints_json, feature_overrides_json, visibility_json,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        channel = excluded.channel,
        name = excluded.name,
        status = excluded.status,
        app_id = excluded.app_id,
        client_key = excluded.client_key,
        theme_json = excluded.theme_json,
        navigation_json = excluded.navigation_json,
        role_entrypoints_json = excluded.role_entrypoints_json,
        feature_overrides_json = excluded.feature_overrides_json,
        visibility_json = excluded.visibility_json,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.channel,
      entity.name,
      entity.status,
      entity.appId ?? null,
      entity.clientKey,
      entity.theme ? JSON.stringify(entity.theme) : null,
      entity.navigation ? JSON.stringify(entity.navigation) : null,
      entity.roleEntrypoints ? JSON.stringify(entity.roleEntrypoints) : null,
      entity.featureOverrides ? JSON.stringify(entity.featureOverrides) : null,
      entity.visibility ? JSON.stringify(entity.visibility) : null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveExternalTableMapping(entity: ExternalTableMapping): void {
    this.database.prepare(`
      INSERT INTO external_table_mappings (
        id, club_id, connection_id, external_table_key, target_type, mapping_version, status, config_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        external_table_key = excluded.external_table_key,
        target_type = excluded.target_type,
        mapping_version = excluded.mapping_version,
        status = excluded.status,
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.connectionId,
      entity.externalTableKey,
      entity.targetType,
      entity.mappingVersion,
      entity.status,
      entity.config ? JSON.stringify(entity.config) : null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveExternalFieldMapping(entity: ExternalFieldMapping): void {
    this.database.prepare(`
      INSERT INTO external_field_mappings (
        id, club_id, table_mapping_id, external_field_key, target_field_key, target_field_kind,
        required, transform_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        external_field_key = excluded.external_field_key,
        target_field_key = excluded.target_field_key,
        target_field_kind = excluded.target_field_kind,
        required = excluded.required,
        transform_json = excluded.transform_json,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.tableMappingId,
      entity.externalFieldKey,
      entity.targetFieldKey,
      entity.targetFieldKind,
      entity.required ? 1 : 0,
      entity.transform ? JSON.stringify(entity.transform) : null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  savePrivacyFieldPolicy(entity: PrivacyFieldPolicy): void {
    this.database.prepare(`
      INSERT INTO privacy_field_policies (
        id, club_id, field_key, label, subject_type, data_class, visible_to_roles_json,
        exportable, retention_category, redaction_mode, active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        field_key = excluded.field_key,
        label = excluded.label,
        subject_type = excluded.subject_type,
        data_class = excluded.data_class,
        visible_to_roles_json = excluded.visible_to_roles_json,
        exportable = excluded.exportable,
        retention_category = excluded.retention_category,
        redaction_mode = excluded.redaction_mode,
        active = excluded.active,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.fieldKey,
      entity.label,
      entity.subjectType,
      entity.dataClass,
      JSON.stringify(entity.visibleToRoles),
      entity.exportable ? 1 : 0,
      entity.retentionCategory,
      entity.redactionMode,
      entity.active ? 1 : 0,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  savePrivacyNoticeVersion(entity: PrivacyNoticeVersion): void {
    this.database.prepare(`
      INSERT INTO privacy_notice_versions (
        id, club_id, version, title, content_ref, effective_at, active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        title = excluded.title,
        content_ref = excluded.content_ref,
        effective_at = excluded.effective_at,
        active = excluded.active,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.version,
      entity.title,
      entity.contentRef ?? null,
      entity.effectiveAt,
      entity.active ? 1 : 0,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  savePrivacyRetentionPolicy(entity: PrivacyRetentionPolicy): void {
    this.database.prepare(`
      INSERT INTO privacy_retention_policies (
        id, club_id, category, data_class, retention_days, action, active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        data_class = excluded.data_class,
        retention_days = excluded.retention_days,
        action = excluded.action,
        active = excluded.active,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.category,
      entity.dataClass,
      entity.retentionDays ?? null,
      entity.action,
      entity.active ? 1 : 0,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveStudentConsentRecord(entity: StudentConsentRecord): void {
    this.database.prepare(`
      INSERT INTO student_consent_records (
        id, club_id, student_id, scope, status, notice_version_id, guardian_user_id,
        relationship, source, evidence_ref, granted_at, withdrawn_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, student_id, scope) DO UPDATE SET
        status = excluded.status,
        notice_version_id = excluded.notice_version_id,
        guardian_user_id = excluded.guardian_user_id,
        relationship = excluded.relationship,
        source = excluded.source,
        evidence_ref = excluded.evidence_ref,
        granted_at = excluded.granted_at,
        withdrawn_at = excluded.withdrawn_at,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.studentId,
      entity.scope,
      entity.status,
      entity.noticeVersionId ?? null,
      entity.guardianUserId ?? null,
      entity.relationship ?? null,
      entity.source,
      entity.evidenceRef ?? null,
      entity.grantedAt ?? null,
      entity.withdrawnAt ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  savePrivacyAuditLog(entity: PrivacyAuditLog): void {
    this.database.prepare(`
      INSERT INTO privacy_audit_logs (
        id, club_id, actor_user_id, actor_role, action, target_type, target_id,
        field_keys_json, data_classes_json, purpose, request_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entity.id,
      entity.clubId,
      entity.actorUserId ?? null,
      entity.actorRole ?? null,
      entity.action,
      entity.targetType,
      entity.targetId ?? null,
      JSON.stringify(entity.fieldKeys),
      JSON.stringify(entity.dataClasses),
      entity.purpose,
      entity.requestId ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  savePrivacyRequest(entity: PrivacyRequest): void {
    this.database.prepare(`
      INSERT INTO privacy_requests (
        id, club_id, student_id, request_type, status, requested_by_user_id,
        resolved_by_user_id, description, resolution_note, requested_at,
        resolved_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        resolved_by_user_id = excluded.resolved_by_user_id,
        resolution_note = excluded.resolution_note,
        resolved_at = excluded.resolved_at,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.studentId,
      entity.requestType,
      entity.status,
      entity.requestedByUserId ?? null,
      entity.resolvedByUserId ?? null,
      entity.description ?? null,
      entity.resolutionNote ?? null,
      entity.requestedAt,
      entity.resolvedAt ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveExternalSyncPolicy(entity: ExternalSyncPolicy): void {
    this.database.prepare(`
      INSERT INTO external_sync_policies (
        id, club_id, connection_id, table_mapping_id, name, status, trigger_mode,
        schedule_json, direction, apply_policy, conflict_policy, writeback_policy,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        connection_id = excluded.connection_id,
        table_mapping_id = excluded.table_mapping_id,
        name = excluded.name,
        status = excluded.status,
        trigger_mode = excluded.trigger_mode,
        schedule_json = excluded.schedule_json,
        direction = excluded.direction,
        apply_policy = excluded.apply_policy,
        conflict_policy = excluded.conflict_policy,
        writeback_policy = excluded.writeback_policy,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.connectionId,
      entity.tableMappingId ?? null,
      entity.name,
      entity.status,
      entity.triggerMode,
      entity.schedule ? JSON.stringify(entity.schedule) : null,
      entity.direction,
      entity.applyPolicy,
      entity.conflictPolicy,
      entity.writebackPolicy,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveAbilityMetric(entity: AbilityMetric): void {
    const [catalogScope, scopeClubId, baseItemId] = catalogScopeValues(entity.catalogScope);

    this.database.prepare(`
      INSERT INTO ability_metrics (
        id, catalog_scope, scope_club_id, base_item_id, code, name, dimension_id, value_kind,
        metric_kind, unit, max_score, source_kinds_json, version, status, description, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        name = excluded.name,
        dimension_id = excluded.dimension_id,
        value_kind = excluded.value_kind,
        metric_kind = excluded.metric_kind,
        unit = excluded.unit,
        max_score = excluded.max_score,
        source_kinds_json = excluded.source_kinds_json,
        version = excluded.version,
        status = excluded.status,
        description = excluded.description,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      catalogScope,
      scopeClubId,
      baseItemId,
      entity.code,
      entity.name,
      entity.dimensionId,
      entity.valueKind,
      entity.metricKind,
      entity.unit ?? null,
      entity.maxScore ?? null,
      entity.sourceKinds ? JSON.stringify(entity.sourceKinds) : null,
      entity.version ?? null,
      entity.status ?? null,
      entity.description ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveMetricGraphVersion(entity: MetricGraphVersion): void {
    const [catalogScope, scopeClubId, baseItemId] = catalogScopeValues(entity.catalogScope);

    this.database.prepare(`
      INSERT INTO metric_graph_versions (
        id, catalog_scope, scope_club_id, base_item_id, name, version, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        version = excluded.version,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      catalogScope,
      scopeClubId,
      baseItemId,
      entity.name,
      entity.version,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveMetricDependency(entity: MetricDependency): void {
    const [catalogScope, scopeClubId, baseItemId] = catalogScopeValues(entity.catalogScope);

    this.database.prepare(`
      INSERT INTO metric_dependencies (
        id, catalog_scope, scope_club_id, base_item_id, graph_version_id, output_metric_id,
        input_metric_id, formula_id, weight, role, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        graph_version_id = excluded.graph_version_id,
        output_metric_id = excluded.output_metric_id,
        input_metric_id = excluded.input_metric_id,
        formula_id = excluded.formula_id,
        weight = excluded.weight,
        role = excluded.role,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      catalogScope,
      scopeClubId,
      baseItemId,
      entity.graphVersionId,
      entity.outputMetricId,
      entity.inputMetricId,
      entity.formulaId ?? null,
      entity.weight ?? null,
      entity.role ?? null,
      entity.sortOrder,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveMetricView(entity: MetricView): void {
    const [catalogScope, scopeClubId, baseItemId] = catalogScopeValues(entity.catalogScope);

    this.database.prepare(`
      INSERT INTO metric_views (
        id, catalog_scope, scope_club_id, base_item_id, graph_version_id, name, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        graph_version_id = excluded.graph_version_id,
        name = excluded.name,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      catalogScope,
      scopeClubId,
      baseItemId,
      entity.graphVersionId,
      entity.name,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveMetricViewNode(entity: MetricViewNode): void {
    const [catalogScope, scopeClubId, baseItemId] = catalogScopeValues(entity.catalogScope);

    this.database.prepare(`
      INSERT INTO metric_view_nodes (
        id, catalog_scope, scope_club_id, base_item_id, view_id, metric_id, parent_view_node_id,
        label, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        view_id = excluded.view_id,
        metric_id = excluded.metric_id,
        parent_view_node_id = excluded.parent_view_node_id,
        label = excluded.label,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      catalogScope,
      scopeClubId,
      baseItemId,
      entity.viewId,
      entity.metricId ?? null,
      entity.parentViewNodeId ?? null,
      entity.label,
      entity.sortOrder,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveAssessmentTemplate(entity: AssessmentTemplate): void {
    const [catalogScope, scopeClubId, baseItemId] = catalogScopeValues(entity.catalogScope);

    this.database.prepare(`
      INSERT INTO assessment_templates (
        id, catalog_scope, scope_club_id, base_item_id, name, age_group, team_level, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        age_group = excluded.age_group,
        team_level = excluded.team_level,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      catalogScope,
      scopeClubId,
      baseItemId,
      entity.name,
      entity.ageGroup ?? null,
      entity.teamLevel ?? null,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveAssessmentTemplateVersion(entity: AssessmentTemplateVersion): void {
    this.database.prepare(`
      INSERT INTO assessment_template_versions (
        id, club_id, template_id, graph_version_id, version, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        graph_version_id = excluded.graph_version_id,
        version = excluded.version,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.templateId,
      entity.graphVersionId ?? null,
      entity.version,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveAssessmentMetricBinding(entity: AssessmentMetricBinding): void {
    this.database.prepare(`
      INSERT INTO assessment_metric_bindings (
        id, club_id, template_version_id, metric_id, role, formula_id, test_item_id,
        max_score, weight, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        template_version_id = excluded.template_version_id,
        metric_id = excluded.metric_id,
        role = excluded.role,
        formula_id = excluded.formula_id,
        test_item_id = excluded.test_item_id,
        max_score = excluded.max_score,
        weight = excluded.weight,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.templateVersionId,
      entity.metricId,
      entity.role,
      entity.formulaId ?? null,
      entity.testItemId ?? null,
      entity.maxScore ?? null,
      entity.weight ?? null,
      entity.sortOrder,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveAssessmentTestItem(entity: AssessmentTestItem): void {
    this.database.prepare(`
      INSERT INTO assessment_test_items (
        id, club_id, metric_id, name, value_kind, unit, protocol, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        metric_id = excluded.metric_id,
        name = excluded.name,
        value_kind = excluded.value_kind,
        unit = excluded.unit,
        protocol = excluded.protocol,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.metricId,
      entity.name,
      entity.valueKind,
      entity.unit ?? null,
      entity.protocol ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveExternalSyncRun(entity: ExternalSyncRun): void {
    this.database.prepare(`
      INSERT INTO external_sync_runs (
        id, club_id, connection_id, table_mapping_id, status, started_at, finished_at,
        total_records, imported_records, failed_records, error_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at,
        total_records = excluded.total_records,
        imported_records = excluded.imported_records,
        failed_records = excluded.failed_records,
        error_json = excluded.error_json,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.connectionId,
      entity.tableMappingId ?? null,
      entity.status,
      entity.startedAt ?? null,
      entity.finishedAt ?? null,
      entity.totalRecords,
      entity.importedRecords,
      entity.failedRecords,
      entity.error ? JSON.stringify(entity.error) : null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  saveExternalRawRecord(entity: ExternalRawRecord): void {
    this.database.prepare(`
      INSERT INTO external_raw_records (
        id, club_id, connection_id, table_mapping_id, sync_run_id, external_record_id,
        payload_json, payload_hash, review_status, validation_errors_json, normalized_preview_json,
        imported_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        connection_id = excluded.connection_id,
        table_mapping_id = excluded.table_mapping_id,
        sync_run_id = excluded.sync_run_id,
        external_record_id = excluded.external_record_id,
        payload_json = excluded.payload_json,
        payload_hash = excluded.payload_hash,
        review_status = excluded.review_status,
        validation_errors_json = excluded.validation_errors_json,
        normalized_preview_json = excluded.normalized_preview_json,
        imported_at = excluded.imported_at,
        updated_at = excluded.updated_at
    `).run(
      entity.id,
      entity.clubId,
      entity.connectionId,
      entity.tableMappingId ?? null,
      entity.syncRunId ?? null,
      entity.externalRecordId,
      JSON.stringify(entity.payload),
      entity.payloadHash,
      entity.reviewStatus,
      entity.validationErrors ? JSON.stringify(entity.validationErrors) : null,
      entity.normalizedPreview ? JSON.stringify(entity.normalizedPreview) : null,
      entity.importedAt ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private saveExternalRecordLink(entity: ExternalRecordLink): void {
    this.database.prepare(`
      INSERT INTO external_record_links (
        id, club_id, raw_record_id, target_type, target_id, link_status,
        confirmed_by, confirmed_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entity.id,
      entity.clubId,
      entity.rawRecordId,
      entity.targetType,
      entity.targetId,
      entity.linkStatus,
      entity.confirmedBy ?? null,
      entity.confirmedAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private applyExternalRecordToCoreFacts(
    rawRecord: ExternalRawRecord,
    input: ConfirmExternalRecordInput,
    now: string,
  ): void {
    if (input.targetType !== "student" || !rawRecord.tableMappingId) {
      return;
    }

    const tableMapping = this.database.prepare(`
      SELECT * FROM external_table_mappings
      WHERE club_id = ? AND id = ?
    `).get(rawRecord.clubId, rawRecord.tableMappingId) as SqlRow | undefined;

    if (!tableMapping) {
      return;
    }

    const externalTableKey = requireString(tableMapping, "external_table_key");

    switch (externalTableKey) {
      case "full_users":
        this.applyFullUserRecord(rawRecord, input.targetId, now);
        return;
      case "payment_events":
        this.applyPaymentEventRecord(rawRecord, input.targetId, now);
        return;
      case "attendance_2025_2026_spring_summer":
        this.applyAttendanceSnapshotRecord(rawRecord, input.targetId, now);
        return;
      case "insurance_policies":
        this.applyInsurancePolicyRecord(rawRecord, input.targetId, now);
        return;
      case "talent_elite_assessment":
        this.applyTalentEliteAssessmentDraft(rawRecord, now);
        return;
    }
  }

  private applyTalentEliteAssessmentDraft(rawRecord: ExternalRawRecord, now: string): void {
    const preview = rawRecord.normalizedPreview ?? {};
    const graphVersionId = `metric-graph-draft-${rawRecord.id}`;
    const viewId = `metric-view-draft-${rawRecord.id}`;
    const nodeId = `metric-view-node-draft-${rawRecord.id}`;
    const abilityName = textValue(preview, "assessment.coreAbility") ?? "导入评测图谱草稿";

    this.database.prepare(`
      INSERT INTO metric_graph_versions (
        id, catalog_scope, scope_club_id, base_item_id, name, version, status, created_at, updated_at
      )
      VALUES (?, 'club', ?, NULL, ?, ?, 'draft', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        status = 'draft',
        updated_at = excluded.updated_at
    `).run(
      graphVersionId,
      rawRecord.clubId,
      `导入草稿：${abilityName}`,
      rawRecord.id,
      now,
      now,
    );

    this.database.prepare(`
      INSERT INTO metric_views (
        id, catalog_scope, scope_club_id, base_item_id, graph_version_id, name, status, created_at, updated_at
      )
      VALUES (?, 'club', ?, NULL, ?, ?, 'draft', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        status = 'draft',
        updated_at = excluded.updated_at
    `).run(
      viewId,
      rawRecord.clubId,
      graphVersionId,
      "导入评测草稿视图",
      now,
      now,
    );

    this.database.prepare(`
      INSERT INTO metric_view_nodes (
        id, catalog_scope, scope_club_id, base_item_id, view_id, metric_id,
        parent_view_node_id, label, sort_order, created_at, updated_at
      )
      VALUES (?, 'club', ?, NULL, ?, NULL, NULL, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        updated_at = excluded.updated_at
    `).run(
      nodeId,
      rawRecord.clubId,
      viewId,
      [
        abilityName,
        textValue(preview, "assessment.secondaryMetric"),
        textValue(preview, "assessment.atomicMetric"),
        textValue(preview, "assessment.testItem"),
      ].filter(Boolean).join(" / "),
      now,
      now,
    );
  }

  private applyFullUserRecord(rawRecord: ExternalRawRecord, studentId: EntityId, now: string): void {
    const preview = rawRecord.normalizedPreview ?? {};
    const studentName = textValue(preview, "student.name");
    const birthDate = normalizeBirthDate(textValue(preview, "student.birthDate"));

    if (studentName || birthDate) {
      this.database.prepare(`
        UPDATE student_profiles
        SET
          name = COALESCE(?, name),
          birth_date = COALESCE(?, birth_date),
          updated_at = ?
        WHERE club_id = ? AND id = ?
      `).run(studentName ?? null, birthDate ?? null, now, rawRecord.clubId, studentId);
    }

    const coachId = this.findCoachIdByName(rawRecord.clubId, textValue(preview, "coach.name"));
    this.upsertStudentOperationalProfile(rawRecord, studentId, now, {
      externalRef: textValue(preview, "student.identityNumber"),
      region: textValue(preview, "studentOperationalProfile.area"),
      school: textValue(preview, "studentOperationalProfile.schoolName"),
      acquisitionChannel: textValue(preview, "studentOperationalProfile.channel"),
      studentStatus: textValue(preview, "student.status"),
      responsibleCoachId: coachId,
      insuranceExpiresAt: textValue(preview, "insurance.expiresAt"),
      totalCheckins: numberValue(preview, "attendance.checkInCount"),
      latestCheckinAt: textValue(preview, "attendance.lastCheckInAt"),
      totalRecharges: numberValue(preview, "billing.paymentCount"),
      notes: textValue(preview, "studentOperationalProfile.communicationFeedback"),
    });
    this.upsertPrimaryStudentContact(rawRecord, studentId, now);
    this.upsertStudentTeamMembership(rawRecord.clubId, studentId, textValue(preview, "team.name"), now);
  }

  private applyPaymentEventRecord(rawRecord: ExternalRawRecord, studentId: EntityId, now: string): void {
    const preview = rawRecord.normalizedPreview ?? {};
    const courseHours = numberValue(preview, "payment.courseHours");
    const occurredAt = textValue(preview, "payment.paidAt") ?? now;
    const paymentEventId = `payment-event-${rawRecord.id}`;

    this.database.prepare(`
      INSERT INTO payment_events (
        id, club_id, student_id, occurred_at, payment_type, amount, lesson_hours,
        status, external_ref, note, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        occurred_at = excluded.occurred_at,
        payment_type = excluded.payment_type,
        amount = excluded.amount,
        lesson_hours = excluded.lesson_hours,
        status = excluded.status,
        note = excluded.note,
        updated_at = excluded.updated_at
    `).run(
      paymentEventId,
      rawRecord.clubId,
      studentId,
      occurredAt,
      textValue(preview, "payment.type") ?? null,
      numberValue(preview, "payment.amount") ?? null,
      courseHours ?? null,
      booleanValue(preview, "payment.auditPassed") === 0 ? "pending_offline_review" : "confirmed_offline",
      rawRecord.id,
      textValue(preview, "payment.note") ?? null,
      now,
      now,
    );

    if (courseHours !== undefined) {
      this.database.prepare(`
        INSERT INTO lesson_credit_ledger (
          id, club_id, student_id, payment_event_id, occurred_at, entry_type,
          lesson_delta, source, note, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'credit', ?, 'external_import', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          lesson_delta = excluded.lesson_delta,
          note = excluded.note,
          updated_at = excluded.updated_at
      `).run(
        `lesson-credit-${rawRecord.id}`,
        rawRecord.clubId,
        studentId,
        paymentEventId,
        occurredAt,
        courseHours,
        textValue(preview, "payment.stage") ?? null,
        now,
        now,
      );
    }

    this.upsertStudentOperationalProfile(rawRecord, studentId, now, {
      region: textValue(preview, "studentOperationalProfile.area"),
      school: textValue(preview, "studentOperationalProfile.schoolName"),
      insuranceExpiresAt: textValue(preview, "insurance.expiresAt"),
    });
    this.upsertPrimaryStudentContact(rawRecord, studentId, now);
  }

  private applyAttendanceSnapshotRecord(rawRecord: ExternalRawRecord, studentId: EntityId, now: string): void {
    const preview = rawRecord.normalizedPreview ?? {};
    const checkins = numberValue(preview, "attendance.termTeamCheckInCount");
    const balance = numberValue(preview, "attendance.teamCourseBalance");

    this.upsertStudentOperationalProfile(rawRecord, studentId, now, {
      region: textValue(preview, "studentOperationalProfile.area"),
      school: textValue(preview, "studentOperationalProfile.schoolName"),
      totalCheckins: checkins,
      lessonBalance: balance,
      communicationStage: textValue(preview, "attendance.stage"),
    });
    this.upsertStudentTeamMembership(rawRecord.clubId, studentId, textValue(preview, "team.name"), now);

    if (balance !== undefined) {
      this.database.prepare(`
        INSERT INTO lesson_credit_ledger (
          id, club_id, student_id, team_id, occurred_at, entry_type,
          lesson_delta, balance_after, source, note, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'external_snapshot', 0, ?, 'external_import', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          balance_after = excluded.balance_after,
          note = excluded.note,
          updated_at = excluded.updated_at
      `).run(
        `lesson-credit-snapshot-${rawRecord.id}`,
        rawRecord.clubId,
        studentId,
        this.findTeamIdByName(rawRecord.clubId, textValue(preview, "team.name")) ?? null,
        textValue(preview, "attendance.createdAt") ?? now,
        balance,
        textValue(preview, "attendance.stage") ?? null,
        now,
        now,
      );
    }
  }

  private applyInsurancePolicyRecord(rawRecord: ExternalRawRecord, studentId: EntityId, now: string): void {
    const preview = rawRecord.normalizedPreview ?? {};
    const expiresAt = textValue(preview, "insurance.expiresAt");

    if (!expiresAt) {
      return;
    }

    this.database.prepare(`
      INSERT INTO insurance_policies (
        id, club_id, student_id, purchased_at, expires_at, policy_number, provider,
        sport, approved, external_ref, note, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        purchased_at = excluded.purchased_at,
        expires_at = excluded.expires_at,
        policy_number = excluded.policy_number,
        provider = excluded.provider,
        sport = excluded.sport,
        approved = excluded.approved,
        note = excluded.note,
        updated_at = excluded.updated_at
    `).run(
      `insurance-policy-${rawRecord.id}`,
      rawRecord.clubId,
      studentId,
      textValue(preview, "insurance.purchasedAt") ?? null,
      expiresAt,
      textValue(preview, "insurance.policyNo") ?? null,
      textValue(preview, "insurance.vendor") ?? null,
      textValue(preview, "insurance.sport") ?? null,
      booleanValue(preview, "insurance.auditPassed"),
      rawRecord.id,
      textValue(preview, "insurance.note") ?? null,
      now,
      now,
    );

    this.upsertStudentOperationalProfile(rawRecord, studentId, now, {
      insuranceExpiresAt: expiresAt,
      school: textValue(preview, "studentOperationalProfile.schoolName"),
    });
  }

  private upsertStudentOperationalProfile(
    rawRecord: ExternalRawRecord,
    studentId: EntityId,
    now: string,
    values: {
      externalRef?: string;
      region?: string;
      school?: string;
      acquisitionChannel?: string;
      studentStatus?: string;
      communicationStage?: string;
      responsibleCoachId?: string;
      insuranceExpiresAt?: string;
      totalCheckins?: number;
      latestCheckinAt?: string;
      totalRecharges?: number;
      lessonBalance?: number;
      notes?: string;
    },
  ): void {
    this.database.prepare(`
      INSERT INTO student_operational_profiles (
        id, club_id, student_id, external_ref, region, school, acquisition_channel,
        student_status, communication_stage, responsible_coach_id, insurance_expires_at,
        total_checkins, latest_checkin_at, total_recharges, lesson_balance, notes,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, student_id) DO UPDATE SET
        external_ref = COALESCE(excluded.external_ref, external_ref),
        region = COALESCE(excluded.region, region),
        school = COALESCE(excluded.school, school),
        acquisition_channel = COALESCE(excluded.acquisition_channel, acquisition_channel),
        student_status = COALESCE(excluded.student_status, student_status),
        communication_stage = COALESCE(excluded.communication_stage, communication_stage),
        responsible_coach_id = COALESCE(excluded.responsible_coach_id, responsible_coach_id),
        insurance_expires_at = COALESCE(excluded.insurance_expires_at, insurance_expires_at),
        total_checkins = COALESCE(excluded.total_checkins, total_checkins),
        latest_checkin_at = COALESCE(excluded.latest_checkin_at, latest_checkin_at),
        total_recharges = COALESCE(excluded.total_recharges, total_recharges),
        lesson_balance = COALESCE(excluded.lesson_balance, lesson_balance),
        notes = COALESCE(excluded.notes, notes),
        updated_at = excluded.updated_at
    `).run(
      `student-operational-profile-${studentId}`,
      rawRecord.clubId,
      studentId,
      values.externalRef ?? null,
      values.region ?? null,
      values.school ?? null,
      values.acquisitionChannel ?? null,
      values.studentStatus ?? null,
      values.communicationStage ?? null,
      values.responsibleCoachId ?? null,
      values.insuranceExpiresAt ?? null,
      values.totalCheckins ?? null,
      values.latestCheckinAt ?? null,
      values.totalRecharges ?? null,
      values.lessonBalance ?? null,
      values.notes ?? null,
      now,
      now,
    );
  }

  private upsertPrimaryStudentContact(rawRecord: ExternalRawRecord, studentId: EntityId, now: string): void {
    const preview = rawRecord.normalizedPreview ?? {};
    const phone = textValue(preview, "contact.phone");
    const wechat = textValue(preview, "contact.wechat");

    if (!phone && !wechat) {
      return;
    }

    this.database.prepare(`
      INSERT INTO student_contacts (
        id, club_id, student_id, name, relationship, phone, wechat,
        is_primary_contact, receives_notifications, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'guardian', ?, ?, 1, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        phone = COALESCE(excluded.phone, phone),
        wechat = COALESCE(excluded.wechat, wechat),
        updated_at = excluded.updated_at
    `).run(
      `student-contact-${studentId}-primary`,
      rawRecord.clubId,
      studentId,
      `${textValue(preview, "student.name") ?? "学员"}家长`,
      phone ?? null,
      wechat ?? null,
      now,
      now,
    );
  }

  private upsertStudentTeamMembership(clubId: EntityId, studentId: EntityId, teamName: string | undefined, now: string): void {
    const teamId = this.findTeamIdByName(clubId, teamName);
    if (!teamId) {
      return;
    }

    const existing = this.database.prepare(`
      SELECT id FROM team_members
      WHERE club_id = ? AND team_id = ? AND student_id = ? AND status = 'active'
      LIMIT 1
    `).get(clubId, teamId, studentId) as SqlRow | undefined;

    if (existing) {
      return;
    }

    this.database.prepare(`
      INSERT INTO team_members (
        id, club_id, team_id, student_id, starts_at, is_primary_team, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, 'active', ?, ?)
    `).run(
      `team-member-${studentId}-${teamId}`,
      clubId,
      teamId,
      studentId,
      now.slice(0, 10),
      now,
      now,
    );
  }

  private findCoachIdByName(clubId: EntityId, coachName: string | undefined): string | undefined {
    if (!coachName) {
      return undefined;
    }

    const row = this.database.prepare(`
      SELECT id FROM coach_profiles WHERE club_id = ? AND name = ? LIMIT 1
    `).get(clubId, coachName) as SqlRow | undefined;

    return optionalString(row ?? {}, "id");
  }

  private findTeamIdByName(clubId: EntityId, teamName: string | undefined): string | undefined {
    if (!teamName) {
      return undefined;
    }

    const row = this.database.prepare(`
      SELECT id FROM teams WHERE club_id = ? AND name = ? LIMIT 1
    `).get(clubId, teamName) as SqlRow | undefined;

    return optionalString(row ?? {}, "id");
  }

  private existsByClubId(tableName: "calendar_events" | "teams", clubId: EntityId, id: EntityId): boolean {
    const row = this.database.prepare(`
      SELECT id FROM ${tableName}
      WHERE club_id = ? AND id = ?
      LIMIT 1
    `).get(clubId, id) as SqlRow | undefined;

    return Boolean(row);
  }
}

function textValue(preview: Record<string, unknown>, key: string): string | undefined {
  const value = preview[key];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value);
}

function numberValue(preview: Record<string, unknown>, key: string): number | undefined {
  const value = preview[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function booleanValue(preview: Record<string, unknown>, key: string): 0 | 1 | null {
  const value = preview[key];

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return value === 0 ? 0 : 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "是", "通过", "已通过"].includes(normalized)) {
      return 1;
    }

    if (["false", "no", "n", "0", "否", "未通过"].includes(normalized)) {
      return 0;
    }
  }

  return null;
}

function normalizeBirthDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

function mapOperationalProfile(row: SqlRow) {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    studentId: requireString(row, "student_id"),
    externalRef: optionalString(row, "external_ref"),
    region: optionalString(row, "region"),
    school: optionalString(row, "school"),
    acquisitionChannel: optionalString(row, "acquisition_channel"),
    studentStatus: optionalString(row, "student_status"),
    communicationStage: optionalString(row, "communication_stage"),
    responsibleCoachId: optionalString(row, "responsible_coach_id"),
    insuranceExpiresAt: optionalString(row, "insurance_expires_at"),
    totalCheckins: optionalNumber(row, "total_checkins"),
    latestCheckinAt: optionalString(row, "latest_checkin_at"),
    totalRecharges: optionalNumber(row, "total_recharges"),
    lessonBalance: optionalNumber(row, "lesson_balance"),
    notes: optionalString(row, "notes"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapStudentContact(row: SqlRow) {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    studentId: requireString(row, "student_id"),
    name: requireString(row, "name"),
    relationship: requireString(row, "relationship"),
    phone: optionalString(row, "phone"),
    wechat: optionalString(row, "wechat"),
    isPrimaryContact: booleanFromSql(row.is_primary_contact),
    receivesNotifications: booleanFromSql(row.receives_notifications),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapStudentTeam(row: SqlRow) {
  return {
    membershipId: requireString(row, "id"),
    teamId: requireString(row, "team_id"),
    name: requireString(row, "name"),
    ageGroup: requireString(row, "age_group"),
    level: requireString(row, "level"),
    defaultCoachId: optionalString(row, "default_coach_id"),
    defaultCoachName: optionalString(row, "default_coach_name"),
    startsAt: requireString(row, "starts_at"),
    endsAt: optionalString(row, "ends_at"),
    isPrimaryTeam: booleanFromSql(row.is_primary_team),
    status: requireString(row, "status"),
  };
}

function mapLessonLedger(row: SqlRow) {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    studentId: requireString(row, "student_id"),
    teamId: optionalString(row, "team_id"),
    eventId: optionalString(row, "event_id"),
    paymentEventId: optionalString(row, "payment_event_id"),
    occurredAt: requireString(row, "occurred_at"),
    entryType: requireString(row, "entry_type") as LessonLedgerEntry["entryType"],
    lessonDelta: numberFromSql(row, "lesson_delta"),
    balanceAfter: optionalNumber(row, "balance_after"),
    source: requireString(row, "source"),
    sourceId: optionalString(row, "source_id"),
    actorUserId: optionalString(row, "actor_user_id"),
    note: optionalString(row, "note"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  } satisfies LessonLedgerEntry;
}

function mapInsurancePolicy(row: SqlRow) {
  const reviewStatus = insuranceReviewStatus(row);
  const policy = {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    studentId: requireString(row, "student_id"),
    purchasedAt: optionalString(row, "purchased_at"),
    expiresAt: requireString(row, "expires_at"),
    policyNumber: optionalString(row, "policy_number"),
    provider: optionalString(row, "provider"),
    sport: optionalString(row, "sport"),
    approved: row.approved === null || row.approved === undefined ? undefined : booleanFromSql(row.approved),
    reviewStatus,
    currentStatus: "unknown" as InsurancePolicy["currentStatus"],
    source: optionalString(row, "source") ?? "external_import",
    sourceId: optionalString(row, "source_id"),
    actorUserId: optionalString(row, "actor_user_id"),
    externalRef: optionalString(row, "external_ref"),
    note: optionalString(row, "note"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  } satisfies InsurancePolicy;

  return {
    ...policy,
    currentStatus: deriveInsuranceCurrentStatus(policy),
  };
}

function mapExternalConnection(row: SqlRow): ExternalSystemConnection {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    provider: requireString(row, "provider"),
    name: requireString(row, "name"),
    status: requireString(row, "status") as ExternalSystemConnection["status"],
    config: jsonObject(requireString(row, "config_json")) ?? {},
    lastSyncedAt: optionalString(row, "last_synced_at"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapClubAppClient(row: SqlRow): ClubAppClient {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    channel: requireString(row, "channel") as ClubAppClient["channel"],
    name: requireString(row, "name"),
    status: requireString(row, "status") as ClubAppClient["status"],
    appId: optionalString(row, "app_id"),
    clientKey: requireString(row, "client_key"),
    theme: jsonObject(optionalString(row, "theme_json")),
    navigation: jsonRecordArray(optionalString(row, "navigation_json")),
    roleEntrypoints: stringArrayRecord(optionalString(row, "role_entrypoints_json")),
    featureOverrides: booleanRecord(optionalString(row, "feature_overrides_json")),
    visibility: jsonObject(optionalString(row, "visibility_json")),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapExternalRecordLink(row: SqlRow): ExternalRecordLink {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    rawRecordId: requireString(row, "raw_record_id"),
    targetType: requireString(row, "target_type"),
    targetId: requireString(row, "target_id"),
    linkStatus: requireString(row, "link_status") as ExternalRecordLink["linkStatus"],
    confirmedBy: optionalString(row, "confirmed_by"),
    confirmedAt: requireString(row, "confirmed_at"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapExternalTableMapping(row: SqlRow): ExternalTableMapping {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    connectionId: requireString(row, "connection_id"),
    externalTableKey: requireString(row, "external_table_key"),
    targetType: requireString(row, "target_type"),
    mappingVersion: requireString(row, "mapping_version"),
    status: requireString(row, "status") as ExternalTableMapping["status"],
    config: jsonObject(optionalString(row, "config_json")),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapExternalFieldMapping(row: SqlRow): ExternalFieldMapping {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    tableMappingId: requireString(row, "table_mapping_id"),
    externalFieldKey: requireString(row, "external_field_key"),
    targetFieldKey: requireString(row, "target_field_key"),
    targetFieldKind: requireString(row, "target_field_kind"),
    required: booleanFromSql(row.required),
    transform: jsonObject(optionalString(row, "transform_json")),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapExternalSyncPolicy(row: SqlRow): ExternalSyncPolicy {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    connectionId: requireString(row, "connection_id"),
    tableMappingId: optionalString(row, "table_mapping_id"),
    name: requireString(row, "name"),
    status: requireString(row, "status") as ExternalSyncPolicy["status"],
    triggerMode: requireString(row, "trigger_mode") as ExternalSyncPolicy["triggerMode"],
    schedule: jsonObject(optionalString(row, "schedule_json")),
    direction: requireString(row, "direction") as ExternalSyncPolicy["direction"],
    applyPolicy: requireString(row, "apply_policy") as ExternalSyncPolicy["applyPolicy"],
    conflictPolicy: requireString(row, "conflict_policy") as ExternalSyncPolicy["conflictPolicy"],
    writebackPolicy: requireString(row, "writeback_policy") as ExternalSyncPolicy["writebackPolicy"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapExternalSyncRun(row: SqlRow): ExternalSyncRun {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    connectionId: requireString(row, "connection_id"),
    tableMappingId: optionalString(row, "table_mapping_id"),
    status: requireString(row, "status") as ExternalSyncRun["status"],
    startedAt: optionalString(row, "started_at"),
    finishedAt: optionalString(row, "finished_at"),
    totalRecords: numberFromSql(row, "total_records"),
    importedRecords: numberFromSql(row, "imported_records"),
    failedRecords: numberFromSql(row, "failed_records"),
    error: jsonObject(optionalString(row, "error_json")),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapExternalRawRecord(row: SqlRow): ExternalRawRecord {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    connectionId: requireString(row, "connection_id"),
    tableMappingId: optionalString(row, "table_mapping_id"),
    syncRunId: optionalString(row, "sync_run_id"),
    externalRecordId: requireString(row, "external_record_id"),
    payload: jsonObject(requireString(row, "payload_json")) ?? {},
    payloadHash: requireString(row, "payload_hash"),
    reviewStatus: requireString(row, "review_status") as ExternalRawRecord["reviewStatus"],
    validationErrors: jsonArray(optionalString(row, "validation_errors_json")),
    normalizedPreview: jsonObject(optionalString(row, "normalized_preview_json")),
    importedAt: optionalString(row, "imported_at"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapPrivacyFieldPolicy(row: SqlRow): PrivacyFieldPolicy {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    fieldKey: requireString(row, "field_key"),
    label: requireString(row, "label"),
    subjectType: requireString(row, "subject_type") as PrivacyFieldPolicy["subjectType"],
    dataClass: requireString(row, "data_class") as PrivacyFieldPolicy["dataClass"],
    visibleToRoles: (jsonArray(requireString(row, "visible_to_roles_json")) ?? []) as PrivacyFieldPolicy["visibleToRoles"],
    exportable: booleanFromSql(row.exportable),
    retentionCategory: requireString(row, "retention_category"),
    redactionMode: requireString(row, "redaction_mode") as PrivacyFieldPolicy["redactionMode"],
    active: booleanFromSql(row.active),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapPrivacyNoticeVersion(row: SqlRow): PrivacyNoticeVersion {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    version: requireString(row, "version"),
    title: requireString(row, "title"),
    contentRef: optionalString(row, "content_ref"),
    effectiveAt: requireString(row, "effective_at"),
    active: booleanFromSql(row.active),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapPrivacyRetentionPolicy(row: SqlRow): PrivacyRetentionPolicy {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    category: requireString(row, "category"),
    dataClass: requireString(row, "data_class") as PrivacyRetentionPolicy["dataClass"],
    retentionDays: optionalNumber(row, "retention_days"),
    action: requireString(row, "action") as PrivacyRetentionPolicy["action"],
    active: booleanFromSql(row.active),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapStudentConsentRecord(row: SqlRow): StudentConsentRecord {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    studentId: requireString(row, "student_id"),
    scope: requireString(row, "scope") as StudentConsentRecord["scope"],
    status: requireString(row, "status") as StudentConsentRecord["status"],
    noticeVersionId: optionalString(row, "notice_version_id"),
    guardianUserId: optionalString(row, "guardian_user_id"),
    relationship: optionalString(row, "relationship"),
    source: requireString(row, "source") as StudentConsentRecord["source"],
    evidenceRef: optionalString(row, "evidence_ref"),
    grantedAt: optionalString(row, "granted_at"),
    withdrawnAt: optionalString(row, "withdrawn_at"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapPrivacyAuditLog(row: SqlRow): PrivacyAuditLog {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    actorUserId: optionalString(row, "actor_user_id"),
    actorRole: optionalString(row, "actor_role") as PrivacyAuditLog["actorRole"],
    action: requireString(row, "action") as PrivacyAuditLog["action"],
    targetType: requireString(row, "target_type"),
    targetId: optionalString(row, "target_id"),
    fieldKeys: (jsonArray(requireString(row, "field_keys_json")) ?? []) as string[],
    dataClasses: (jsonArray(requireString(row, "data_classes_json")) ?? []) as PrivacyAuditLog["dataClasses"],
    purpose: requireString(row, "purpose"),
    requestId: optionalString(row, "request_id"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapPrivacyRequest(row: SqlRow): PrivacyRequest {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    studentId: requireString(row, "student_id"),
    requestType: requireString(row, "request_type") as PrivacyRequest["requestType"],
    status: requireString(row, "status") as PrivacyRequest["status"],
    requestedByUserId: optionalString(row, "requested_by_user_id"),
    resolvedByUserId: optionalString(row, "resolved_by_user_id"),
    description: optionalString(row, "description"),
    resolutionNote: optionalString(row, "resolution_note"),
    requestedAt: requireString(row, "requested_at"),
    resolvedAt: optionalString(row, "resolved_at"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapMetricGraphVersion(row: SqlRow): MetricGraphVersion {
  return {
    id: requireString(row, "id"),
    catalogScope: catalogScope(row),
    name: requireString(row, "name"),
    version: requireString(row, "version"),
    status: requireString(row, "status") as MetricGraphVersion["status"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapMetricDependency(row: SqlRow): MetricDependency {
  return {
    id: requireString(row, "id"),
    catalogScope: catalogScope(row),
    graphVersionId: requireString(row, "graph_version_id"),
    outputMetricId: requireString(row, "output_metric_id"),
    inputMetricId: requireString(row, "input_metric_id"),
    formulaId: optionalString(row, "formula_id"),
    weight: optionalNumber(row, "weight"),
    role: optionalString(row, "role") as MetricDependency["role"],
    sortOrder: numberFromSql(row, "sort_order"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapMetricView(row: SqlRow): MetricView {
  return {
    id: requireString(row, "id"),
    catalogScope: catalogScope(row),
    graphVersionId: requireString(row, "graph_version_id"),
    name: requireString(row, "name"),
    status: requireString(row, "status") as MetricView["status"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapHttpIdempotencyRecord(row: SqlRow): HttpIdempotencyRecord {
  return {
    key: requireString(row, "key"),
    fingerprint: requireString(row, "fingerprint"),
    statusCode: numberFromSql(row, "status_code"),
    payload: requireString(row, "payload"),
    contentType: optionalString(row, "content_type"),
    createdAt: requireString(row, "created_at"),
    expiresAt: requireString(row, "expires_at"),
  };
}

function mapMetricViewNode(row: SqlRow): MetricViewNode {
  return {
    id: requireString(row, "id"),
    catalogScope: catalogScope(row),
    viewId: requireString(row, "view_id"),
    metricId: optionalString(row, "metric_id"),
    parentViewNodeId: optionalString(row, "parent_view_node_id"),
    label: requireString(row, "label"),
    sortOrder: numberFromSql(row, "sort_order"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapAssessmentTemplateVersion(row: SqlRow): AssessmentTemplateVersion {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    templateId: requireString(row, "template_id"),
    graphVersionId: optionalString(row, "graph_version_id"),
    version: requireString(row, "version"),
    status: requireString(row, "status") as AssessmentTemplateVersion["status"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapAssessmentTemplate(row: SqlRow): AssessmentTemplate {
  return {
    id: requireString(row, "id"),
    catalogScope: catalogScope(row),
    name: requireString(row, "name"),
    ageGroup: optionalString(row, "age_group"),
    teamLevel: optionalString(row, "team_level"),
    status: requireString(row, "status") as AssessmentTemplate["status"],
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapAssessmentMetricBinding(row: SqlRow): AssessmentMetricBinding {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    templateVersionId: requireString(row, "template_version_id"),
    metricId: requireString(row, "metric_id"),
    role: requireString(row, "role") as AssessmentMetricBinding["role"],
    formulaId: optionalString(row, "formula_id"),
    testItemId: optionalString(row, "test_item_id"),
    maxScore: optionalNumber(row, "max_score"),
    weight: optionalNumber(row, "weight"),
    sortOrder: numberFromSql(row, "sort_order"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}

function mapAssessmentTestItem(row: SqlRow): AssessmentTestItem {
  return {
    id: requireString(row, "id"),
    clubId: requireString(row, "club_id"),
    metricId: requireString(row, "metric_id"),
    name: requireString(row, "name"),
    valueKind: requireString(row, "value_kind") as AssessmentTestItem["valueKind"],
    unit: optionalString(row, "unit"),
    protocol: optionalString(row, "protocol"),
    createdAt: requireString(row, "created_at"),
    updatedAt: requireString(row, "updated_at"),
  };
}
