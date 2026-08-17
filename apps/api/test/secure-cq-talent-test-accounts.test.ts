import { describe, expect, it } from "vitest";

// 文件级超时：本文件均为真实 SQLite 文件库操作，Windows 全量门禁并行负载下单用例可达 5s+
const FILE_DB_TIMEOUT = 20000;
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { importSecureCqTalentTestAccounts, readSecureCqTalentTestAccountPhones } from "../src/ops/secure-cq-talent-test-accounts.js";
import { rollbackSecureCqTalentTestAccounts } from "../src/ops/rollback-secure-cq-talent-test-accounts.js";
import { runSecureCqTalentTestAccountCommand } from "../src/ops/secure-cq-talent-test-accounts-cli.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";
import { buildServer } from "../src/server.js";
import { PersistentApiStore } from "../src/store.js";

const runtimePhones = ["10000000001", "10000000002", "10000000003"] as const;

describe("secure Chongqing Talent test-account operation", () => {
  it("reads three phones from runtime input without embedding phone values in the operation", () => {
    expect(readSecureCqTalentTestAccountPhones({
      SECURE_CQ_TALENT_TEST_PHONE_1: runtimePhones[0],
      SECURE_CQ_TALENT_TEST_PHONE_2: runtimePhones[1],
      SECURE_CQ_TALENT_TEST_PHONE_3: runtimePhones[2],
    })).toEqual(runtimePhones);
  }, FILE_DB_TIMEOUT);

  it("runs import and rollback only through explicitly confirmed file-database commands", async () => {
    const directory = mkdtempSync(join(tmpdir(), "cq-talent-secure-accounts-"));
    const databasePath = join(directory, "app.sqlite");

    try {
      const seeded = await createPlatformPersistence({ databasePath });
      seeded.database.close();
      const environment = {
        DATABASE_URL: databasePath,
        SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED: "1",
        SECURE_CQ_TALENT_TEST_PHONE_1: runtimePhones[0],
        SECURE_CQ_TALENT_TEST_PHONE_2: runtimePhones[1],
        SECURE_CQ_TALENT_TEST_PHONE_3: runtimePhones[2],
      };

      expect(() => runSecureCqTalentTestAccountCommand(["import"], environment)).toThrow(/confirmation/i);
      expect(() => runSecureCqTalentTestAccountCommand([
        "import",
        "--confirm-secure-cq-talent-test-accounts",
      ], {
        ...environment,
        SECURE_CQ_TALENT_TEST_ACCOUNTS_BACKUP_ATTESTED: undefined,
      })).toThrow(/backup attestation/i);
      expect(() => runSecureCqTalentTestAccountCommand([
        "rollback",
        "--confirm-secure-cq-talent-test-accounts",
      ], environment)).toThrow(/no complete secure test-account installation/i);
      expect(runSecureCqTalentTestAccountCommand(["import", "--dry-run"], environment)).toEqual({
        operation: "import",
        status: "dry_run",
        accountCount: 3,
      });
      expect(runSecureCqTalentTestAccountCommand([
        "import",
        "--confirm-secure-cq-talent-test-accounts",
      ], environment)).toEqual({
        operation: "import",
        status: "imported",
        accountCount: 3,
      });
      expect(runSecureCqTalentTestAccountCommand([
        "rollback",
        "--confirm-secure-cq-talent-test-accounts",
      ], environment)).toEqual({
        operation: "rollback",
        status: "rolled_back",
        accountCount: 3,
      });
    } finally {
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }, FILE_DB_TIMEOUT);

  it("does not run migrations or change migration state for an import dry-run", async () => {
    const directory = mkdtempSync(join(tmpdir(), "cq-talent-secure-accounts-"));
    const databasePath = join(directory, "app.sqlite");

    try {
      const seeded = await createPlatformPersistence({ databasePath });
      seeded.database.close();
      const database = new DatabaseSync(databasePath);
      const migrationCount = (database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as { count: number }).count;
      database.close();
      const environment = {
        DATABASE_URL: databasePath,
        SECURE_CQ_TALENT_TEST_PHONE_1: runtimePhones[0],
        SECURE_CQ_TALENT_TEST_PHONE_2: runtimePhones[1],
        SECURE_CQ_TALENT_TEST_PHONE_3: runtimePhones[2],
      };

      expect(runSecureCqTalentTestAccountCommand(["import", "--dry-run"], environment)).toEqual({
        operation: "import",
        status: "dry_run",
        accountCount: 3,
      });

      const reopened = new DatabaseSync(databasePath);
      try {
        expect(reopened.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get()).toEqual({
          count: migrationCount,
        });
      } finally {
        reopened.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }, FILE_DB_TIMEOUT);

  it("supports dry-run and imports three isolated dual-role scopes transactionally", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const dryRun = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        dryRun: true,
        now: "2026-08-12T00:00:00.000Z",
      });

      expect(dryRun.status).toBe("dry_run");
      expect(count(persistence.database, "user_accounts")).toBe(3);
      expect(count(persistence.database, "student_profiles")).toBe(1);

      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });

      expect(imported.status).toBe("imported");
      expect(imported.manifest.accountIds).toHaveLength(3);
      expect(imported.manifest.accountIds.every((account) => account.studentIds.length === 2)).toBe(true);
      expect(count(persistence.database, "user_accounts")).toBe(6);
      expect(count(persistence.database, "club_user_memberships")).toBe(6);
      expect(count(persistence.database, "parent_profiles")).toBe(4);
      expect(count(persistence.database, "coach_profiles")).toBe(4);
      expect(count(persistence.database, "student_profiles")).toBe(7);
      expect(count(persistence.database, "teams")).toBe(5);
      expect(countWhere(persistence.database, "calendar_events", "id LIKE 'event-cq-talent-secure-test-%'")).toBe(3);
      expect(countWhere(persistence.database, "event_participants", "id LIKE 'participant-cq-talent-secure-test-%'")).toBe(6);
      expect(countWhere(persistence.database, "student_contacts", "id LIKE 'contact-cq-talent-secure-test-%'")).toBe(6);

      const importedAccounts = persistence.database.prepare(`
        SELECT u.id, u.phone, u.roles_json, m.roles_json AS membership_roles
        FROM user_accounts u
        JOIN club_user_memberships m ON m.user_id = u.id
        WHERE u.id LIKE 'user-cq-talent-secure-test-%'
        ORDER BY u.id
      `).all() as Array<{ id: string; phone: string; roles_json: string; membership_roles: string }>;
      expect(importedAccounts.map((row) => row.phone)).toEqual([...runtimePhones]);
      expect(importedAccounts.every((row) => JSON.parse(row.roles_json).sort().join(",") === "coach,parent")).toBe(true);
      expect(importedAccounts.every((row) => JSON.parse(row.membership_roles).sort().join(",") === "coach,parent")).toBe(true);

      const parentChildren = persistence.database.prepare(`
        SELECT p.user_id AS user_id, COUNT(DISTINCT b.student_id) AS child_count
        FROM parent_profiles p
        JOIN student_guardian_bindings b ON b.parent_id = p.id
        WHERE p.id LIKE 'parent-cq-talent-secure-test-%'
        GROUP BY p.user_id
        ORDER BY p.user_id
      `).all() as Array<{ user_id: string; child_count: number }>;
      expect(parentChildren).toEqual([
        { user_id: "user-cq-talent-secure-test-1", child_count: 2 },
        { user_id: "user-cq-talent-secure-test-2", child_count: 2 },
        { user_id: "user-cq-talent-secure-test-3", child_count: 2 },
      ]);

      const coachScopes = persistence.database.prepare(`
        SELECT c.user_id, COUNT(DISTINCT tm.student_id) AS roster_count
        FROM coach_profiles c
        JOIN teams t ON t.default_coach_id = c.id
        JOIN team_members tm ON tm.team_id = t.id
        WHERE c.id LIKE 'coach-cq-talent-secure-test-%'
        GROUP BY c.user_id
        ORDER BY c.user_id
      `).all() as Array<{ user_id: string; roster_count: number }>;
      expect(coachScopes).toEqual([
        { user_id: "user-cq-talent-secure-test-1", roster_count: 2 },
        { user_id: "user-cq-talent-secure-test-2", roster_count: 2 },
        { user_id: "user-cq-talent-secure-test-3", roster_count: 2 },
      ]);

      const rerun = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      expect(rerun.status).toBe("already_present");
      expect(count(persistence.database, "user_accounts")).toBe(6);
      expect(count(persistence.database, "student_profiles")).toBe(7);
      expect(rerun.manifest).toEqual(imported.manifest);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("enforces each imported identity's parent and coach scope through WeChat-issued bearer sessions", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
    let app: ReturnType<typeof buildServer> | undefined;

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      app = buildServer(new PersistentApiStore(persistence.repositories), {
        logger: false,
        membershipResolver: new HeaderMembershipResolver(
          persistence.repositories.users,
          persistence.repositories.memberships,
          null,
          { allowHeaderIdentity: false },
        ),
        wechatIdentityConnector: {
          async resolve() {
            return { openId: "secure-test-openid", phone: runtimePhones[0] };
          },
        },
      });
      const first = imported.manifest.accountIds[0]!;
      const second = imported.manifest.accountIds[1]!;
      const base = "/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main";

      const login = await app.inject({
        method: "POST",
        url: base + "/wechat-login",
        headers: { "x-app-client-capabilities": "active-role-switch-v1" },
        payload: { wxLoginCode: "secure-test-wx-code", phoneCode: "secure-test-phone-code" },
      });
      expect(login.statusCode).toBe(200);
      const loginBody = login.json() as { availableRoles: string[]; session: { token: string; activeRole: string | null } };
      expect(loginBody.availableRoles).toEqual(["parent", "coach"]);
      expect(loginBody.session.activeRole).toBeNull();

      const parentSession = await app.inject({
        method: "POST",
        url: base + "/session/role",
        headers: { authorization: "Bearer " + loginBody.session.token },
        payload: { role: "parent" },
      });
      expect(parentSession.statusCode).toBe(200);
      const parentToken = (parentSession.json() as { session: { token: string } }).session.token;
      const parent = await app.inject({
        method: "GET",
        url: base + "/parent/children",
        headers: { authorization: "Bearer " + parentToken },
      });
      expect(parent.statusCode).toBe(200);
      expect(parent.json().children.map((child: { id: string }) => child.id)).toEqual(first.studentIds);
      expect(parent.payload).not.toContain("phone");
      expect(parent.payload).not.toContain(second.studentIds[0]!);

      const coachSession = await app.inject({
        method: "POST",
        url: base + "/session/role",
        headers: { authorization: "Bearer " + parentToken },
        payload: { role: "coach" },
      });
      expect(coachSession.statusCode).toBe(200);
      const coachToken = (coachSession.json() as { session: { token: string } }).session.token;
      const coach = await app.inject({
        method: "GET",
        url: base + "/coach/team",
        headers: { authorization: "Bearer " + coachToken },
      });
      expect(coach.statusCode).toBe(200);
      const coachBody = coach.json() as {
        members: Array<{ id: string }>;
        coaches?: Array<{ id: string; name: string; role: string }>;
      };
      expect(coachBody.members.map((student) => student.id)).toEqual(first.studentIds);
      expect(coachBody.coaches).toEqual(expect.any(Array));
      expect(coach.payload).not.toContain(second.studentIds[0]!);
      expect(coach.payload).not.toContain("phone");
    } finally {
      await app?.close();
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("rolls back owned rows, scenario sessions, and write-side effects while preserving unrelated club data", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      const firstAccount = imported.manifest.accountIds[0]!;
      const firstStudent = firstAccount.studentIds[0]!;
      const firstEvent = firstAccount.eventId;
      const firstTeam = firstAccount.teamId;
      const firstCoach = firstAccount.coachId;
      const sideEffectIds = {
        httpIdempotencyKeys: ["cq-talent-secure-test-idempotency"],
      };

      persistence.database.prepare(`
        INSERT INTO app_client_sessions (
          id, token_hash, club_id, app_client_id, user_id, membership_id,
          active_role, expires_at, revoked_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "session-cq-talent-secure-test-scenario",
        createHash("sha256").update("scenario-token").digest("hex"),
        "club-chongqing-talent",
        "app-client-cq-talent-wechat-main",
        firstAccount.userId,
        firstAccount.membershipId,
        "coach",
        "2026-08-13T00:00:00.000Z",
        null,
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO private_lesson_requests (
          id, club_id, student_id, coach_name, date, time_slot, goals_json,
          note, status, requested_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "private-lesson-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstStudent,
        "secure test coach",
        "2026-08-12",
        "18:00-19:00",
        "[]",
        null,
        "pending",
        firstAccount.userId,
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO event_change_requests (
          id, club_id, event_id, reason, new_starts_at, new_venue,
          note, status, requested_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "event-change-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstEvent,
        "scenario change",
        null,
        null,
        null,
        "open",
        firstAccount.userId,
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO tactical_boards (
          id, club_id, event_id, formation_name, pitch_type, players_json,
          updated_by_coach_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "tactical-board-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstEvent,
        "4-3-3",
        "full",
        "[]",
        firstAccount.coachId,
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO lesson_credit_ledger (
          id, club_id, student_id, team_id, event_id, occurred_at, entry_type,
          lesson_delta, balance_after, source, source_id, actor_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "lesson-ledger-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstStudent,
        firstTeam,
        firstEvent,
        "2026-08-12T00:00:00.000Z",
        "debit",
        -1,
        4,
        "attendance",
        "secure-test-attendance-source",
        firstAccount.userId,
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO http_idempotency_records (
          key, fingerprint, status_code, payload, content_type, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        sideEffectIds.httpIdempotencyKeys[0],
        "fingerprint",
        200,
        "{}",
        "application/json",
        "2026-08-12T00:00:00.000Z",
        "2026-08-13T00:00:00.000Z",
      );

      const metric = persistence.database.prepare(
        "SELECT id FROM ability_metrics WHERE catalog_scope = 'system' ORDER BY id LIMIT 1",
      ).get() as { id: string };
      const template = persistence.database.prepare(
        "SELECT id FROM assessment_templates ORDER BY id LIMIT 1",
      ).get() as { id: string };
      const templateVersion = persistence.database.prepare(
        "SELECT id FROM assessment_template_versions WHERE club_id = ? ORDER BY id LIMIT 1",
      ).get("club-chongqing-talent") as { id: string };
      const testItem = persistence.database.prepare(
        "SELECT id FROM assessment_test_items WHERE club_id = ? ORDER BY id LIMIT 1",
      ).get("club-chongqing-talent") as { id: string };
      const definition = persistence.database.prepare(
        "SELECT id, version FROM derived_metric_definitions ORDER BY id LIMIT 1",
      ).get() as { id: string; version: string };
      persistence.database.prepare(`
        INSERT INTO player_assessments (
          id, club_id, student_id, template_id, template_version_id,
          assessed_by_coach_id, assessed_at, event_id, summary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "assessment-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstStudent,
        template.id,
        templateVersion.id,
        firstCoach,
        "2026-08-12T00:00:00.000Z",
        firstEvent,
        "scenario assessment",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO assessment_raw_results (
          id, club_id, assessment_id, test_item_id, metric_id, value_json,
          recorded_by_coach_id, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "assessment-raw-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        "assessment-cq-talent-secure-test-scenario",
        testItem.id,
        metric.id,
        "{\"value\":7}",
        firstCoach,
        "scenario raw result",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO assessment_scores (
          id, club_id, assessment_id, metric_id, value_json, normalized_score,
          raw_result_id, comment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "assessment-score-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        "assessment-cq-talent-secure-test-scenario",
        metric.id,
        "{\"value\":7}",
        0.7,
        "assessment-raw-cq-talent-secure-test-scenario",
        "scenario score",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO player_metric_records (
          id, club_id, student_id, metric_id, value_json, source, occurred_at,
          event_id, assessment_id, template_version_id, raw_result_id, recorded_by_coach_id,
          visibility, confidence, note, lineage_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "metric-record-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstStudent,
        metric.id,
        "{\"value\":7}",
        "assessment",
        "2026-08-12T00:00:00.000Z",
        firstEvent,
        "assessment-cq-talent-secure-test-scenario",
        templateVersion.id,
        "assessment-raw-cq-talent-secure-test-scenario",
        firstCoach,
        "internal",
        0.9,
        "scenario metric",
        null,
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO metric_lineages (
          id, club_id, output_record_id, definition_id, definition_version,
          input_record_ids_json, computed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "metric-lineage-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        "metric-record-cq-talent-secure-test-scenario",
        definition.id,
        definition.version,
        "[]",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO matches (
          id, club_id, event_id, match_type, opponent_name, home_score,
          away_score, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "match-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        firstEvent,
        "friendly",
        "Scenario opponent",
        1,
        0,
        "scheduled",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );
      persistence.database.prepare(`
        INSERT INTO match_events (
          id, club_id, match_id, type, student_id, minute,
          linked_metric_id, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "match-event-cq-talent-secure-test-scenario",
        "club-chongqing-talent",
        "match-cq-talent-secure-test-scenario",
        "goal",
        firstStudent,
        12,
        metric.id,
        "scenario match event",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );

      const rollback = rollbackSecureCqTalentTestAccounts(persistence.database, {
        ...imported.manifest,
        sideEffects: sideEffectIds,
      });

      expect(rollback.status).toBe("rolled_back");
      expect(countWhere(persistence.database, "user_accounts", "id LIKE 'user-cq-talent-secure-test-%'")).toBe(0);
      expect(countWhere(persistence.database, "student_profiles", "id LIKE 'student-cq-talent-secure-test-%'")).toBe(0);
      expect(countWhere(persistence.database, "teams", "id LIKE 'team-cq-talent-secure-test-%'")).toBe(0);
      expect(countWhere(persistence.database, "calendar_events", "id LIKE 'event-cq-talent-secure-test-%'")).toBe(0);
      expect(countWhere(persistence.database, "app_client_sessions", "id = 'session-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "private_lesson_requests", "id = 'private-lesson-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "event_change_requests", "id = 'event-change-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "tactical_boards", "id = 'tactical-board-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "lesson_credit_ledger", "id = 'lesson-ledger-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "http_idempotency_records", "key = 'cq-talent-secure-test-idempotency'")).toBe(0);
      expect(countWhere(persistence.database, "player_assessments", "id = 'assessment-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "assessment_raw_results", "id = 'assessment-raw-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "assessment_scores", "id = 'assessment-score-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "player_metric_records", "id = 'metric-record-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "metric_lineages", "id = 'metric-lineage-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "matches", "id = 'match-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "match_events", "id = 'match-event-cq-talent-secure-test-scenario'")).toBe(0);
      expect(countWhere(persistence.database, "clubs", "id = 'club-chongqing-talent'")).toBe(1);
      expect(countWhere(persistence.database, "user_accounts", "id = 'user-parent-1'")).toBe(1);
      expect(countWhere(persistence.database, "teams", "id = 'team-u10-dev'")).toBe(1);
      expect(firstTeam).toBe("team-cq-talent-secure-test-1");
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("refuses a tampered rollback manifest before it can target an unrelated user", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      const tampered = {
        ...imported.manifest,
        accountIds: imported.manifest.accountIds.map((account, index) =>
          index === 0 ? { ...account, userId: "user-parent-1" } : account,
        ),
      };

      expect(() => rollbackSecureCqTalentTestAccounts(persistence.database, tampered)).toThrow(/unsupported secure test-account rollback manifest/i);
      expect(countWhere(persistence.database, "user_accounts", "id = 'user-parent-1'")).toBe(1);
      expect(countWhere(persistence.database, "user_accounts", "id LIKE 'user-cq-talent-secure-test-%'")).toBe(3);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("refuses a rollback side-effect id outside the secure operation namespace", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      persistence.database.prepare(`
        INSERT INTO http_idempotency_records (
          key, fingerprint, status_code, payload, content_type, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "unrelated-idempotency",
        "fingerprint",
        200,
        "{}",
        "application/json",
        "2026-08-12T00:00:00.000Z",
        "2026-08-13T00:00:00.000Z",
      );

      expect(() => rollbackSecureCqTalentTestAccounts(persistence.database, {
        ...imported.manifest,
        sideEffects: { httpIdempotencyKeys: ["unrelated-idempotency"] },
      })).toThrow(/unsupported secure test-account rollback manifest/i);
      expect(countWhere(persistence.database, "http_idempotency_records", "key = 'unrelated-idempotency'")).toBe(1);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("refuses rollback when canonical account ownership rows are incomplete", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      persistence.database.prepare(
        "DELETE FROM student_guardian_bindings WHERE id = 'guardian-cq-talent-secure-test-1-1'",
      ).run();

      expect(() => rollbackSecureCqTalentTestAccounts(persistence.database, imported.manifest)).toThrow(
        /incomplete secure test-account installation/i,
      );
      expect(countWhere(persistence.database, "user_accounts", "id = 'user-cq-talent-secure-test-1'")).toBe(1);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("aborts before writing when a fixed identity id is owned by an incompatible row", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      persistence.database.prepare(`
        INSERT INTO user_accounts (id, display_name, phone, roles_json, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "user-cq-talent-secure-test-1",
        "unrelated row",
        null,
        "[\"admin\"]",
        "active",
        "2026-08-12T00:00:00.000Z",
        "2026-08-12T00:00:00.000Z",
      );

      expect(() => importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      })).toThrow(/fixed identity id/i);
      expect(countWhere(persistence.database, "user_accounts", "id LIKE 'user-cq-talent-secure-test-%'")).toBe(1);
      expect(countWhere(persistence.database, "student_profiles", "id LIKE 'student-cq-talent-secure-test-%'")).toBe(0);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("rejects an incomplete installation even when all fixed users still own the requested phones", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      persistence.database.prepare(
        "DELETE FROM student_guardian_bindings WHERE id = 'guardian-cq-talent-secure-test-2-1'",
      ).run();

      expect(() => importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      })).toThrow(/partial existing installation/i);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);
});

function count(database: DatabaseSync, table: string): number {
  return countWhere(database, table, "1 = 1");
}

function countWhere(database: DatabaseSync, table: string, predicate: string): number {
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${predicate}`).get() as { count: number };
  return row.count;
}
