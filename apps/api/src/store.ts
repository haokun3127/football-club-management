import {
  derivePlayerMetricRecord,
  isCatalogVisibleToClub,
  type DerivedMetricResult,
  type EntityId,
} from "@football-club/domain";
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

  listClubs() {
    return this.data.clubs;
  }

  getClubConfig(clubId: EntityId) {
    const club = this.data.clubs.find((item) => item.id === clubId);

    if (!club) {
      return null;
    }

    return {
      club,
      featureFlags: this.data.featureFlags.filter((item) => item.clubId === clubId),
      policies: this.data.policies.filter((item) => item.clubId === clubId && item.active),
      customFields: this.data.customFields.filter((item) => item.clubId === clubId && item.active),
    };
  }

  listCalendarEvents(clubId: EntityId) {
    return this.data.events
      .filter((event) => event.clubId === clubId)
      .map((event) => ({
        ...event,
        participants: this.data.participants.filter((participant) =>
          participant.clubId === clubId && participant.eventId === event.id,
        ),
        trainingSession:
          this.data.trainingSessions.find((session) => session.clubId === clubId && session.eventId === event.id)
          ?? null,
        match: this.data.matches.find((match) => match.clubId === clubId && match.eventId === event.id) ?? null,
      }));
  }

  getStudentTimeline(clubId: EntityId, studentId: EntityId) {
    const eventIds = new Set(
      this.data.participants
        .filter((participant) => participant.clubId === clubId && participant.studentId === studentId)
        .map((participant) => participant.eventId),
    );

    return this.listCalendarEvents(clubId).filter((event) => eventIds.has(event.id));
  }

  listAbilityMetrics(clubId: EntityId) {
    return this.data.metrics.filter((metric) => isCatalogVisibleToClub(metric, clubId));
  }

  getStudentMetrics(clubId: EntityId, studentId: EntityId) {
    return this.data.metricRecords.filter((record) => record.clubId === clubId && record.studentId === studentId);
  }

  computeAttackingContribution(clubId: EntityId, studentId: EntityId): DerivedMetricResult {
    const definition = this.data.derivedMetricDefinitions.find((item) =>
      item.code === "attacking_contribution" && isCatalogVisibleToClub(item, clubId),
    );

    if (!definition) {
      throw new Error("Missing attacking_contribution derived metric definition.");
    }

    const now = new Date().toISOString();
    const result = derivePlayerMetricRecord({
      definition,
      inputRecords: this.getStudentMetrics(clubId, studentId),
      outputRecordId: `metric-record-${clubId}-${studentId}-attacking-contribution`,
      lineageId: `lineage-${clubId}-${studentId}-attacking-contribution`,
      clubId,
      studentId,
      now,
    });

    return result;
  }
}
