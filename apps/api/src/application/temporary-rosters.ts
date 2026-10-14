import type { CalendarEvent } from "@football-club/domain";
export interface TemporaryRosterChange { revision: number; action: "add" | "remove"; actorUserId: string; actorName: string; changedAt: string; participated?: boolean; note: string }
export interface TemporaryRosterEntry { studentId: string; active: boolean; revision: number; history: TemporaryRosterChange[] }
export interface TemporaryRoster { eventId: string; revision: string; temporary: TemporaryRosterEntry[]; participantIds: string[] }
export interface ChangeTemporaryRoster {
  clubId: string; eventId: string; expectedRevision: string; action: "add" | "remove";
  players: Array<{ studentId: string; participated?: boolean }>; note?: string;
  actorUserId: string; actorName: string;
}
export interface TemporaryRosterRepository {
  get(clubId: string, eventId: string): TemporaryRoster;
  change(input: ChangeTemporaryRoster, authorize: (event: CalendarEvent) => boolean): Promise<TemporaryRoster>;
  inactiveIds(clubId: string): string[];
}
