import type { Match, MatchEvent, MatchPlayerNote, MatchRoster, MatchEventType, MatchStatus, MatchType } from "./match.js";
import type { AbilityMetric, PlayerMetricRecord } from "./metrics.js";
import type { EntityId } from "./primitives.js";
import type { Clock, IdGenerator } from "./ports.js";

export interface MatchRosterInput {
  studentId: EntityId;
  teamId?: EntityId;
  started: boolean;
  minutesPlayed?: number;
  position?: string;
}

export interface MatchEventInput {
  studentId: EntityId;
  type: MatchEventType;
  minute?: number;
  note?: string;
  linkedMetricId?: EntityId;
}

export interface RecordMatchEventInput {
  clubId: EntityId;
  eventId: EntityId;
  matchId: EntityId;
  studentId: EntityId;
  type: MatchEventType;
  minute?: number;
  note?: string;
}

export interface MatchEventBundle {
  event: MatchEvent;
  metricRecords: PlayerMetricRecord[];
}

export interface MatchPlayerNoteInput {
  studentId: EntityId;
  coachId: EntityId;
  note: string;
}

export interface RecordMatchInput {
  clubId: EntityId;
  eventId: EntityId;
  matchType: MatchType;
  status: MatchStatus;
  opponentName?: string;
  homeScore?: number;
  awayScore?: number;
  rosters?: MatchRosterInput[];
  events?: MatchEventInput[];
  notes?: MatchPlayerNoteInput[];
}

export interface MatchCatalogLookup {
  findMetricById(clubId: EntityId, metricId: EntityId): Promise<AbilityMetric | null> | AbilityMetric | null;
  findMetricByCode(clubId: EntityId, code: string): Promise<AbilityMetric | null> | AbilityMetric | null;
}

export interface MatchStore {
  saveMatch(match: Match): Promise<void> | void;
  saveRoster(roster: MatchRoster): Promise<void> | void;
  saveEvent(event: MatchEvent): Promise<void> | void;
  saveNote(note: MatchPlayerNote): Promise<void> | void;
  saveMetricRecord(record: PlayerMetricRecord): Promise<void> | void;
  saveEventBundle?(bundle: MatchEventBundle): Promise<void> | void;
}

export interface MatchServiceDependencies {
  clock: Clock;
  ids: IdGenerator;
  store: MatchStore;
  catalog: MatchCatalogLookup;
}

export interface MatchSummaryResult {
  match: Match;
  rosters: MatchRoster[];
  events: MatchEvent[];
  notes: MatchPlayerNote[];
  metricRecords: PlayerMetricRecord[];
}

const eventMetricCodeMap: Record<MatchEventType, string | null> = {
  goal: "match_goals",
  assist: "match_assists",
  save: null,
  tackle: null,
  yellow_card: null,
  red_card: null,
  penalty: null,
  own_goal: null,
};

async function resolveMetricForMatchEvent(
  catalog: MatchCatalogLookup,
  clubId: EntityId,
  event: MatchEventInput,
): Promise<AbilityMetric | null> {
  if (event.linkedMetricId) {
    const linked = await catalog.findMetricById(clubId, event.linkedMetricId);
    if (!linked) {
      throw new Error(`Missing linked metric ${event.linkedMetricId} for match event.`);
    }

    return linked;
  }

  const code = eventMetricCodeMap[event.type];
  if (!code) {
    return null;
  }

  const metric = await catalog.findMetricByCode(clubId, code);
  if (!metric) {
    throw new Error(`Missing metric ${code} for match event mapping.`);
  }

  return metric;
}

function buildMatchMetricRecord(input: {
  ids: IdGenerator;
  clock: Clock;
  clubId: EntityId;
  studentId: EntityId;
  metricId: EntityId;
  eventId: EntityId;
  sourceEvent: MatchEvent;
  note?: string;
}): PlayerMetricRecord {
  const now = input.clock.now();
  return {
    id: input.ids.next("metric-record"),
    clubId: input.clubId,
    studentId: input.studentId,
    metricId: input.metricId,
    value: { kind: "count", count: 1 },
    source: "match_event",
    occurredAt: now,
    eventId: input.eventId,
    createdAt: now,
    updatedAt: now,
    note: input.note ?? `match_event:${input.sourceEvent.type}`,
  };
}

export function createMatchService(dependencies: MatchServiceDependencies) {
  return {
    async recordMatchEvent(input: RecordMatchEventInput): Promise<MatchEventBundle> {
      if (!dependencies.store.saveEventBundle) {
        throw new Error("Match store does not support atomic event bundles.");
      }

      const now = dependencies.clock.now();
      const event: MatchEvent = {
        id: dependencies.ids.next("match-event"),
        clubId: input.clubId,
        matchId: input.matchId,
        type: input.type,
        studentId: input.studentId,
        minute: input.minute,
        note: input.note,
        createdAt: now,
        updatedAt: now,
      };
      const metric = await resolveMetricForMatchEvent(dependencies.catalog, input.clubId, event);
      const metricRecords = metric
        ? [buildMatchMetricRecord({
          ids: dependencies.ids,
          clock: dependencies.clock,
          clubId: input.clubId,
          studentId: event.studentId,
          metricId: metric.id,
          eventId: input.eventId,
          sourceEvent: event,
          note: event.note,
        })]
        : [];

      if (metric) {
        event.linkedMetricId = metric.id;
      }
      await dependencies.store.saveEventBundle({ event, metricRecords });
      return { event, metricRecords };
    },

    async recordMatchSummary(input: RecordMatchInput): Promise<MatchSummaryResult> {
      const now = dependencies.clock.now();
      const match: Match = {
        id: dependencies.ids.next("match"),
        clubId: input.clubId,
        eventId: input.eventId,
        matchType: input.matchType,
        opponentName: input.opponentName,
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };

      await dependencies.store.saveMatch(match);

      const rosters: MatchRoster[] = [];
      for (const rosterInput of input.rosters ?? []) {
        const roster: MatchRoster = {
          id: dependencies.ids.next("match-roster"),
          clubId: input.clubId,
          matchId: match.id,
          studentId: rosterInput.studentId,
          teamId: rosterInput.teamId,
          started: rosterInput.started,
          minutesPlayed: rosterInput.minutesPlayed,
          position: rosterInput.position,
          createdAt: now,
          updatedAt: now,
        };
        rosters.push(roster);
        await dependencies.store.saveRoster(roster);
      }

      const events: MatchEvent[] = [];
      const metricRecords: PlayerMetricRecord[] = [];
      for (const eventInput of input.events ?? []) {
        const event: MatchEvent = {
          id: dependencies.ids.next("match-event"),
          clubId: input.clubId,
          matchId: match.id,
          type: eventInput.type,
          studentId: eventInput.studentId,
          minute: eventInput.minute,
          linkedMetricId: eventInput.linkedMetricId,
          note: eventInput.note,
          createdAt: now,
          updatedAt: now,
        };

        const metric = await resolveMetricForMatchEvent(dependencies.catalog, input.clubId, eventInput);
        if (metric) {
          event.linkedMetricId = metric.id;
          metricRecords.push(buildMatchMetricRecord({
            ids: dependencies.ids,
            clock: dependencies.clock,
            clubId: input.clubId,
            studentId: event.studentId,
            metricId: metric.id,
            eventId: input.eventId,
            sourceEvent: event,
            note: event.note,
          }));
        }

        events.push(event);
        await dependencies.store.saveEvent(event);
      }

      for (const record of metricRecords) {
        await dependencies.store.saveMetricRecord(record);
      }

      const notes: MatchPlayerNote[] = [];
      for (const noteInput of input.notes ?? []) {
        const note: MatchPlayerNote = {
          id: dependencies.ids.next("match-note"),
          clubId: input.clubId,
          matchId: match.id,
          studentId: noteInput.studentId,
          coachId: noteInput.coachId,
          note: noteInput.note,
          createdAt: now,
          updatedAt: now,
        };
        notes.push(note);
        await dependencies.store.saveNote(note);
      }

      return { match, rosters, events, notes, metricRecords };
    },
  };
}
