import type {
  AssessmentMetricBinding,
  AssessmentTemplateVersion,
  ClubFeatureFlag,
  ClubPolicy,
  CustomFieldDefinition,
  EntityId,
  MetricDependency,
  MetricGraphVersion,
  MetricView,
  MetricViewNode,
} from "@football-club/domain";

export interface ExternalSystemConnection {
  id: EntityId;
  clubId: EntityId;
  provider: string;
  name: string;
  status: "draft" | "active" | "paused" | "disabled";
  config: Record<string, unknown>;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalTableMapping {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  externalTableKey: string;
  targetType: string;
  mappingVersion: string;
  status: "draft" | "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ExternalFieldMapping {
  id: EntityId;
  clubId: EntityId;
  tableMappingId: EntityId;
  externalFieldKey: string;
  targetFieldKey: string;
  targetFieldKind: string;
  required: boolean;
  transform?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalSyncRun {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  tableMappingId?: EntityId;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  startedAt?: string;
  finishedAt?: string;
  totalRecords: number;
  importedRecords: number;
  failedRecords: number;
  error?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalRawRecord {
  id: EntityId;
  clubId: EntityId;
  connectionId: EntityId;
  tableMappingId?: EntityId;
  syncRunId?: EntityId;
  externalRecordId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  reviewStatus: "pending" | "confirmed" | "rejected" | "linked";
  validationErrors?: unknown[];
  normalizedPreview?: Record<string, unknown>;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalRecordLink {
  id: EntityId;
  clubId: EntityId;
  rawRecordId: EntityId;
  targetType: string;
  targetId: EntityId;
  linkStatus: "confirmed" | "rejected" | "superseded";
  confirmedBy?: EntityId;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataCapabilityConfig {
  featureFlags: ClubFeatureFlag[];
  policies: ClubPolicy[];
  customFields: CustomFieldDefinition[];
  metricGraphVersions: MetricGraphVersion[];
  metricDependencies: MetricDependency[];
  metricViews: MetricView[];
  metricViewNodes: MetricViewNode[];
  assessmentTemplateVersions: AssessmentTemplateVersion[];
  assessmentMetricBindings: AssessmentMetricBinding[];
  externalConnections: ExternalSystemConnection[];
  tableMappings: ExternalTableMapping[];
  fieldMappings: ExternalFieldMapping[];
}

export interface ClubCapabilities {
  club: {
    id: EntityId;
    code: string;
    name: string;
    timezone: string;
    locale: string;
  };
  features: Record<string, boolean>;
  roles: {
    parent: string[];
    coach: string[];
    admin: string[];
  };
  calendar: {
    eventTypes: string[];
    participantStatuses: string[];
  };
  operations: {
    standardFields: Array<{ key: string; label: string; source: "core" | "operational" | "custom" }>;
    customFields: CustomFieldDefinition[];
    offlineStatuses: Array<{ key: string; label: string }>;
  };
  assessment: {
    graphVersions: MetricGraphVersion[];
    views: MetricView[];
    viewNodes: MetricViewNode[];
    templateVersions: AssessmentTemplateVersion[];
    metricBindings: AssessmentMetricBinding[];
  };
  integration: {
    connections: ExternalSystemConnection[];
    tableMappings: ExternalTableMapping[];
    fieldMappings: ExternalFieldMapping[];
    latestSyncRuns: ExternalSyncRun[];
  };
}

export interface ImportPreviewFilters {
  connectionId?: EntityId;
  tableMappingId?: EntityId;
  reviewStatus?: ExternalRawRecord["reviewStatus"];
}

export interface ConfirmExternalRecordInput {
  targetType: string;
  targetId: EntityId;
  confirmedBy?: EntityId;
}

export interface ImportPreview {
  records: ExternalRawRecord[];
}

export interface StudentListFilters {
  teamId?: EntityId;
  coachId?: EntityId;
  studentStatus?: string;
  school?: string;
  insuranceExpiringSoon?: boolean;
  lessonBalanceLow?: boolean;
}

export interface StudentListItem {
  id: EntityId;
  clubId: EntityId;
  name: string;
  birthDate: string;
  gender?: string;
  currentLevel?: string;
  operationalProfile?: Record<string, unknown>;
  teams: Array<Record<string, unknown>>;
  primaryContact?: Record<string, unknown>;
  lessonBalance?: number;
  insuranceStatus: Record<string, unknown>;
  attendanceSnapshot: Record<string, unknown>;
}

export interface StudentDetail extends StudentListItem {
  contacts: Array<Record<string, unknown>>;
  lessonLedger: Array<Record<string, unknown>>;
  insurancePolicies: Array<Record<string, unknown>>;
}

export interface SyncRunDetail {
  syncRun: ExternalSyncRun;
  rawRecords: ExternalRawRecord[];
  validationSummary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    pendingRecords: number;
    confirmedRecords: number;
    rejectedRecords: number;
  };
}

export interface StageExternalImportRecord {
  rowNumber: number;
  rowHash: string;
  raw: Record<string, unknown>;
}

export interface StageExternalImportInput {
  connectionId: EntityId;
  tableMappingId: EntityId;
  sourceName?: string;
  records: StageExternalImportRecord[];
}

export interface StageExternalImportResult {
  syncRun: ExternalSyncRun;
  records: ExternalRawRecord[];
}

export interface ExcelImportPreviewInput {
  connectionId: EntityId;
  tableMappingId: EntityId;
  contentBase64: string;
  worksheetName?: string;
  headerRow?: number;
  fileName?: string;
}
