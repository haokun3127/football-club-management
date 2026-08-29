import type { DatabaseSync } from "node:sqlite";

const acceptanceUserId = "user-parent-cq-talent-acceptance";
const clubId = "club-chongqing-talent";
const appClientId = "app-client-cq-talent-wechat-main";
const acceptanceCoachId = "coach-cq-talent-acceptance-demo";
const acceptanceTeamId = "team-cq-talent-acceptance-demo";
const acceptanceMatchId = "match-cq-talent-demo-completed";
const acceptanceDemoEventIds = [
  "event-cq-talent-demo-training-foundation",
  "event-cq-talent-demo-training-finishing",
  "event-cq-talent-demo-training-completed",
  "event-cq-talent-demo-match-completed",
  "event-cq-talent-demo-training-upcoming",
  "event-cq-talent-demo-match-tactical",
] as const;

export interface CqTalentAcceptanceDemoRollbackResult {
  deletedEventIds: string[];
  deletedSessions: number;
  deletedTacticalBoards: number;
  deletedParticipants: number;
  deletedMetricRecords: number;
  deletedMatchEvents: number;
  deletedMatchRosters: number;
  deletedMatches: number;
  deletedTeamMembers: number;
  deletedTeams: number;
  deletedCoaches: number;
}

/**
 * Deletes only the fixed-ID acceptance demo records and restores the acceptance
 * user to its original parent-only roles. This is intentionally an explicit
 * production operation, never a startup side effect.
 */
export function rollbackCqTalentAcceptanceDemo(database: DatabaseSync): CqTalentAcceptanceDemoRollbackResult {
  const presentEvents = database.prepare(`
    SELECT id FROM calendar_events
    WHERE club_id = ? AND id IN (?, ?, ?, ?, ?, ?)
    ORDER BY id
  `).all(clubId, ...acceptanceDemoEventIds) as Array<{ id: string }>;
  if (presentEvents.length !== acceptanceDemoEventIds.length) {
    throw new Error("Acceptance demo rollback requires all fixed demo events to be present.");
  }

  const membership = database.prepare("SELECT id FROM club_user_memberships WHERE club_id = ? AND user_id = ?").get(clubId, acceptanceUserId) as { id?: string } | undefined;
  const user = database.prepare("SELECT id FROM user_accounts WHERE id = ?").get(acceptanceUserId) as { id?: string } | undefined;
  if (!membership?.id || !user?.id) {
    throw new Error("Acceptance demo rollback requires the fixed acceptance user and membership.");
  }

  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE;");
  try {
    const deletedTacticalBoards = deleteForEvents(database, "tactical_boards", "event_id");
    const deletedParticipants = deleteForEvents(database, "event_participants", "event_id");
    const deletedSessions = changeCount(database.prepare("DELETE FROM app_client_sessions WHERE club_id = ? AND app_client_id = ? AND user_id = ?").run(clubId, appClientId, acceptanceUserId).changes);
    const deletedMetricRecords = changeCount(database.prepare("DELETE FROM player_metric_records WHERE club_id = ? AND id LIKE ?").run(clubId, "metric-record-cq-talent-demo-%").changes);
    const deletedMatchEvents = changeCount(database.prepare("DELETE FROM match_events WHERE club_id = ? AND match_id = ?").run(clubId, acceptanceMatchId).changes);
    const deletedMatchRosters = changeCount(database.prepare("DELETE FROM match_rosters WHERE club_id = ? AND match_id = ?").run(clubId, acceptanceMatchId).changes);
    const deletedMatches = changeCount(database.prepare("DELETE FROM matches WHERE club_id = ? AND id = ?").run(clubId, acceptanceMatchId).changes);
    const deletedTeamMembers = changeCount(database.prepare("DELETE FROM team_members WHERE club_id = ? AND team_id = ?").run(clubId, acceptanceTeamId).changes);
    const deletedEvents = deleteForEvents(database, "calendar_events", "id");
    const deletedTeams = changeCount(database.prepare("DELETE FROM teams WHERE club_id = ? AND id = ?").run(clubId, acceptanceTeamId).changes);
    const deletedCoaches = changeCount(database.prepare("DELETE FROM coach_profiles WHERE club_id = ? AND id = ?").run(clubId, acceptanceCoachId).changes);
    database.prepare("UPDATE user_accounts SET roles_json = ?, updated_at = ? WHERE id = ?").run("[\"parent\"]", now, acceptanceUserId);
    database.prepare("UPDATE club_user_memberships SET roles_json = ?, updated_at = ? WHERE id = ?").run("[\"parent\"]", now, membership.id);
    database.exec("COMMIT;");

    return {
      deletedEventIds: acceptanceDemoEventIds.slice(),
      deletedSessions,
      deletedTacticalBoards,
      deletedParticipants,
      deletedMetricRecords,
      deletedMatchEvents,
      deletedMatchRosters,
      deletedMatches,
      deletedTeamMembers,
      deletedTeams,
      deletedCoaches,
    };
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function deleteForEvents(database: DatabaseSync, table: "tactical_boards" | "event_participants" | "calendar_events", column: "event_id" | "id"): number {
  return changeCount(database.prepare(`DELETE FROM ${table} WHERE club_id = ? AND ${column} IN (?, ?, ?, ?, ?, ?)`).run(clubId, ...acceptanceDemoEventIds).changes);
}

function changeCount(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}
