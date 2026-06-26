import { describe, expect, it } from "vitest";
import { createSeedData } from "../src/seed.js";
import { createPlatformRepositories, seedPlatformData } from "../src/persistence/platform-persistence.js";
import { migrate, openSqliteDatabase } from "../src/persistence/sqlite.js";
import { PersistentApiStore } from "../src/store.js";

describe("platform persistence", () => {
  it("runs migrations idempotently", () => {
    const database = openSqliteDatabase(":memory:");

    const first = migrate(database);
    const second = migrate(database);

    expect(first.applied).toEqual([
      "0001_platform_foundation.sql",
      "0002_data_capability_foundation.sql",
      "0003_status_flow_audit_fields.sql",
      "0004_http_idempotency_records.sql",
      "0005_privacy_foundation.sql",
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
          'club_app_clients',
          'external_system_connections',
          'external_table_mappings',
          'external_field_mappings',
          'external_sync_policies',
          'external_sync_runs',
          'external_raw_records',
          'external_record_links',
          'http_idempotency_records',
          'privacy_field_policies',
          'privacy_notice_versions',
          'student_consent_records',
          'privacy_audit_logs',
          'privacy_requests',
          'privacy_retention_policies',
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
      "club_app_clients",
      "custom_field_values",
      "event_participants",
      "external_field_mappings",
      "external_raw_records",
      "external_record_links",
      "external_sync_policies",
      "external_sync_runs",
      "external_system_connections",
      "external_table_mappings",
      "http_idempotency_records",
      "metric_dependencies",
      "metric_graph_versions",
      "metric_view_nodes",
      "metric_views",
      "privacy_audit_logs",
      "privacy_field_policies",
      "privacy_notice_versions",
      "privacy_requests",
      "privacy_retention_policies",
      "student_consent_records",
      "student_contacts",
      "student_operational_profiles",
    ]);

    database.close();
  });

  it("persists WPS sync policies and runs deterministic staging through the store", async () => {
    const database = openSqliteDatabase(":memory:");
    migrate(database);

    const repositories = createPlatformRepositories(database);
    await seedPlatformData(repositories, createSeedData());
    const store = new PersistentApiStore(repositories);

    const seededPolicies = repositories.dataCapability.listExternalSyncPolicies("club-chongqing-talent");
    const appClients = repositories.dataCapability.listClubAppClients("club-chongqing-talent");
    const created = store.createExternalSyncPolicy("club-chongqing-talent", {
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      name: "Payment WPS Manual Sync",
      status: "active",
      triggerMode: "manual",
      direction: "inbound",
      applyPolicy: "manual_confirm",
      conflictPolicy: "manual_review",
      writebackPolicy: "disabled",
    });
    const updated = store.updateExternalSyncPolicy("club-chongqing-talent", created.id, {
      name: "Payment WPS Manual Sync Updated",
      conflictPolicy: "external_wins",
    });
    const firstRun = await store.runExternalSyncPolicy("club-chongqing-talent", created.id);
    const secondRun = await store.runExternalSyncPolicy("club-chongqing-talent", created.id);
    const rawRecords = repositories.dataCapability.getImportPreview("club-chongqing-talent", {
      tableMappingId: "external-table-payment-events-cq-talent",
    }).records.filter((record) => record.externalRecordId === "payment_events:stub-row-1");
    const rawRecordCount = database.prepare(`
      SELECT COUNT(*) AS count FROM external_raw_records
      WHERE club_id = ? AND table_mapping_id = ? AND external_record_id = 'payment_events:stub-row-1'
    `).get("club-chongqing-talent", "external-table-payment-events-cq-talent") as Record<string, unknown>;
    const outbound = store.createExternalSyncPolicy("club-chongqing-talent", {
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      name: "Outbound Disabled Run",
      status: "active",
      triggerMode: "manual",
      direction: "outbound",
      applyPolicy: "manual_confirm",
      conflictPolicy: "manual_review",
      writebackPolicy: "disabled",
    });
    const scheduled = store.createExternalSyncPolicy("club-chongqing-talent", {
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      name: "Payment Scheduled Sync",
      status: "active",
      triggerMode: "scheduled",
      schedule: { kind: "interval_minutes", intervalMinutes: 30 },
      direction: "inbound",
      applyPolicy: "manual_confirm",
      conflictPolicy: "manual_review",
      writebackPolicy: "disabled",
    });
    const due = store.planDueExternalSyncPolicies("club-chongqing-talent", "2026-06-27T09:00:00.000Z");
    const webhook = store.ingestWpsWebhook("club-chongqing-talent", {
      eventId: "persistent-event-001",
      eventType: "table.updated",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      policyId: scheduled.id,
      occurredAt: "2026-06-26T09:05:00.000Z",
    });

    expect(seededPolicies).toEqual([expect.objectContaining({
      id: "external-sync-policy-wps-cq-talent-manual",
      direction: "inbound",
      applyPolicy: "manual_confirm",
    })]);
    expect(appClients).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "app-client-cq-talent-wechat-main", appId: "wx-cq-talent-main" }),
      expect.objectContaining({ id: "app-client-cq-talent-admin", clientKey: "cq-talent-admin" }),
    ]));
    expect(created).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      status: "active",
    }));
    expect(updated).toEqual(expect.objectContaining({
      name: "Payment WPS Manual Sync Updated",
      conflictPolicy: "external_wins",
    }));
    expect(firstRun).toEqual(expect.objectContaining({
      policy: expect.objectContaining({ id: created.id }),
      syncRun: expect.objectContaining({ status: "completed", totalRecords: 1 }),
      records: [expect.objectContaining({
        tableMappingId: "external-table-payment-events-cq-talent",
        normalizedPreview: expect.objectContaining({
          "student.identityNumber": "500000201505010000",
          "payment.courseHours": 24,
        }),
      })],
    }));
    expect(secondRun?.records[0]?.id).toBe(firstRun?.records[0]?.id);
    expect(rawRecordCount.count).toBe(1);
    expect(rawRecords).toHaveLength(1);
    await expect(store.runExternalSyncPolicy("club-chongqing-talent", outbound.id)).rejects.toThrow("Only inbound sync policies can be run in MVP.");
    expect(due.policies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        policy: expect.objectContaining({ id: scheduled.id }),
        due: true,
      }),
    ]));
    expect(webhook).toEqual(expect.objectContaining({
      status: "queued",
      matchedPolicy: expect.objectContaining({ id: scheduled.id }),
      syncRun: expect.objectContaining({ status: "queued", totalRecords: 0 }),
    }));

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
    repositories.dataCapability.saveExternalRawRecord({
      id: "external-raw-assessment-test",
      clubId: "club-chongqing-talent",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-talent-elite-assessment-cq-talent",
      externalRecordId: "talent_elite_assessment:row-2",
      payload: {},
      payloadHash: "assessment-test-hash",
      reviewStatus: "pending",
      normalizedPreview: {
        "assessment.coreAbility": "进攻能力",
        "assessment.secondaryMetric": "射门终结",
        "assessment.atomicMetric": "正脚背射门",
        "assessment.testItem": "禁区外射门",
        "assessment.recommendedTraining": "射门专项",
      },
      createdAt: "2026-06-26T00:00:00.000Z",
      updatedAt: "2026-06-26T00:00:00.000Z",
    });
    repositories.dataCapability.saveExternalRawRecord({
      id: "external-raw-invalid-test",
      clubId: "club-chongqing-talent",
      connectionId: "external-connection-wps-cq-talent",
      tableMappingId: "external-table-payment-events-cq-talent",
      externalRecordId: "payment_events:row-invalid",
      payload: {},
      payloadHash: "payment-invalid-hash",
      reviewStatus: "pending",
      validationErrors: [{ field: "payment.paidAt", message: "收费日期缺失" }],
      normalizedPreview: {
        "payment.type": "线下课时充值",
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
    const assessmentLink = repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-assessment-test",
      { targetType: "student", targetId: "student-1", confirmedBy: "user-coach-1" },
      { linkId: "external-record-link-assessment-test", now: "2026-06-26T00:08:00.000Z" },
    );
    const duplicatePaymentLink = repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-payment-test",
      { targetType: "student", targetId: "student-1", confirmedBy: "user-coach-1" },
      { linkId: "external-record-link-payment-test-duplicate", now: "2026-06-26T00:09:00.000Z" },
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
    const paymentCount = database.prepare(`
      SELECT COUNT(*) AS count FROM payment_events
      WHERE club_id = ? AND id = ?
    `).get("club-chongqing-talent", "payment-event-external-raw-payment-test") as Record<string, unknown>;
    const paymentLedgerCount = database.prepare(`
      SELECT COUNT(*) AS count FROM lesson_credit_ledger
      WHERE club_id = ? AND payment_event_id = ?
    `).get("club-chongqing-talent", "payment-event-external-raw-payment-test") as Record<string, unknown>;
    const assessmentDraft = database.prepare(`
      SELECT name, status FROM metric_graph_versions
      WHERE id = ?
    `).get("metric-graph-draft-external-raw-assessment-test") as Record<string, unknown>;
    const assessmentDraftNode = database.prepare(`
      SELECT label FROM metric_view_nodes
      WHERE id = ?
    `).get("metric-view-node-draft-external-raw-assessment-test") as Record<string, unknown>;
    const studentDetail = repositories.dataCapability.getStudentDetail("club-chongqing-talent", "student-1");
    const filteredStudents = repositories.dataCapability.listStudents("club-chongqing-talent", {
      teamId: "team-u10-dev",
      coachId: "coach-1",
      studentStatus: "在训",
      school: "重庆天才合作学校",
      lessonBalanceLow: false,
    });
    const syncRunDetail = repositories.dataCapability.getSyncRunDetail("club-chongqing-talent", "external-sync-run-cq-talent");

    expect(preview.records).toEqual([expect.objectContaining({ id: "external-raw-student-cq-talent" })]);
    expect(link).toEqual(expect.objectContaining({
      clubId: "club-chongqing-talent",
      rawRecordId: "external-raw-student-cq-talent",
      targetType: "student",
      targetId: "student-1",
    }));
    expect(assessmentLink).toEqual(expect.objectContaining({
      rawRecordId: "external-raw-assessment-test",
      linkStatus: "confirmed",
    }));
    expect(duplicatePaymentLink).toEqual(expect.objectContaining({
      id: "external-record-link-payment-test",
      rawRecordId: "external-raw-payment-test",
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
    expect(paymentCount.count).toBe(1);
    expect(paymentLedgerCount.count).toBe(1);
    expect(assessmentDraft).toEqual(expect.objectContaining({
      name: "导入草稿：进攻能力",
      status: "draft",
    }));
    expect(assessmentDraftNode).toEqual(expect.objectContaining({
      label: "进攻能力 / 射门终结 / 正脚背射门 / 禁区外射门",
    }));
    expect(() => repositories.dataCapability.confirmExternalRecord(
      "club-chongqing-talent",
      "external-raw-invalid-test",
      { targetType: "student", targetId: "student-1", confirmedBy: "user-coach-1" },
      { linkId: "external-record-link-invalid-test", now: "2026-06-26T00:10:00.000Z" },
    )).toThrow("Cannot confirm external record with validation errors.");
    expect(studentDetail).toEqual(expect.objectContaining({
      id: "student-1",
      primaryContact: expect.objectContaining({ phone: "13800000000" }),
      lessonBalance: 15,
      insuranceStatus: expect.objectContaining({ policyNumber: "POLICY-001", approved: true }),
      attendanceSnapshot: expect.objectContaining({ totalCheckins: 9, lessonBalance: 15 }),
      teams: expect.arrayContaining([expect.objectContaining({ teamId: "team-u10-dev" })]),
    }));
    expect(studentDetail?.contacts).toEqual([expect.objectContaining({ relationship: "guardian" })]);
    expect(studentDetail?.lessonLedger).toEqual(expect.arrayContaining([expect.objectContaining({ entryType: "credit" })]));
    expect(studentDetail?.insurancePolicies).toEqual([expect.objectContaining({ policyNumber: "POLICY-001" })]);
    expect(filteredStudents).toEqual([expect.objectContaining({ id: "student-1", lessonBalance: 15 })]);
    expect(syncRunDetail).toEqual(expect.objectContaining({
      validationSummary: expect.objectContaining({
        totalRecords: 1,
        confirmedRecords: 1,
      }),
    }));
    expect(crossClubLink).toBeNull();

    database.close();
  });
});
