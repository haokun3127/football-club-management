import {
  findScheduleConflicts,
  expandRecurringTimeRanges,
  isCatalogVisibleToClub,
  type AbilityMetric,
  type CalendarEvent,
  type CalendarEventStatus,
  type CalendarEventType,
  type CoachProfile,
  type DerivedMetricDefinition,
  type DevelopmentDimension,
  type EntityId,
  type EventParticipant,
  type Match,
  type MatchStatus,
  type MatchType,
  type OtherActivity,
  type ParticipantStatus,
  type RecurrenceRuleInput,
  type ScheduleConflict,
  type ScheduledCommitment,
  type SessionDelivery,
  type SessionObservation,
  type SessionObservationSourceReference,
  type SessionPlan,
  type StudentProfile,
  type Team,
  type TeamMember,
  type TrainingDrill,
  type TrainingObjective,
  type TrainingSession,
  type TrainingSessionKind,
} from "@football-club/domain";
import type { ApiStore, IdSource, TimeSource } from "./contracts.js";

interface CreateTeamInput {
  clubId: EntityId;
  name: string;
  ageGroup: string;
  level: Team["level"];
  defaultCoachId?: EntityId;
  defaultLocationId?: EntityId;
}

interface JoinTeamInput {
  clubId: EntityId;
  teamId: EntityId;
  studentId: EntityId;
  startsAt: string;
  endsAt?: string;
  isPrimaryTeam?: boolean;
  status?: TeamMember["status"];
}

interface EventParticipantInput {
  studentId: EntityId;
  status?: ParticipantStatus;
  note?: string;
}

interface CreateCalendarEventInput {
  type: CalendarEventType;
  title: string;
  startsAt: string;
  endsAt: string;
  locationId?: EntityId;
  primaryTeamId?: EntityId;
  ownerCoachId?: EntityId;
  status?: CalendarEventStatus;
  notes?: string;
  participants?: EventParticipantInput[];
  recurrence?: RecurrenceRuleInput;
  trainingSession?: {
    kind: TrainingSessionKind;
    sessionPlanId?: EntityId;
    intensity?: TrainingSession["intensity"];
  };
  match?: {
    matchType: MatchType;
    opponentName?: string;
    homeScore?: number;
    awayScore?: number;
    status?: MatchStatus;
  };
  otherActivity?: {
    category: OtherActivity["category"];
    description?: string;
  };
}

interface CreateTrainingSessionInput {
  eventId: EntityId;
  kind: TrainingSessionKind;
  sessionPlanId?: EntityId;
  intensity?: TrainingSession["intensity"];
}

interface CreateSessionDeliveryInput {
  coachId: EntityId;
  deliveredBlockIds: EntityId[];
  intensity?: SessionDelivery["intensity"];
  summary?: string;
}

interface CreateSessionObservationInput {
  studentId: EntityId;
  coachId: EntityId;
  metricId?: EntityId;
  rating?: SessionObservation["rating"];
  tags?: string[];
  note?: string;
  sourceReference?: SessionObservationSourceReference;
}

interface ScheduleConflictCheckInput {
  eventId?: EntityId;
  startsAt: string;
  endsAt: string;
  coachId?: EntityId;
  studentIds?: EntityId[];
}

interface SessionPlanDraftInput {
  name: string;
  objectiveIds?: EntityId[];
  metricIds?: EntityId[];
  drillIds: EntityId[];
  estimatedMinutes?: number;
}

export interface EventDetail extends CalendarEvent {
  participants: EventParticipant[];
  trainingSession: TrainingSession | null;
  match: Match | null;
  otherActivity: OtherActivity | null;
}

export interface SessionPlanComposition {
  plan: SessionPlan;
  objectives: Array<{
    objective: TrainingObjective;
    dimension: DevelopmentDimension | null;
  }>;
  blocks: Array<{
    id: EntityId;
    order: number;
    plannedMinutes: number;
    notes?: string;
    drill: TrainingDrill;
    objectives: TrainingObjective[];
    metrics: AbilityMetric[];
  }>;
}

export interface ScheduleConflictDetail extends ScheduleConflict {
  subjectKind: "coach" | "student";
}

export function createApiServices(store: ApiStore, ids: IdSource, clock: TimeSource) {
  const ensureClubExists = (clubId: EntityId) => {
    if (!store.getClubById(clubId)) {
      throw new Error("Club not found.");
    }
  };

  const ensureTeamInClub = (clubId: EntityId, teamId?: EntityId) => {
    if (!teamId) {
      return;
    }

    const team = store.getTeam(teamId);

    if (!team || team.clubId !== clubId) {
      throw new Error("Team not found for club.");
    }
  };

  const ensureCoachInClub = (clubId: EntityId, coachId?: EntityId) => {
    if (!coachId) {
      return;
    }

    const coach = store.listCoaches(clubId).find((item) => item.id === coachId);

    if (!coach) {
      throw new Error("Coach not found for club.");
    }
  };

  const ensureStudentInClub = (clubId: EntityId, studentId?: EntityId) => {
    if (!studentId) {
      return;
    }

    const student = store.listStudents(clubId).find((item) => item.id === studentId);

    if (!student) {
      throw new Error("Student not found for club.");
    }
  };

  const detailFromEvent = (event: CalendarEvent): EventDetail => ({
    ...event,
    participants: store.listEventParticipants(event.clubId).filter((participant) => participant.eventId === event.id),
    trainingSession: store.listTrainingSessions(event.clubId).find((session) => session.eventId === event.id) ?? null,
    match: store.listMatches(event.clubId).find((item) => item.eventId === event.id) ?? null,
    otherActivity: store.listOtherActivities(event.clubId).find((item) => item.eventId === event.id) ?? null,
  });

  const buildClubCommitments = (clubId: EntityId): ScheduledCommitment[] => {
    const events = store.listCalendarEvents(clubId);
    const participants = store.listEventParticipants(clubId);
    const commitments: ScheduledCommitment[] = [];

    for (const event of events) {
      if (event.ownerCoachId) {
        commitments.push({
          clubId,
          subjectId: event.ownerCoachId,
          eventId: event.id,
          timeRange: event.timeRange,
        });
      }
    }

    for (const participant of participants) {
      const event = events.find((item) => item.id === participant.eventId);

      if (!event) {
        continue;
      }

      commitments.push({
        clubId,
        subjectId: participant.studentId,
        eventId: event.id,
        timeRange: event.timeRange,
      });
    }

    return commitments;
  };

  return {
    listClubs: () => store.listClubs(),
    getClub: (clubId: EntityId) => store.getClubById(clubId),
    listTeams: (clubId: EntityId) => store.listTeams(clubId),
    listTeamMembers: (clubId: EntityId, teamId?: EntityId) => {
      const members = store.listTeamMembers(clubId);
      return teamId ? members.filter((member) => member.teamId === teamId) : members;
    },
    createTeam: (input: CreateTeamInput): Team => {
      ensureClubExists(input.clubId);
      ensureCoachInClub(input.clubId, input.defaultCoachId);
      const now = clock.now();
      const team: Team = {
        id: ids.next("team"),
        clubId: input.clubId,
        name: input.name,
        ageGroup: input.ageGroup,
        level: input.level,
        defaultCoachId: input.defaultCoachId,
        defaultLocationId: input.defaultLocationId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };

      return store.saveTeam(team);
    },
    joinTeam: (input: JoinTeamInput): TeamMember => {
      ensureClubExists(input.clubId);
      ensureTeamInClub(input.clubId, input.teamId);
      ensureStudentInClub(input.clubId, input.studentId);

      const existing = store
        .listTeamMembers(input.clubId)
        .find((member) => member.teamId === input.teamId && member.studentId === input.studentId && member.startsAt === input.startsAt);

      if (existing) {
        return store.saveTeamMember({
          ...existing,
          endsAt: input.endsAt ?? existing.endsAt,
          isPrimaryTeam: input.isPrimaryTeam ?? existing.isPrimaryTeam,
          status: input.status ?? existing.status,
          updatedAt: clock.now(),
        });
      }

      const now = clock.now();
      return store.saveTeamMember({
        id: ids.next("team-member"),
        clubId: input.clubId,
        teamId: input.teamId,
        studentId: input.studentId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        isPrimaryTeam: input.isPrimaryTeam ?? false,
        status: input.status ?? "active",
        createdAt: now,
        updatedAt: now,
      });
    },
    createCalendarEvent: (clubId: EntityId, input: CreateCalendarEventInput): EventDetail | EventDetail[] => {
      ensureClubExists(clubId);
      ensureTeamInClub(clubId, input.primaryTeamId);
      ensureCoachInClub(clubId, input.ownerCoachId);
      for (const participant of input.participants ?? []) {
        ensureStudentInClub(clubId, participant.studentId);
      }
      const now = clock.now();
      const ranges = expandRecurringTimeRanges({
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        recurrence: input.recurrence,
      });
      const events = ranges.map((timeRange, index) => {
        const event: CalendarEvent = {
          id: ids.next("event"),
          clubId,
          type: input.type,
          title: input.recurrence ? `${input.title} #${index + 1}` : input.title,
          timeRange,
          locationId: input.locationId,
          primaryTeamId: input.primaryTeamId,
          ownerCoachId: input.ownerCoachId,
          status: input.status ?? "scheduled",
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        };

        store.saveCalendarEvent(event);

        if (input.trainingSession) {
          store.saveTrainingSession({
            id: ids.next("training-session"),
            clubId,
            eventId: event.id,
            kind: input.trainingSession.kind,
            sessionPlanId: input.trainingSession.sessionPlanId,
            intensity: input.trainingSession.intensity,
            createdAt: now,
            updatedAt: now,
          });
        }

        if (input.match) {
          store.saveMatch({
            id: ids.next("match"),
            clubId,
            eventId: event.id,
            matchType: input.match.matchType,
            opponentName: input.match.opponentName,
            homeScore: input.match.homeScore,
            awayScore: input.match.awayScore,
            status: input.match.status ?? "scheduled",
            createdAt: now,
            updatedAt: now,
          });
        }

        if (input.otherActivity) {
          store.saveOtherActivity({
            id: ids.next("other-activity"),
            clubId,
            eventId: event.id,
            category: input.otherActivity.category,
            description: input.otherActivity.description,
            createdAt: now,
            updatedAt: now,
          });
        }

        for (const participant of input.participants ?? []) {
          store.saveEventParticipant({
            id: ids.next("participant"),
            clubId,
            eventId: event.id,
            studentId: participant.studentId,
            status: participant.status ?? "invited",
            note: participant.note,
            createdAt: now,
            updatedAt: now,
          });
        }

        return detailFromEvent(event);
      });

      return input.recurrence ? events : events[0]!;
    },
    listCalendarEvents: (clubId: EntityId) => store.listCalendarEvents(clubId).map(detailFromEvent),
    recordEventParticipants: (
      clubId: EntityId,
      eventId: EntityId,
      participants: EventParticipantInput[],
    ): EventParticipant[] => {
      ensureClubExists(clubId);
      const event = store.getCalendarEvent(eventId);

      if (!event || event.clubId !== clubId) {
        throw new Error("Event not found for club.");
      }

      const existing = store.listEventParticipants(clubId).filter((participant) => participant.eventId === eventId);
      const now = clock.now();
      const updated: EventParticipant[] = [];

      for (const participant of participants) {
        ensureStudentInClub(clubId, participant.studentId);
      }

      for (const participant of participants) {
        const found = existing.find((item) => item.studentId === participant.studentId);

        if (found) {
          updated.push(
            store.saveEventParticipant({
              ...found,
              status: participant.status ?? found.status,
              note: participant.note ?? found.note,
              updatedAt: now,
            }),
          );
          continue;
        }

        updated.push(
          store.saveEventParticipant({
            id: ids.next("participant"),
            clubId,
            eventId,
            studentId: participant.studentId,
            status: participant.status ?? "invited",
            note: participant.note,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }

      return updated;
    },
    checkScheduleConflicts: (clubId: EntityId, input: ScheduleConflictCheckInput): ScheduleConflictDetail[] => {
      ensureClubExists(clubId);
      const commitments = buildClubCommitments(clubId);
      const candidateEventId = input.eventId ?? ids.next("event-preview");
      const conflicts: ScheduleConflictDetail[] = [];

      if (input.coachId) {
        const candidate = {
          clubId,
          subjectId: input.coachId,
          eventId: candidateEventId,
          timeRange: {
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          },
        };

        conflicts.push(
          ...findScheduleConflicts(commitments, candidate).map((conflict) => ({
            ...conflict,
            subjectKind: "coach" as const,
          })),
        );
      }

      for (const studentId of input.studentIds ?? []) {
        const candidate = {
          clubId,
          subjectId: studentId,
          eventId: candidateEventId,
          timeRange: {
            startsAt: input.startsAt,
            endsAt: input.endsAt,
          },
        };

        conflicts.push(
          ...findScheduleConflicts(commitments, candidate).map((conflict) => ({
            ...conflict,
            subjectKind: "student" as const,
          })),
        );
      }

      return conflicts;
    },
    listDevelopmentDimensions: (clubId: EntityId) => store.listDevelopmentDimensions(clubId),
    listTrainingObjectives: (clubId: EntityId) => store.listTrainingObjectives(clubId),
    listTrainingDrills: (clubId: EntityId) => store.listTrainingDrills(clubId),
    listSessionPlans: (clubId: EntityId) => store.listSessionPlans(clubId),
    getSessionPlanComposition: (clubId: EntityId, sessionPlanId: EntityId): SessionPlanComposition => {
      ensureClubExists(clubId);
      const plan = store.getSessionPlan(sessionPlanId);

      if (!plan || !isCatalogVisibleToClub(plan, clubId)) {
        throw new Error("Session plan not found for club.");
      }

      const objectives = plan.objectiveIds
        .map((objectiveId) => store.listTrainingObjectives(clubId).find((item) => item.id === objectiveId))
        .filter((objective): objective is TrainingObjective => Boolean(objective))
        .map((objective) => ({
          objective,
          dimension: store.listDevelopmentDimensions(clubId).find((dimension) => dimension.id === objective.dimensionId) ?? null,
        }));

      const drills = plan.blocks.map((block) => {
        const drill = store.listTrainingDrills(clubId).find((item) => item.id === block.drillId);

        if (!drill) {
          throw new Error(`Missing drill ${block.drillId} for session plan ${plan.id}.`);
        }

        return {
          id: block.id,
          order: block.order,
          plannedMinutes: block.plannedMinutes,
          notes: block.notes,
          drill,
          objectives: drill.objectiveIds
            .map((objectiveId) => store.listTrainingObjectives(clubId).find((objective) => objective.id === objectiveId))
            .filter((objective): objective is TrainingObjective => Boolean(objective)),
          metrics: drill.metricIds
            .map((metricId) => store.listAbilityMetrics(clubId).find((metric) => metric.id === metricId))
            .filter((metric): metric is AbilityMetric => Boolean(metric)),
        };
      });

      return {
        plan,
        objectives,
        blocks: drills,
      };
    },
    composeSessionPlanDraft: (clubId: EntityId, input: SessionPlanDraftInput): SessionPlanComposition => {
      ensureClubExists(clubId);
      const now = clock.now();
      const drills = input.drillIds.map((drillId, index) => {
        const drill = store.listTrainingDrills(clubId).find((item) => item.id === drillId);

        if (!drill) {
          throw new Error(`Missing drill ${drillId}.`);
        }

        return {
          id: ids.next("session-plan-block"),
          drill,
          order: index + 1,
          plannedMinutes: drill.durationMinutes,
          notes: undefined,
          objectives: drill.objectiveIds
            .map((objectiveId) => store.listTrainingObjectives(clubId).find((objective) => objective.id === objectiveId))
            .filter((objective): objective is TrainingObjective => Boolean(objective)),
          metrics: drill.metricIds
            .map((metricId) => store.listAbilityMetrics(clubId).find((metric) => metric.id === metricId))
            .filter((metric): metric is AbilityMetric => Boolean(metric)),
        };
      });

      const plan: SessionPlan = {
        id: ids.next("session-plan"),
        catalogScope: { scope: "club", clubId },
        name: input.name,
        objectiveIds: input.objectiveIds ?? Array.from(new Set(drills.flatMap((block) => block.objectives.map((objective) => objective.id)))),
        metricIds: input.metricIds ?? Array.from(new Set(drills.flatMap((block) => block.metrics.map((metric) => metric.id)))),
        blocks: drills.map((block) => ({
          id: block.id,
          drillId: block.drill.id,
          order: block.order,
          plannedMinutes: block.plannedMinutes,
          notes: block.notes,
        })),
        estimatedMinutes: input.estimatedMinutes ?? drills.reduce((sum, block) => sum + block.plannedMinutes, 0),
        createdAt: now,
        updatedAt: now,
      };

      return {
        plan,
        objectives: plan.objectiveIds
          .map((objectiveId) => store.listTrainingObjectives(clubId).find((objective) => objective.id === objectiveId))
          .filter((objective): objective is TrainingObjective => Boolean(objective))
          .map((objective) => ({
            objective,
            dimension: store.listDevelopmentDimensions(clubId).find((dimension) => dimension.id === objective.dimensionId) ?? null,
          })),
        blocks: drills,
      };
    },
    createTrainingSession: (clubId: EntityId, input: CreateTrainingSessionInput): TrainingSession => {
      ensureClubExists(clubId);
      const event = store.getCalendarEvent(input.eventId);

      if (!event || event.clubId !== clubId) {
        throw new Error("Event not found for club.");
      }

      if (event.type !== "training") {
        throw new Error("Training session must link to a training event.");
      }

      if (input.sessionPlanId) {
        const plan = store.getSessionPlan(input.sessionPlanId);

        if (!plan || !isCatalogVisibleToClub(plan, clubId)) {
          throw new Error("Session plan not found for club.");
        }
      }

      const existing = store.listTrainingSessions(clubId).find((session) => session.eventId === input.eventId);

      if (existing) {
        return store.saveTrainingSession({
          ...existing,
          kind: input.kind,
          sessionPlanId: input.sessionPlanId ?? existing.sessionPlanId,
          intensity: input.intensity ?? existing.intensity,
          updatedAt: clock.now(),
        });
      }

      const now = clock.now();
      return store.saveTrainingSession({
        id: ids.next("training-session"),
        clubId,
        eventId: input.eventId,
        kind: input.kind,
        sessionPlanId: input.sessionPlanId,
        intensity: input.intensity,
        createdAt: now,
        updatedAt: now,
      });
    },
    recordSessionDelivery: (clubId: EntityId, trainingSessionId: EntityId, input: CreateSessionDeliveryInput): SessionDelivery => {
      ensureClubExists(clubId);
      ensureCoachInClub(clubId, input.coachId);
      const session = store.getTrainingSession(trainingSessionId);

      if (!session || session.clubId !== clubId) {
        throw new Error("Training session not found for club.");
      }

      const now = clock.now();
      return store.saveSessionDelivery({
        id: ids.next("session-delivery"),
        clubId,
        trainingSessionId,
        deliveredBlockIds: input.deliveredBlockIds,
        coachId: input.coachId,
        intensity: input.intensity,
        summary: input.summary,
        createdAt: now,
        updatedAt: now,
      });
    },
    recordSessionObservation: (
      clubId: EntityId,
      trainingSessionId: EntityId,
      input: CreateSessionObservationInput,
    ): SessionObservation => {
      ensureClubExists(clubId);
      ensureCoachInClub(clubId, input.coachId);
      ensureStudentInClub(clubId, input.studentId);
      const session = store.getTrainingSession(trainingSessionId);

      if (!session || session.clubId !== clubId) {
        throw new Error("Training session not found for club.");
      }

      const now = clock.now();
      return store.saveSessionObservation({
        id: ids.next("session-observation"),
        clubId,
        trainingSessionId,
        studentId: input.studentId,
        coachId: input.coachId,
        metricId: input.metricId,
        rating: input.rating,
        tags: input.tags ?? [],
        note: input.note,
        sourceReference: input.sourceReference ?? { kind: "manual" },
        createdAt: now,
        updatedAt: now,
      });
    },
  };
}
