import type { SeedData } from "./types.js";
import { chongqingTalentClubId as clubId, seedNow as now } from "./types.js";

export function createMatchSeed(): Pick<SeedData, "matches" | "matchRosters" | "matchEvents" | "matchPlayerNotes"> {
  return {
    matches: [
      {
        id: "match-1",
        clubId,
        eventId: "event-match-1",
        matchType: "friendly",
        opponentName: "重庆中心小学U10",
        homeScore: 3,
        awayScore: 2,
        status: "completed",
        createdAt: now,
        updatedAt: now,
      },
    ],
    matchRosters: [
      {
        id: "match-roster-1",
        clubId,
        matchId: "match-1",
        studentId: "student-1",
        teamId: "team-u10-dev",
        started: true,
        minutesPlayed: 60,
        position: "FW",
        createdAt: now,
        updatedAt: now,
      },
    ],
    matchEvents: [
      {
        id: "match-event-goal-1",
        clubId,
        matchId: "match-1",
        type: "goal",
        studentId: "student-1",
        minute: 18,
        linkedMetricId: "metric-goals",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "match-event-assist-1",
        clubId,
        matchId: "match-1",
        type: "assist",
        studentId: "student-1",
        minute: 42,
        linkedMetricId: "metric-assists",
        createdAt: now,
        updatedAt: now,
      },
    ],
    matchPlayerNotes: [
      {
        id: "match-note-1",
        clubId,
        matchId: "match-1",
        studentId: "student-1",
        coachId: "coach-1",
        note: "保持前场宽度，能主动冲击防线身后空间。",
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}
