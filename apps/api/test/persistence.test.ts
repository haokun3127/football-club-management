import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/seed.js";
import { createPlatformRepositories, seedPlatformData } from "../src/persistence/platform-persistence.js";
import { migrate, openSqliteDatabase } from "../src/persistence/sqlite.js";

describe("platform persistence", () => {
  it("runs migrations idempotently", () => {
    const database = openSqliteDatabase(":memory:");

    const first = migrate(database);
    const second = migrate(database);

    expect(first.applied).toEqual([
      "0001_platform_foundation.sql",
      "0002_data_capability_foundation.sql",
    ]);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual(first.applied);

    const tables = database.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name IN (
          'calendar_events',
          'event_participants',
          'student_operational_profiles',
          'student_contacts',
          'custom_field_values',
          'external_system_connections',
          'external_table_mappings',
          'external_field_mappings',
          'external_sync_runs',
          'external_raw_records',
          'external_record_links',
          'metric_graph_versions',
          'metric_dependencies',
          'metric_views',
          'metric_view_nodes',
          'assessment_template_versions',
          'assessment_metric_bindings',
          'assessment_test_items',
          'assessment_raw_results'
        )
      ORDER BY name
    `).all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual([
      "assessment_metric_bindings",
      "assessment_raw_results",
      "assessment_template_versions",
      "assessment_test_items",
      "calendar_events",
      "custom_field_values",
      "event_participants",
      "external_field_mappings",
      "external_raw_records",
      "external_record_links",
      "external_sync_runs",
      "external_system_connections",
      "external_table_mappings",
      "metric_dependencies",
      "metric_graph_versions",
      "metric_view_nodes",
      "metric_views",
      "student_contacts",
      "student_operational_profiles",
    ]);

    database.close();
  });

  it("keeps repository reads scoped by club", async () => {
    const database = openSqliteDatabase(":memory:");
    migrate(database);

    const repositories = createPlatformRepositories(database);
    const data = createSeedData();
    const now = "2026-06-25T00:00:00.000Z";

    data.clubs.push({
      id: "club-other",
      name: "Other Academy",
      code: "other",
      timezone: "Asia/Hong_Kong",
      locale: "zh-CN",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    data.students.push({
      id: "student-other",
      clubId: "club-other",
      name: "Other Student",
      birthDate: "2015-01-01",
      createdAt: now,
      updatedAt: now,
    });

    await seedPlatformData(repositories, data);

    const talentStudents = await repositories.students.listByClub("club-chongqing-talent");
    const otherStudents = await repositories.students.listByClub("club-other");
    const crossClubLookup = await repositories.students.getByClubAndId("club-chongqing-talent", "student-other");

    expect(talentStudents.map((student) => student.id)).toEqual(["student-1"]);
    expect(otherStudents.map((student) => student.id)).toEqual(["student-other"]);
    expect(crossClubLookup).toBeNull();

    await expect(repositories.students.getById("student-other")).rejects.toThrow("Club-scoped repositories require");

    database.close();
  });

  it("persists integration staging records and manual confirmations by club", async () => {
    const database = openSqliteDatabase(":memory:");
    migrate(database);

    const repositories = createPlatformRepositories(database);
    await seedPlatformData(repositories, createSeedData());

    const preview = repositories.dataCapability.getImportPreview("club-chongqing-talent", { reviewStatus: "pending" });
    const link = repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-student-cq-talent",
      {
        targetType: "student",
        targetId: "student-1",
        confirmedBy: "user-coach-1",
      },
      {
        linkId: "external-record-link-test",
        now: "2026-06-26T00:00:00.000Z",
      },
    );
    repositories.dataCapability.saveExternalRawRecord({
      id: "external-raw-payment-test",
      clubId: "club-chongqing-talent",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      externalRecordId: "payment_events:row-2",
      payload: {},
      payloadHash: "payment-test-hash",
      reviewStatus: "pending",
      normalizedPreview: {
        "payment.paidAt": "2026-06-26",
        "payment.type": "线下课时充值",
        "payment.amount": 3200,
        "payment.courseHours": 24,
        "payment.auditPassed": true,
        "payment.stage": "春夏",
      },
      createdAt: "2026-06-26T00:00:00.000Z",
      updatedAt: "2026-06-26T00:00:00.000Z",
    });
    repositories.dataCapability.saveExternalRawRecord({
      id: "external-raw-insurance-test",
      clubId: "club-chongqing-talent",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-insurance-policies-cq-talent",
      externalRecordId: "insurance_policies:row-2",
      payload: {},
      payloadHash: "insurance-test-hash",
      reviewStatus: "pending",
      normalizedPreview: {
        "insurance.purchasedAt": "2026-06-26",
        "insurance.expiresAt": "2027-06-26",
        "insurance.policyNo": "POLICY-001",
        "insurance.vendor": "线下保险公司",
        "insurance.sport": "足球",
        "insurance.auditPassed": true,
      },
      createdAt: "2026-06-26T00:00:00.000Z",
      updatedAt: "2026-06-26T00:00:00.000Z",
    });
    repositories.dataCapability.saveExternalRawRecord({
      id: "external-raw-attendance-test",
      clubId: "club-chongqing-talent",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-attendance-spring-summer-2025-2026-cq-talent",
      externalRecordId: "attendance_2025_2026_spring_summer:row-2",
      payload: {},
      payloadHash: "attendance-test-hash",
      reviewStatus: "pending",
      normalizedPreview: {
        "studentOperationalProfile.schoolName": "重庆天才合作学校",
        "team.name": "周末精英队",
        "attendance.stage": "2025-2026春夏",
        "attendance.termTeamCheckInCount": 9,
        "attendance.teamCourseBalance": 15,
        "attendance.createdAt": "2026-06-26T08:00:00.000Z",
      },
      createdAt: "2026-06-26T00:00:00.000Z",
      updatedAt: "2026-06-26T00:00:00.000Z",
    });
    repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-payment-test",
      { targetType: "student", targetId: "student-1", confirmedBy: "user-coach-1" },
      { linkId: "external-record-link-payment-test", now: "2026-06-26T00:05:00.000Z" },
    );
    repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-insurance-test",
      { targetType: "student", targetId: "student-1", confirmedBy: "user-coach-1" },
      { linkId: "external-record-link-insurance-test", now: "2026-06-26T00:06:00.000Z" },
    );
    repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-attendance-test",
      { targetType: "student", targetId: "student-1", confirmedBy: "user-coach-1" },
      { linkId: "external-record-link-attendance-test", now: "2026-06-26T00:07:00.000Z" },
    );
    const confirmedPreview = repositories.dataCapability.getImportPreview("club-chongqing-talent", { reviewStatus: "confirmed" });
    const crossClubLink = repositories.dataCapability.confirmExternalRecord(
      "club-other",
      "external-raw-student-cq-talent",
      {
        targetType: "student",
        targetId: "student-1",
      },
      {
        linkId: "external-record-link-cross-club",
        now: "2026-06-26T00:00:00.000Z",
      },
    );
    const student = database.prepare(`
      SELECT name, birth_date FROM student_profiles WHERE club_id = ? AND id = ?
    `).get("club-chongqing-talent", "student-1") as Record<string, unknown>;
    const operationalProfile = database.prepare(`
      SELECT school, insurance_expires_at, total_checkins, lesson_balance
      FROM student_operational_profiles
      WHERE club_id = ? AND student_id = ?
    `).get("club-chongqing-talent", "student-1") as Record<string, unknown>;
    const contact = database.prepare(`
      SELECT phone, wechat FROM student_contacts
      WHERE club_id = ? AND student_id = ? AND is_primary_contact = 1
    `).get("club-chongqing-talent", "student-1") as Record<string, unknown>;
    const payment = database.prepare(`
      SELECT amount, lesson_hours, status FROM payment_events
      WHERE club_id = ? AND id = ?
    `).get("club-chongqing-talent", "payment-event-external-raw-payment-test") as Record<string, unknown>;
    const insurance = database.prepare(`
      SELECT expires_at, policy_number, approved FROM insurance_policies
      WHERE club_id = ? AND id = ?
    `).get("club-chongqing-talent", "insurance-policy-external-raw-insurance-test") as Record<string, unknown>;
    const ledgerRows = database.prepare(`
      SELECT entry_type, lesson_delta, balance_after FROM lesson_credit_ledger
      WHERE club_id = ? AND student_id = ?
      ORDER BY id
    `).all("club-chongqing-talent", "student-1") as Array<Record<string, unknown>>;

    expect(preview.records).toEqual([expect.objectContaining({ id: "external-raw-student-cq-talent" })]);
    expect(link).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      rawRecordId: "external-raw-student-cq-talent",
      targetType: "student",
      targetId: "student-1",
    }));
    expect(confirmedPreview.records).toEqual(expect.arrayContaining([expect.objectContaining({ reviewStatus: "confirmed" })]));
    expect(student).toEqual(expect.objectContaining({ name: "李明", birth_date: "2015-05-01" }));
    expect(operationalProfile).toEqual(expect.objectContaining({
      school: "重庆天才合作学校",
      insurance_expires_at: "2027-06-26",
      total_checkins: 9,
      lesson_balance: 15,
    }));
    expect(contact).toEqual(expect.objectContaining({ phone: "13800000000", wechat: "wx_li_parent" }));
    expect(payment).toEqual(expect.objectContaining({ amount: 3200, lesson_hours: 24, status: "confirmed_offline" }));
    expect(insurance).toEqual(expect.objectContaining({ expires_at: "2027-06-26", policy_number: "POLICY-001", approved: 1 }));
    expect(ledgerRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ entry_type: "credit", lesson_delta: 24 }),
      expect.objectContaining({ entry_type: "external_snapshot", balance_after: 15 }),
    ]));
    expect(crossClubLink).toBeNull();

    database.close();
  });
});
