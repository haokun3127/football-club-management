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

const runtimePhones = [
  "10000000001",
  "10000000002",
  "10000000003",
  "10000000004",
  "10000000005",
  "10000000006",
  "10000000007",
] as const;

describe("secure Chongqing Talent test-account operation", () => {
  it("reads seven phones from runtime input without embedding phone values in the operation", () => {
    expect(readSecureCqTalentTestAccountPhones({
      SECURE_CQ_TALENT_TEST_PHONE_1: runtimePhones[0],
      SECURE_CQ_TALENT_TEST_PHONE_2: runtimePhones[1],
      SECURE_CQ_TALENT_TEST_PHONE_3: runtimePhones[2],
      SECURE_CQ_TALENT_TEST_PHONE_4: runtimePhones[3],
      SECURE_CQ_TALENT_TEST_PHONE_5: runtimePhones[4],
      SECURE_CQ_TALENT_TEST_PHONE_6: runtimePhones[5],
      SECURE_CQ_TALENT_TEST_PHONE_7: runtimePhones[6],
    })).toEqual(runtimePhones);
  }, FILE_DB_TIMEOUT);

  it("requires seven private runtime phones for the canonical dual-role test-account slots", () => {
    expect(readSecureCqTalentTestAccountPhones({
      SECURE_CQ_TALENT_TEST_PHONE_1: runtimePhones[0],
      SECURE_CQ_TALENT_TEST_PHONE_2: runtimePhones[1],
      SECURE_CQ_TALENT_TEST_PHONE_3: runtimePhones[2],
      SECURE_CQ_TALENT_TEST_PHONE_4: runtimePhones[3],
      SECURE_CQ_TALENT_TEST_PHONE_5: runtimePhones[4],
      SECURE_CQ_TALENT_TEST_PHONE_6: runtimePhones[5],
      SECURE_CQ_TALENT_TEST_PHONE_7: runtimePhones[6],
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
        SECURE_CQ_TALENT_TEST_PHONE_4: runtimePhones[3],
        SECURE_CQ_TALENT_TEST_PHONE_5: runtimePhones[4],
        SECURE_CQ_TALENT_TEST_PHONE_6: runtimePhones[5],
        SECURE_CQ_TALENT_TEST_PHONE_7: runtimePhones[6],
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
        accountCount: 7,
      });
      expect(runSecureCqTalentTestAccountCommand([
        "import",
        "--confirm-secure-cq-talent-test-accounts",
      ], environment)).toEqual({
        operation: "import",
        status: "imported",
        accountCount: 7,
      });
      expect(runSecureCqTalentTestAccountCommand([
        "rollback",
        "--confirm-secure-cq-talent-test-accounts",
      ], environment)).toEqual({
        operation: "rollback",
        status: "rolled_back",
        accountCount: 7,
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
        SECURE_CQ_TALENT_TEST_PHONE_4: runtimePhones[3],
        SECURE_CQ_TALENT_TEST_PHONE_5: runtimePhones[4],
        SECURE_CQ_TALENT_TEST_PHONE_6: runtimePhones[5],
        SECURE_CQ_TALENT_TEST_PHONE_7: runtimePhones[6],
      };

      expect(runSecureCqTalentTestAccountCommand(["import", "--dry-run"], environment)).toEqual({
        operation: "import",
        status: "dry_run",
        accountCount: 7,
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

  it("supports dry-run and imports seven isolated dual-role scopes transactionally", async () => {
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
      expect(imported.manifest.accountIds).toHaveLength(7);
      expect(imported.manifest.accountIds.every((account) => account.studentIds.length === 19)).toBe(true);
      expect(count(persistence.database, "user_accounts")).toBe(10);
      expect(count(persistence.database, "club_user_memberships")).toBe(10);
      expect(count(persistence.database, "parent_profiles")).toBe(8);
      expect(count(persistence.database, "coach_profiles")).toBe(8);
      expect(count(persistence.database, "student_profiles")).toBe(134);
      expect(count(persistence.database, "teams")).toBe(9);
      expect(countWhere(persistence.database, "calendar_events", "id LIKE 'event-cq-talent-secure-test-%'")).toBe(63);
      expect(countWhere(persistence.database, "event_participants", "id LIKE 'participant-cq-talent-secure-test-%'")).toBe(1197);
      expect(countWhere(persistence.database, "student_contacts", "id LIKE 'contact-cq-talent-secure-test-%'")).toBe(14);

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
      expect(parentChildren).toEqual(Array.from({ length: 7 }, (_, index) => ({
        user_id: "user-cq-talent-secure-test-" + (index + 1),
        child_count: 2,
      })));

      const coachScopes = persistence.database.prepare(`
        SELECT c.user_id, COUNT(DISTINCT tm.student_id) AS roster_count
        FROM coach_profiles c
        JOIN teams t ON t.default_coach_id = c.id
        JOIN team_members tm ON tm.team_id = t.id
        WHERE c.id LIKE 'coach-cq-talent-secure-test-%'
        GROUP BY c.user_id
        ORDER BY c.user_id
      `).all() as Array<{ user_id: string; roster_count: number }>;
      expect(coachScopes).toEqual(Array.from({ length: 7 }, (_, index) => ({
        user_id: "user-cq-talent-secure-test-" + (index + 1),
        roster_count: 19,
      })));

      const rerun = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T00:00:00.000Z",
      });
      expect(rerun.status).toBe("already_present");
      expect(count(persistence.database, "user_accounts")).toBe(10);
      expect(count(persistence.database, "student_profiles")).toBe(134);
      expect(rerun.manifest).toEqual(imported.manifest);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("creates rich, restart-safe demo records for each dual-role account", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const now = "2026-08-18T08:00:00.000Z";
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now,
      });
      const account = imported.manifest.accountIds[0]!;

      expect(countWhere(persistence.database, "calendar_events", "id LIKE 'event-cq-talent-secure-test-1%'")).toBe(9);
      expect(countWhere(persistence.database, "event_participants", "event_id LIKE 'event-cq-talent-secure-test-1%'")).toBe(171);
      expect(countWhere(persistence.database, "event_participants", "event_id LIKE 'event-cq-talent-secure-test-1%' AND status IN ('present', 'late', 'absent', 'leave_requested', 'invited', 'confirmed')")).toBeGreaterThanOrEqual(6);
      expect(countForIds(persistence.database, "lesson_credit_ledger", "student_id", account.studentIds)).toBe(114);
      expect(countForIds(persistence.database, "player_assessments", "student_id", account.studentIds)).toBe(19);
      expect(countForIds(persistence.database, "assessment_raw_results", "assessment_id", assessmentIdsForStudents(persistence.database, account.studentIds))).toBe(152);
      expect(countForIds(persistence.database, "assessment_scores", "assessment_id", assessmentIdsForStudents(persistence.database, account.studentIds))).toBe(152);
      expect(countForIds(persistence.database, "player_metric_records", "student_id", account.studentIds)).toBe(152);
      expect(countWhere(persistence.database, "metric_lineages", "id LIKE 'metric-lineage-cq-talent-secure-test-1-%'")).toBe(152);
      expect(countWhere(persistence.database, "matches", "event_id LIKE 'event-cq-talent-secure-test-1%'")).toBe(2);
      expect(countWhere(persistence.database, "match_events", "id LIKE 'match-event-cq-talent-secure-test-1-%'")).toBe(8);
      const foulEvent = persistence.database.prepare(`
        SELECT type, linked_metric_id AS linkedMetricId
        FROM match_events
        WHERE id = ?
      `).get("match-event-cq-talent-secure-test-1-3") as { type: string; linkedMetricId: string | null };
      expect(foulEvent).toEqual({ type: "foul", linkedMetricId: null });
      const matchEventNotes = persistence.database.prepare(`
        SELECT type, note
        FROM match_events
        WHERE id LIKE 'match-event-cq-talent-secure-test-1-%'
        ORDER BY minute, id
      `).all() as Array<{ type: string; note: string }>;
      expect(matchEventNotes).toEqual([
        { type: "goal", note: "禁区前沿接球后低射破门" },
        { type: "assist", note: "右路突破后倒三角传中助攻" },
        { type: "foul", note: "中场回追时拉人犯规" },
        { type: "yellow_card", note: "战术犯规，裁判出示黄牌" },
        { type: "own_goal", note: "回传解围失误造成乌龙" },
        { type: "save", note: "近距离封堵对方射门" },
        { type: "tackle", note: "中场预判成功完成抢断" },
        { type: "goal", note: "反击中接直塞推射得分" },
      ]);
      expect(countWhere(persistence.database, "tactical_boards", "event_id LIKE 'event-cq-talent-secure-test-1%'")).toBe(1);
      expect(countForIds(persistence.database, "insurance_policies", "student_id", account.studentIds.slice(0, 2))).toBe(2);
      expect(countForIds(persistence.database, "private_lesson_requests", "student_id", account.studentIds.slice(0, 2))).toBe(2);
      expect(countForIds(persistence.database, "communication_logs", "student_id", account.studentIds.slice(0, 2))).toBe(4);
      expect(countForIds(persistence.database, "student_operational_profiles", "student_id", account.studentIds.slice(0, 2))).toBe(2);
      expect(countWhere(persistence.database, "calendar_events", "id LIKE 'event-cq-talent-secure-test-1%' AND starts_at > '2026-08-18T08:00:00.000Z'")).toBeGreaterThanOrEqual(2);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("creates five completed training sessions with settlement ledgers across the latest three calendar weeks", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-29T08:00:00.000Z",
      });
      const account = imported.manifest.accountIds[0]!;
      const completedTrainingRows = persistence.database.prepare(`
        SELECT id, starts_at
        FROM calendar_events
        WHERE club_id = ?
          AND primary_team_id = ?
          AND type = 'training'
          AND status = 'completed'
        ORDER BY starts_at
      `).all("club-chongqing-talent", account.teamId) as Array<{ id: string; starts_at: string }>;
      const completedTrainingIds = completedTrainingRows.map((row) => row.id);
      const weeks = completedTrainingRows.map((row) => {
        const date = new Date(row.starts_at);
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        return date.toISOString().slice(0, 10);
      });
      const settledLedgerCount = (persistence.database.prepare(`
        SELECT COUNT(*) AS count
        FROM lesson_credit_ledger
        WHERE student_id IN (${account.studentIds.map(() => "?").join(", ")})
          AND event_id IN (${completedTrainingIds.map(() => "?").join(", ")})
          AND entry_type = 'debit'
      `).get(...account.studentIds, ...completedTrainingIds) as { count: number }).count;

      expect(completedTrainingRows).toHaveLength(5);
      expect(new Set(weeks)).toEqual(new Set(["2026-08-10", "2026-08-17", "2026-08-24"]));
      expect(countForIds(persistence.database, "event_participants", "event_id", completedTrainingIds)).toBe(95);
      expect(settledLedgerCount).toBe(95);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("refreshes a complete secure slot when it still contains a superseded canonical settlement debit", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-29T08:00:00.000Z",
      });
      const account = imported.manifest.accountIds[0]!;
      account.studentIds.forEach((studentId, index) => {
        persistence.database.prepare(`
          INSERT INTO lesson_credit_ledger (
            id, club_id, student_id, team_id, event_id, occurred_at, entry_type,
            lesson_delta, balance_after, source, source_id, actor_user_id, note, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `lesson-ledger-cq-talent-secure-test-1-${index + 1}-debit`,
          "club-chongqing-talent",
          studentId,
          account.teamId,
          "event-cq-talent-secure-test-1-history-training",
          "2026-08-11T10:00:00.000Z",
          "debit",
          -1,
          10 - index,
          "attendance",
          `event-cq-talent-secure-test-1-history-training-${studentId}`,
          account.userId,
          "旧版训练出勤扣课",
          "2026-08-29T08:00:00.000Z",
          "2026-08-29T08:00:00.000Z",
        );
      });

      const refreshed = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-29T08:00:00.000Z",
      });

      expect(refreshed.status).toBe("refreshed");
      expect(countWhere(
        persistence.database,
        "lesson_credit_ledger",
        "id LIKE 'lesson-ledger-cq-talent-secure-test-1-%-debit'",
      )).toBe(0);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("refreshes complete secure demo data into three calendar weeks with Chinese display copy", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const firstRun = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-12T08:00:00.000Z",
      });
      const account = firstRun.manifest.accountIds[0]!;

      const refreshed = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-19T08:00:00.000Z",
      });

      expect(refreshed.status).toBe("refreshed");

      const events = persistence.database.prepare(`
        SELECT title, notes, starts_at, location_id
        FROM calendar_events
        WHERE id IN (?, ?, ?, ?, ?)
        ORDER BY starts_at
      `).all(
        account.eventId,
        "event-cq-talent-secure-test-1-history-training",
        "event-cq-talent-secure-test-1-completed-match",
        "event-cq-talent-secure-test-1-future-training",
        "event-cq-talent-secure-test-1-scheduled-match",
      ) as Array<{ title: string; notes: string; starts_at: string; location_id: string | null }>;
      const weekStarts = events.map((event) => {
        const date = new Date(event.starts_at);
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        return date.toISOString().slice(0, 10);
      });
      expect(new Set(weekStarts)).toEqual(new Set([
        "2026-08-03",
        "2026-08-10",
        "2026-08-17",
        "2026-08-24",
      ]));
      expect(events.map((event) => event.title + event.notes).join("\n")).not.toMatch(/[A-Za-z]{3,}/);
      expect(events.map((event) => event.location_id)).toEqual(expect.arrayContaining([
        "venue-cq-talent-jiulongpo",
        "venue-cq-talent-sport-uni",
        "venue-cq-talent-nanan",
      ]));
      expect(events.every((event) => Boolean(event.location_id))).toBe(true);

      const displayValues = persistence.database.prepare(`
        SELECT display_name AS value FROM user_accounts WHERE id = ?
        UNION ALL SELECT name AS value FROM parent_profiles WHERE id = ?
        UNION ALL SELECT name AS value FROM coach_profiles WHERE id = ?
        UNION ALL SELECT name AS value FROM teams WHERE id = ?
        UNION ALL SELECT name AS value FROM student_profiles WHERE id IN (?, ?)
        UNION ALL SELECT opponent_name AS value FROM matches WHERE id IN (?, ?)
        UNION ALL SELECT coach_name AS value FROM private_lesson_requests WHERE id IN (?, ?)
      `).all(
        account.userId,
        account.parentId,
        account.coachId,
        account.teamId,
        account.studentIds[0],
        account.studentIds[1],
        "match-cq-talent-secure-test-1-completed",
        "match-cq-talent-secure-test-1-scheduled",
        "private-lesson-cq-talent-secure-test-1-1",
        "private-lesson-cq-talent-secure-test-1-2",
      ) as Array<{ value: string }>;
      expect(displayValues.map((row) => row.value).join("\n")).not.toMatch(/[A-Za-z]{3,}/);
      expect(displayValues.map((row) => row.value)).toEqual(expect.arrayContaining([
        "罗志炫",
        "U10精英队",
        "山城少年足球队",
      ]));
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("keeps the canonical upcoming training in the future when the refresh runs later in the day", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const now = "2026-09-04T15:00:00.000Z";
      const imported = importSecureCqTalentTestAccounts(persistence.database, { phones: runtimePhones, now });
      const account = imported.manifest.accountIds[0]!;
      const event = persistence.database.prepare(`
        SELECT starts_at, ends_at, status
        FROM calendar_events
        WHERE id = ?
      `).get(account.eventId) as { starts_at: string; ends_at: string; status: string };

      expect(event.status).toBe("scheduled");
      expect(new Date(event.starts_at).getTime()).toBeGreaterThan(new Date(now).getTime());
      expect(new Date(event.ends_at).getTime()).toBeGreaterThan(new Date(event.starts_at).getTime());
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("reconciles stale legacy secure activities and pending attendance without touching another team", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const now = "2026-09-04T15:00:00.000Z";
      const imported = importSecureCqTalentTestAccounts(persistence.database, { phones: runtimePhones, now });
      const account = imported.manifest.accountIds[0]!;
      const staleEventId = "event-cq-talent-secure-test-1-legacy-pending-state";

      persistence.database.prepare(`
        INSERT INTO calendar_events (
          id, club_id, type, title, starts_at, ends_at, timezone, location_id,
          primary_team_id, owner_coach_id, status, notes, created_at, updated_at
        ) VALUES (?, ?, 'training', ?, ?, ?, 'Asia/Shanghai', ?, ?, NULL, 'scheduled', ?, ?, ?)
      `).run(
        staleEventId,
        "club-chongqing-talent",
        "历史待收口训练",
        "2026-08-26T10:00:00.000Z",
        "2026-08-26T12:00:00.000Z",
        "venue-cq-talent-sport-uni",
        account.teamId,
        "早期测试活动",
        now,
        now,
      );
      persistence.database.prepare(`
        INSERT INTO event_participants (id, club_id, event_id, student_id, status, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'confirmed', '已确认参加', ?, ?)
      `).run(
        "participant-cq-talent-secure-test-1-legacy-pending-state-1",
        "club-chongqing-talent",
        staleEventId,
        account.studentIds[0],
        now,
        now,
      );
      persistence.database.prepare(`
        INSERT INTO teams (id, club_id, name, age_group, level, default_coach_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'U10', 'development', NULL, 'active', ?, ?)
      `).run("team-unrelated-pending-state", "club-chongqing-talent", "无关队伍", now, now);
      persistence.database.prepare(`
        INSERT INTO calendar_events (
          id, club_id, type, title, starts_at, ends_at, timezone, location_id,
          primary_team_id, owner_coach_id, status, notes, created_at, updated_at
        ) VALUES (?, ?, 'training', ?, ?, ?, 'Asia/Shanghai', ?, ?, NULL, 'scheduled', ?, ?, ?)
      `).run(
        "event-unrelated-pending-state",
        "club-chongqing-talent",
        "无关历史训练",
        "2026-08-26T10:00:00.000Z",
        "2026-08-26T12:00:00.000Z",
        "venue-cq-talent-sport-uni",
        "team-unrelated-pending-state",
        "不属于测试账号的数据",
        now,
        now,
      );

      const refreshed = importSecureCqTalentTestAccounts(persistence.database, { phones: runtimePhones, now });

      expect(refreshed.status).toBe("refreshed");
      expect(persistence.database.prepare("SELECT status FROM calendar_events WHERE id = ?").get(staleEventId)).toEqual({ status: "completed" });
      expect(persistence.database.prepare("SELECT status, note FROM event_participants WHERE event_id = ?").get(staleEventId)).toEqual({
        status: "present",
        note: "已到场",
      });
      expect(persistence.database.prepare("SELECT status FROM calendar_events WHERE id = ?").get(
        "event-unrelated-pending-state",
      )).toEqual({ status: "scheduled" });
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("backfills venues for legacy activities scoped to a secure demo team without touching another team", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const now = "2026-08-30T08:00:00.000Z";
      const imported = importSecureCqTalentTestAccounts(persistence.database, { phones: runtimePhones, now });
      const account = imported.manifest.accountIds[0]!;

      persistence.database.prepare(`
        INSERT INTO calendar_events (
          id, club_id, type, title, starts_at, ends_at, timezone, location_id,
          primary_team_id, owner_coach_id, status, notes, created_at, updated_at
        ) VALUES (?, ?, 'training', ?, ?, ?, 'Asia/Shanghai', NULL, ?, NULL, 'completed', ?, ?, ?)
      `).run(
        "event-cq-talent-secure-test-1-legacy-venue-gap",
        "club-chongqing-talent",
        "历史专项训练",
        "2026-08-18T10:00:00.000Z",
        "2026-08-18T12:00:00.000Z",
        account.teamId,
        "早期测试记录",
        now,
        now,
      );
      persistence.database.prepare(`
        INSERT INTO teams (id, club_id, name, age_group, level, default_coach_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'U10', 'development', NULL, 'active', ?, ?)
      `).run("team-unrelated-venue-gap", "club-chongqing-talent", "无关队伍", now, now);
      persistence.database.prepare(`
        INSERT INTO calendar_events (
          id, club_id, type, title, starts_at, ends_at, timezone, location_id,
          primary_team_id, owner_coach_id, status, notes, created_at, updated_at
        ) VALUES (?, ?, 'training', ?, ?, ?, 'Asia/Shanghai', NULL, ?, NULL, 'completed', ?, ?, ?)
      `).run(
        "event-unrelated-venue-gap",
        "club-chongqing-talent",
        "无关历史训练",
        "2026-08-18T10:00:00.000Z",
        "2026-08-18T12:00:00.000Z",
        "team-unrelated-venue-gap",
        "不属于测试账号的数据",
        now,
        now,
      );

      const refreshed = importSecureCqTalentTestAccounts(persistence.database, { phones: runtimePhones, now });

      expect(refreshed.status).toBe("refreshed");
      expect(persistence.database.prepare("SELECT location_id FROM calendar_events WHERE id = ?").get(
        "event-cq-talent-secure-test-1-legacy-venue-gap",
      )).toEqual({ location_id: "venue-cq-talent-sport-uni" });
      expect(persistence.database.prepare("SELECT location_id FROM calendar_events WHERE id = ?").get(
        "event-unrelated-venue-gap",
      )).toEqual({ location_id: null });
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("refreshes stale canonical match-event display copy without waiting for the calendar window to move", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-30T08:00:00.000Z",
      });
      persistence.database.prepare(`
        UPDATE match_events
        SET note = ?
        WHERE id = ?
      `).run("比赛关键事件记录", "match-event-cq-talent-secure-test-1-1");

      const refreshed = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-30T08:00:00.000Z",
      });

      expect(refreshed.status).toBe("refreshed");
      const event = persistence.database.prepare(`
        SELECT type, note
        FROM match_events
        WHERE id = ?
      `).get("match-event-cq-talent-secure-test-1-1") as { type: string; note: string };
      expect(event).toEqual({ type: "goal", note: "禁区前沿接球后低射破门" });
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("upgrades an existing two-child secure slot into the nineteen-player coach roster", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-18T08:00:00.000Z",
      });
      const first = imported.manifest.accountIds[0]!;
      const legacyCoachOnlyIds = first.studentIds.slice(2);
      const placeholders = legacyCoachOnlyIds.map(() => "?").join(", ");

      persistence.database.prepare(
        "DELETE FROM student_profiles WHERE id IN (" + placeholders + ")",
      ).run(...legacyCoachOnlyIds);

      const upgraded = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-18T08:00:00.000Z",
      });

      expect(upgraded.status).toBe("imported");
      expect(countForIds(persistence.database, "student_profiles", "id", first.studentIds)).toBe(19);
      expect(countForIds(persistence.database, "team_members", "student_id", first.studentIds)).toBe(19);
      expect(countForIds(persistence.database, "student_guardian_bindings", "student_id", first.studentIds)).toBe(2);
    } finally {
      persistence.database.close();
    }
  }, FILE_DB_TIMEOUT);

  it("keeps legacy guardian operational profiles while recognizing the secure demo as complete", async () => {
    const persistence = await createPlatformPersistence({ databasePath: ":memory:" });

    try {
      const imported = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-18T08:00:00.000Z",
      });
      const first = imported.manifest.accountIds[0]!;
      const guardianStudents = first.studentIds.slice(0, 2);

      persistence.database.prepare(
        "DELETE FROM student_operational_profiles WHERE id IN (?, ?)",
      ).run(
        "operational-profile-cq-talent-secure-test-1-1",
        "operational-profile-cq-talent-secure-test-1-2",
      );
      guardianStudents.forEach((studentId, index) => {
        persistence.database.prepare(`
          INSERT INTO student_operational_profiles (
            id, club_id, student_id, region, school, student_status,
            communication_stage, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "legacy-operational-profile-" + (index + 1),
          "club-chongqing-talent",
          studentId,
          "重庆",
          "Legacy demo school " + (index + 1),
          "active",
          "follow_up",
          "2026-08-01T00:00:00.000Z",
          "2026-08-01T00:00:00.000Z",
        );
      });

      const rerun = importSecureCqTalentTestAccounts(persistence.database, {
        phones: runtimePhones,
        now: "2026-08-18T08:00:00.000Z",
      });

      expect(rerun.status).toBe("already_present");
      expect(countForIds(persistence.database, "student_operational_profiles", "id", [
        "legacy-operational-profile-1",
        "legacy-operational-profile-2",
      ])).toBe(2);
      expect(countForIds(persistence.database, "student_operational_profiles", "id", [
        "operational-profile-cq-talent-secure-test-1-1",
        "operational-profile-cq-talent-secure-test-1-2",
      ])).toBe(0);
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
      expect(parent.json().children.map((child: { id: string }) => child.id)).toEqual(first.studentIds.slice(0, 2));
      expect(parent.payload).not.toContain("phone");
      expect(parent.payload).not.toContain(second.studentIds[0]!);

      const parentCalendar = await app.inject({
        method: "GET",
        url: base + "/parent/calendar?from=2026-07-29&to=2026-08-28",
        headers: { authorization: "Bearer " + parentToken },
      });
      expect(parentCalendar.statusCode).toBe(200);
      expect((parentCalendar.json() as { events: unknown[] }).events).toHaveLength(8);

      const growth = await app.inject({
        method: "GET",
        url: base + "/parent/students/" + first.studentIds[0] + "/growth-summary",
        headers: { authorization: "Bearer " + parentToken },
      });
      expect(growth.statusCode).toBe(200);
      expect((growth.json() as { latest: unknown[] }).latest).toHaveLength(8);

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

      const coachHome = await app.inject({
        method: "GET",
        url: base + "/coach/home?from=2026-07-29&to=2026-08-28",
        headers: { authorization: "Bearer " + coachToken },
      });
      expect(coachHome.statusCode).toBe(200);
      const coachHomeBody = coachHome.json() as { workbench: { events: Array<{ venue?: string }> } };
      expect(coachHomeBody.workbench.events).toHaveLength(8);
      expect(coachHomeBody.workbench.events.map((event) => event.venue)).toEqual(expect.arrayContaining([
        "九龙坡足球公园",
        "重庆体育学院训练馆",
        "南岸足球公园",
      ]));

      const scheduledMatchId = "event-cq-talent-secure-test-" + first.slot + "-scheduled-match";
      const match = await app.inject({
        method: "GET",
        url: base + "/coach/events/" + scheduledMatchId + "/match",
        headers: { authorization: "Bearer " + coachToken },
      });
      expect(match.statusCode).toBe(200);
      expect((match.json() as { match: { status: string } | null }).match?.status).toBe("scheduled");

      const tactical = await app.inject({
        method: "GET",
        url: base + "/coach/events/" + scheduledMatchId + "/tactical-board",
        headers: { authorization: "Bearer " + coachToken },
      });
      expect(tactical.statusCode).toBe(200);
      expect((tactical.json() as { saved: boolean; board: { players: unknown[] } }).saved).toBe(true);
      const tacticalBody = tactical.json() as { board: { players: Array<{ role: string }> } };
      expect(tacticalBody.board.players).toHaveLength(19);
      expect(tacticalBody.board.players.filter((player) => player.role === "starter")).toHaveLength(11);
      expect(tacticalBody.board.players.filter((player) => player.role === "substitute")).toHaveLength(8);
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
      expect(countWhere(persistence.database, "user_accounts", "id LIKE 'user-cq-talent-secure-test-%'")).toBe(7);
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

function countForIds(database: DatabaseSync, table: string, column: string, ids: readonly string[]): number {
  const placeholders = ids.map(() => "?").join(", ");
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${column} IN (${placeholders})`).get(...ids) as { count: number };
  return row.count;
}

function assessmentIdsForStudents(database: DatabaseSync, studentIds: readonly string[]): string[] {
  const placeholders = studentIds.map(() => "?").join(", ");
  return (database.prepare(`SELECT id FROM player_assessments WHERE student_id IN (${placeholders})`).all(...studentIds) as Array<{ id: string }>).map((row) => row.id);
}
