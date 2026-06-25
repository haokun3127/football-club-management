import { derivePlayerMetricRecord, type DerivedMetricResult, type EntityId } from "@football-club/domain";
import { createSeedData, type SeedData } from "./seed.js";

export class InMemoryStore {
  private readonly data: SeedData;

  constructor(data: SeedData = createSeedData()) {
    this.data = data;
  }

  getHealth() {
    return {
      status: "ok",
      service: "@football-club/api",
    };
  }

  listCalendarEvents() {
    return this.data.events.map((event) => ({
      ...event,
      participants: this.data.participants.filter((participant) => participant.eventId === event.id),
      trainingSession: this.data.trainingSessions.find((session) => session.eventId === event.id) ?? null,
      match: this.data.matches.find((match) => match.eventId === event.id) ?? null,
    }));
  }

  getStudentTimeline(studentId: EntityId) {
    const eventIds = new Set(
      this.data.participants
        .filter((participant) => participant.studentId === studentId)
        .map((participant) => participant.eventId),
    );

    return this.listCalendarEvents().filter((event) => eventIds.has(event.id));
  }

  listAbilityMetrics() {
    return this.data.metrics;
  }

  getStudentMetrics(studentId: EntityId) {
    return this.data.metricRecords.filter((record) => record.studentId === studentId);
  }

  computeAttackingContribution(studentId: EntityId): DerivedMetricResult {
    const definition = this.data.derivedMetricDefinitions.find((item) => item.code === "attacking_contribution");

    if (!definition) {
      throw new Error("Missing attacking_contribution derived metric definition.");
    }

    const now = new Date().toISOString();
    const result = derivePlayerMetricRecord({
      definition,
      inputRecords: this.getStudentMetrics(studentId),
      outputRecordId: `metric-record-${studentId}-attacking-contribution`,
      lineageId: `lineage-${studentId}-attacking-contribution`,
      studentId,
      now,
    });

    return result;
  }
}
