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

    const demoStudents = await repositories.students.listByClub("club-demo");
    const otherStudents = await repositories.students.listByClub("club-other");
    const crossClubLookup = await repositories.students.getByClubAndId("club-demo", "student-other");

    expect(demoStudents.map((student) => student.id)).toEqual(["student-1"]);
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

    const preview = repositories.dataCapability.getImportPreview("club-demo", { reviewStatus: "pending" });
    const link = repositories.dataCapability.confirmExternalRecord(
      "club-demo",
      "external-raw-student-demo",
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
    const confirmedPreview = repositories.dataCapability.getImportPreview("club-demo", { reviewStatus: "confirmed" });
    const crossClubLink = repositories.dataCapability.confirmExternalRecord(
      "club-other",
      "external-raw-student-demo",
      {
        targetType: "student",
        targetId: "student-1",
      },
      {
        linkId: "external-record-link-cross-club",
        now: "2026-06-26T00:00:00.000Z",
      },
    );

    expect(preview.records).toEqual([expect.objectContaining({ id: "external-raw-student-demo" })]);
    expect(link).toEqual(expect.objectContaining({
      clubId: "club-demo",
      rawRecordId: "external-raw-student-demo",
      targetType: "student",
      targetId: "student-1",
    }));
    expect(confirmedPreview.records).toEqual([expect.objectContaining({ reviewStatus: "confirmed" })]);
    expect(crossClubLink).toBeNull();

    database.close();
  });
});
