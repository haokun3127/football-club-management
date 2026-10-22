import type { DatabaseSync } from "node:sqlite";
import {
  validateTrainingGame,
  type TrainingGame,
  type TrainingGameEvent,
  type TrainingGameRevision,
  type TrainingGameSide,
} from "@football-club/domain";
import type { TrainingGameRepository } from "../application/training-game-repository.js";

export class SqliteTrainingGameRepository implements TrainingGameRepository {
  constructor(private readonly database: DatabaseSync) {}
  list(clubId: string, eventId?: string) {
    const rows = eventId
      ? this.database
          .prepare(
            "SELECT id FROM training_games WHERE club_id = ? AND event_id = ? ORDER BY id",
          )
          .all(clubId, eventId)
      : this.database
          .prepare(
            "SELECT id FROM training_games WHERE club_id = ? ORDER BY id",
          )
          .all(clubId);
    return rows.map((row) => this.get(clubId, String(row.id))!);
  }
  get(clubId: string, gameId: string): TrainingGame | null {
    const row = this.database
      .prepare(
        "SELECT event_id, revision, state, root_json FROM training_games WHERE club_id = ? AND id = ?",
      )
      .get(clubId, gameId);
    if (!row) return null;
    const root = JSON.parse(String(row.root_json)) as Omit<
      TrainingGame,
      "participants" | "events"
    >;
    if (
      root.clubId !== clubId ||
      root.id !== gameId ||
      root.eventId !== row.event_id ||
      root.revision !== row.revision ||
      root.state !== row.state
    )
      throw new Error("Invalid persisted training game");
    const participants = this.database
      .prepare(
        "SELECT student_id, side, name_snapshot FROM training_game_participants WHERE club_id = ? AND game_id = ? ORDER BY student_id",
      )
      .all(clubId, gameId)
      .map((item) => ({
        studentId: String(item.student_id),
        side: String(item.side) as TrainingGameSide,
        nameSnapshot: String(item.name_snapshot),
      }));
    const events = this.database
      .prepare(
        "SELECT event_json FROM training_game_events WHERE club_id = ? AND game_id = ? ORDER BY ordinal",
      )
      .all(clubId, gameId)
      .map((item) => JSON.parse(String(item.event_json)) as TrainingGameEvent);
    const game = { ...root, participants, events };
    // A voided persisted result needs its original reason only during a transition.
    validateTrainingGame(
      game,
      undefined,
      game.state === "voided" ? "persisted" : "",
    );
    return game;
  }
  history(clubId: string, gameId: string): TrainingGameRevision[] {
    return this.database
      .prepare(
        "SELECT revision_json FROM training_game_revisions WHERE club_id = ? AND game_id = ? ORDER BY revision",
      )
      .all(clubId, gameId)
      .map(
        (row) => JSON.parse(String(row.revision_json)) as TrainingGameRevision,
      );
  }
  findRequest(
    clubId: string,
    eventId: string,
    requestId: string,
  ): TrainingGameRevision | null {
    const row = this.database
      .prepare(
        "SELECT revision_json FROM training_game_revisions WHERE club_id = ? AND event_id = ? AND request_id = ?",
      )
      .get(clubId, eventId, requestId);
    return row
      ? (JSON.parse(String(row.revision_json)) as TrainingGameRevision)
      : null;
  }
  compareAndSave(
    game: TrainingGame,
    expectedRevision: number,
    revision: TrainingGameRevision,
  ): boolean {
    if (
      game.revision !== expectedRevision + 1 ||
      revision.revision !== game.revision
    )
      throw new Error("Invalid game revision");
    const { participants, events, ...root } = game;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const changed =
        expectedRevision === 0
          ? this.database
              .prepare(
                "INSERT INTO training_games (club_id,id,event_id,revision,state,root_json) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING",
              )
              .run(
                game.clubId,
                game.id,
                game.eventId,
                game.revision,
                game.state,
                JSON.stringify(root),
              )
          : this.database
              .prepare(
                "UPDATE training_games SET revision = ?, state = ?, root_json = ? WHERE club_id = ? AND id = ? AND event_id = ? AND revision = ?",
              )
              .run(
                game.revision,
                game.state,
                JSON.stringify(root),
                game.clubId,
                game.id,
                game.eventId,
                expectedRevision,
              );
      if (Number(changed.changes) !== 1) {
        this.database.exec("ROLLBACK");
        return false;
      }
      this.database
        .prepare(
          "DELETE FROM training_game_participants WHERE club_id = ? AND game_id = ?",
        )
        .run(game.clubId, game.id);
      this.database
        .prepare(
          "DELETE FROM training_game_events WHERE club_id = ? AND game_id = ?",
        )
        .run(game.clubId, game.id);
      const insertParticipant = this.database.prepare(
        "INSERT INTO training_game_participants (club_id,game_id,student_id,side,name_snapshot) VALUES (?,?,?,?,?)",
      );
      for (const item of participants)
        insertParticipant.run(
          game.clubId,
          game.id,
          item.studentId,
          item.side,
          item.nameSnapshot,
        );
      const insertEvent = this.database.prepare(
        "INSERT INTO training_game_events (club_id,game_id,id,ordinal,event_json) VALUES (?,?,?,?,?)",
      );
      events.forEach((item, index) =>
        insertEvent.run(
          game.clubId,
          game.id,
          item.id,
          index,
          JSON.stringify(item),
        ),
      );
      this.database
        .prepare(
          "INSERT INTO training_game_revisions (club_id,game_id,revision,event_id,request_id,revision_json) VALUES (?,?,?,?,?,?)",
        )
        .run(
          game.clubId,
          game.id,
          game.revision,
          game.eventId,
          revision.requestId,
          JSON.stringify(revision),
        );
      this.database.exec("COMMIT");
      return true;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}
