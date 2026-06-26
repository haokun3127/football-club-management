import type {
  ExternalFieldMapping,
  ExternalRawRecord,
  ExternalRecordLink,
  ExternalSyncRun,
  ExternalSystemConnection,
  ExternalTableMapping,
} from "../data-capability/types.js";
import type { SeedData } from "./types.js";
import { demoClubId as clubId, seedNow as now } from "./types.js";

export function createDataCapabilitySeed(): Pick<
  SeedData,
  | "externalConnections"
  | "externalTableMappings"
  | "externalFieldMappings"
  | "externalSyncRuns"
  | "externalRawRecords"
  | "externalRecordLinks"
> {
  const externalConnections: ExternalSystemConnection[] = [
    {
      id: "external-connection-wps-demo",
      clubId,
      provider: "wps",
      name: "Demo WPS Workbook",
      status: "active",
      config: {
        mode: "manual_import",
      },
      lastSyncedAt: "2026-06-25T08:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalTableMappings: ExternalTableMapping[] = [
    {
      id: "external-table-students-demo",
      clubId,
      connectionId: "external-connection-wps-demo",
      externalTableKey: "students",
      targetType: "student_operational_profile",
      mappingVersion: "1.0.0",
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalFieldMappings: ExternalFieldMapping[] = [
    {
      id: "external-field-student-name-demo",
      clubId,
      tableMappingId: "external-table-students-demo",
      externalFieldKey: "学员姓名",
      targetFieldKey: "student.name",
      targetFieldKind: "text",
      required: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "external-field-school-demo",
      clubId,
      tableMappingId: "external-table-students-demo",
      externalFieldKey: "学校",
      targetFieldKey: "studentOperationalProfile.schoolName",
      targetFieldKind: "text",
      required: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalSyncRuns: ExternalSyncRun[] = [
    {
      id: "external-sync-run-demo",
      clubId,
      connectionId: "external-connection-wps-demo",
      tableMappingId: "external-table-students-demo",
      status: "completed",
      startedAt: "2026-06-25T08:00:00.000Z",
      finishedAt: "2026-06-25T08:01:00.000Z",
      totalRecords: 1,
      importedRecords: 0,
      failedRecords: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalRawRecords: ExternalRawRecord[] = [
    {
      id: "external-raw-student-demo",
      clubId,
      connectionId: "external-connection-wps-demo",
      tableMappingId: "external-table-students-demo",
      syncRunId: "external-sync-run-demo",
      externalRecordId: "row-2",
      payload: {
        "学员姓名": "Li Ming",
        "学校": "Demo Primary School",
      },
      payloadHash: "demo-row-2-hash",
      reviewStatus: "pending",
      normalizedPreview: {
        studentName: "Li Ming",
        schoolName: "Demo Primary School",
      },
      importedAt: "2026-06-25T08:01:00.000Z",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const externalRecordLinks: ExternalRecordLink[] = [];

  return {
    externalConnections,
    externalTableMappings,
    externalFieldMappings,
    externalSyncRuns,
    externalRawRecords,
    externalRecordLinks,
  };
}
