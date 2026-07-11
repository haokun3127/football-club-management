import type { DatabaseSync } from "node:sqlite";
import type { TacticalBoard } from "@football-club/domain";

export class TacticalBoardRepository {
  constructor(private readonly database: DatabaseSync) {}

  get(clubId: string, eventId: string): TacticalBoard | null {
    const row = this.database.prepare("SELECT * FROM tactical_boards WHERE club_id = ? AND event_id = ?").get(clubId, eventId) as Record<string, unknown> | undefined;
    return row ? fromRow(row) : null;
  }

  save(board: TacticalBoard): TacticalBoard {
    this.database.prepare(`
      INSERT INTO tactical_boards (
        id, club_id, event_id, formation_name, pitch_type, players_json,
        updated_by_coach_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(club_id, event_id) DO UPDATE SET
        formation_name = excluded.formation_name,
        pitch_type = excluded.pitch_type,
        players_json = excluded.players_json,
        updated_by_coach_id = excluded.updated_by_coach_id,
        updated_at = excluded.updated_at
    `).run(board.id, board.clubId, board.eventId, board.formationName, board.pitchType, JSON.stringify(board.players), board.updatedByCoachId, board.createdAt, board.updatedAt);
    return this.get(board.clubId, board.eventId)!;
  }
}

function fromRow(row: Record<string, unknown>): TacticalBoard {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    eventId: String(row.event_id),
    formationName: String(row.formation_name),
    pitchType: "full",
    players: JSON.parse(String(row.players_json)),
    updatedByCoachId: String(row.updated_by_coach_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
