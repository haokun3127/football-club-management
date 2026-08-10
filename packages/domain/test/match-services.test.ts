import { describe, expect, it } from "vitest";
import { createMatchService, type MatchCatalogLookup, type MatchStore } from "../src/index.js";

const now = "2026-06-25T10:00:00.000Z";

function metric(id: string, code: string) {
  return {
    id,
    catalogScope: { scope: "system" as const },
    code,
    name: code,
    dimensionId: "dimension-match",
    valueKind: "count" as const,
    metricKind: "atomic" as const,
    createdAt: now,
    updatedAt: now,
  };
}

describe("createMatchService", () => {
  it("builds one match-event bundle before one atomic store save", async () => {
    const saved = { bundles: [] as Array<{ event: { id: string; type: string }; metricRecords: Array<{ id: string }> }> };
    const catalog: MatchCatalogLookup = {
      findMetricById: async () => null,
      findMetricByCode: async (_clubId, code) => code === "match_goals" ? metric("metric-goals", code) : null,
    };
    const store = {
      saveMatch: async () => {},
      saveRoster: async () => {},
      saveEvent: async () => {},
      saveNote: async () => {},
      saveMetricRecord: async () => {},
      saveEventBundle: async (bundle: { event: { id: string; type: string }; metricRecords: Array<{ id: string }> }) => {
        saved.bundles.push(bundle);
      },
    } as MatchStore & { saveEventBundle: (bundle: { event: { id: string; type: string }; metricRecords: Array<{ id: string }> }) => Promise<void> };
    let idCounter = 0;
    const service = createMatchService({
      clock: { now: () => now },
      ids: { next: (prefix = "id") => `${prefix}-${++idCounter}` },
      store,
      catalog,
    }) as ReturnType<typeof createMatchService> & {
      recordMatchEvent: (input: { clubId: string; eventId: string; matchId: string; studentId: string; type: "goal"; minute: number; note: string }) => Promise<{ event: { id: string; linkedMetricId?: string }; metricRecords: Array<{ id: string }> }>;
    };

    const result = await service.recordMatchEvent({
      clubId: "club-chongqing-talent",
      eventId: "event-match-1",
      matchId: "match-1",
      studentId: "student-1",
      type: "goal",
      minute: 45,
      note: "Recorded fact",
    });

    expect(result.event.linkedMetricId).toBe("metric-goals");
    expect(result.metricRecords).toHaveLength(1);
    expect(saved.bundles).toHaveLength(1);
    expect(saved.bundles[0]?.metricRecords).toHaveLength(1);
  });

  it("records match events and generates match metric records", async () => {
    const saved = {
      matches: [],
      rosters: [],
      events: [],
      notes: [],
      metricRecords: [],
    };

    const catalog: MatchCatalogLookup = {
      findMetricById: async () => null,
      findMetricByCode: async (_clubId, code) => {
        if (code === "match_goals") {
          return metric("metric-goals", code);
        }
        if (code === "match_assists") {
          return metric("metric-assists", code);
        }
        return null;
      },
    };

    const store: MatchStore = {
      saveMatch: async (match) => saved.matches.push(match),
      saveRoster: async (roster) => saved.rosters.push(roster),
      saveEvent: async (event) => saved.events.push(event),
      saveNote: async (note) => saved.notes.push(note),
      saveMetricRecord: async (record) => saved.metricRecords.push(record),
    };

    let idCounter = 0;
    const service = createMatchService({
      clock: { now: () => now },
      ids: {
        next: (prefix = "id") => `${prefix}-${++idCounter}`,
      },
      store,
      catalog,
    });

    const result = await service.recordMatchSummary({
      clubId: "club-chongqing-talent",
      eventId: "event-match-1",
      matchType: "friendly",
      status: "completed",
      opponentName: "重庆中心小学U10",
      homeScore: 2,
      awayScore: 1,
      rosters: [
        {
          studentId: "student-1",
          started: true,
          minutesPlayed: 60,
          position: "FW",
        },
      ],
      events: [
        {
          studentId: "student-1",
          type: "goal",
          minute: 18,
        },
        {
          studentId: "student-1",
          type: "assist",
          minute: 42,
        },
      ],
      notes: [
        {
          studentId: "student-1",
          coachId: "coach-1",
          note: "Strong attacking performance.",
        },
      ],
    });

    expect(result.match.status).toBe("completed");
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.linkedMetricId).toBe("metric-goals");
    expect(result.metricRecords.map((record) => record.metricId)).toEqual(["metric-goals", "metric-assists"]);
    expect(result.metricRecords.every((record) => record.source === "match_event")).toBe(true);
    expect(saved.notes).toHaveLength(1);
  });
});
