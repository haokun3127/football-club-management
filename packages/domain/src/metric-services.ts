import {
  derivePlayerMetricRecord,
  type DerivedMetricDefinition,
  type DerivedMetricResult,
  type MetricLineage,
  type MetricSourceKind,
  type PlayerMetricRecord,
} from "./metrics.js";
import type { EntityId } from "./primitives.js";
import type { Clock, IdGenerator } from "./ports.js";

export interface MetricRecordStore {
  saveMetricRecord(record: PlayerMetricRecord): Promise<void> | void;
  saveMetricLineage(lineage: MetricLineage): Promise<void> | void;
  listMetricRecordsByStudent(clubId: EntityId, studentId: EntityId): Promise<PlayerMetricRecord[]> | PlayerMetricRecord[];
}

export interface MetricCatalogLookup {
  findDerivedDefinitionByCode(clubId: EntityId, code: string): Promise<DerivedMetricDefinition | null> | DerivedMetricDefinition | null;
}

export interface MetricServiceDependencies {
  clock: Clock;
  ids: IdGenerator;
  store: MetricRecordStore;
  catalog: MetricCatalogLookup;
}

export interface ListStudentMetricRecordsOptions {
  source?: MetricSourceKind | MetricSourceKind[];
}

export function createMetricService(dependencies: MetricServiceDependencies) {
  return {
    async listStudentMetricRecords(
      clubId: EntityId,
      studentId: EntityId,
      options: ListStudentMetricRecordsOptions = {},
    ): Promise<PlayerMetricRecord[]> {
      const records = await dependencies.store.listMetricRecordsByStudent(clubId, studentId);
      const sources = options.source
        ? new Set(Array.isArray(options.source) ? options.source : [options.source])
        : null;

      return records
        .filter((record) => record.clubId === clubId && record.studentId === studentId)
        .filter((record) => (sources ? sources.has(record.source) : true))
        .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
    },

    async computeDerivedMetric(
      clubId: EntityId,
      studentId: EntityId,
      definitionCode: string,
    ): Promise<DerivedMetricResult> {
      const definition = await dependencies.catalog.findDerivedDefinitionByCode(clubId, definitionCode);
      if (!definition) {
        throw new Error(`Missing derived metric definition ${definitionCode}.`);
      }

      const now = dependencies.clock.now();
      const inputRecords = (await dependencies.store.listMetricRecordsByStudent(clubId, studentId))
        .filter((record) => record.clubId === clubId && record.studentId === studentId);

      const result = derivePlayerMetricRecord({
        definition,
        inputRecords,
        outputRecordId: dependencies.ids.next("metric-record"),
        lineageId: dependencies.ids.next("metric-lineage"),
        clubId,
        studentId,
        now,
      });

      await dependencies.store.saveMetricRecord(result.record);
      await dependencies.store.saveMetricLineage(result.lineage);

      return result;
    },
  };
}
