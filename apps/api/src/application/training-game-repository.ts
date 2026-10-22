import type { TrainingGame, TrainingGameRevision } from "@football-club/domain";

export interface TrainingGameRepository {
  list(clubId: string, eventId?: string): TrainingGame[];
  get(clubId: string, gameId: string): TrainingGame | null;
  history(clubId: string, gameId: string): TrainingGameRevision[];
  findRequest(
    clubId: string,
    eventId: string,
    requestId: string,
  ): TrainingGameRevision | null;
  compareAndSave(
    game: TrainingGame,
    expectedRevision: number,
    revision: TrainingGameRevision,
  ): boolean;
}
export class MemoryTrainingGameRepository implements TrainingGameRepository {
  private games = new Map<string, TrainingGame>();
  private revisions = new Map<string, TrainingGameRevision[]>();
  private key(clubId: string, gameId: string) {
    return JSON.stringify([clubId, gameId]);
  }
  list(clubId: string, eventId?: string) {
    return structuredClone(
      [...this.games.values()].filter(
        (game) =>
          game.clubId === clubId && (!eventId || game.eventId === eventId),
      ),
    );
  }
  get(clubId: string, gameId: string) {
    return structuredClone(this.games.get(this.key(clubId, gameId)) ?? null);
  }
  history(clubId: string, gameId: string) {
    return structuredClone(this.revisions.get(this.key(clubId, gameId)) ?? []);
  }
  findRequest(clubId: string, eventId: string, requestId: string) {
    return structuredClone(
      [...this.revisions.values()]
        .flat()
        .find(
          (row) =>
            row.snapshot.clubId === clubId &&
            row.snapshot.eventId === eventId &&
            row.requestId === requestId,
        ) ?? null,
    );
  }
  compareAndSave(
    game: TrainingGame,
    expectedRevision: number,
    revision: TrainingGameRevision,
  ) {
    if (
      game.revision !== expectedRevision + 1 ||
      revision.revision !== game.revision
    )
      throw new Error("Invalid game revision");
    if (
      (this.get(game.clubId, game.id)?.revision ?? 0) !== expectedRevision ||
      this.findRequest(game.clubId, game.eventId, revision.requestId)
    )
      return false;
    const key = this.key(game.clubId, game.id);
    this.games.set(key, structuredClone(game));
    this.revisions.set(key, [
      ...(this.revisions.get(key) ?? []),
      structuredClone(revision),
    ]);
    return true;
  }
}
