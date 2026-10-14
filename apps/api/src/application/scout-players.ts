import type { StudentProfile } from "@football-club/domain";
export interface ScoutPlayer { id: string; name: string; birthDate: string; maskedDocument: string; status: "active" | "enrolled"; createdAt: string }
export interface ScoutCreateInput { clubId: string; name: string; identityNumber: string; actorUserId: string }
export interface ScoutPlayerRepository {
  readonly configured: boolean;
  list(clubId: string): ScoutPlayer[];
  create(input: ScoutCreateInput): Promise<{ created: boolean; student: StudentProfile; player: ScoutPlayer }>;
}
