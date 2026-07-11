import type { AuditFields, EntityId } from "./primitives.js";
import type { ClubScoped } from "./clubs.js";

export type TacticalBoardPlayerRole = "starter" | "substitute" | "reserve";

export interface TacticalBoardPlayer {
  studentId: EntityId;
  displayName: string;
  avatarUrl?: string;
  role: TacticalBoardPlayerRole;
  positionLabel?: string;
  x: number;
  y: number;
}

export interface TacticalBoard extends AuditFields, ClubScoped {
  id: EntityId;
  eventId: EntityId;
  formationName: string;
  pitchType: "full";
  players: TacticalBoardPlayer[];
  updatedByCoachId: EntityId;
}

export interface FormationTemplate {
  name: string;
  label: string;
  positions: Array<{ positionLabel: string; x: number; y: number }>;
}

const goalkeeper = { positionLabel: "门将", x: 0.5, y: 0.9 };

export const formationTemplates: FormationTemplate[] = [
  formation("4-3-3", [4, 3, 3]),
  formation("4-4-2", [4, 4, 2]),
  formation("3-5-2", [3, 5, 2]),
];

export function validateTacticalBoardPlayers(players: TacticalBoardPlayer[], rosterIds: Iterable<EntityId>): string[] {
  const roster = new Set(rosterIds);
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const player of players) {
    if (!roster.has(player.studentId)) errors.push(`student_not_in_roster:${player.studentId}`);
    if (seen.has(player.studentId)) errors.push(`duplicate_student:${player.studentId}`);
    seen.add(player.studentId);
    if (!Number.isFinite(player.x) || !Number.isFinite(player.y) || player.x < 0 || player.x > 1 || player.y < 0 || player.y > 1) {
      errors.push(`invalid_position:${player.studentId}`);
    }
    if (!["starter", "substitute", "reserve"].includes(player.role)) errors.push(`invalid_role:${player.studentId}`);
  }
  if (players.filter((player) => player.role === "starter").length > 11) errors.push("too_many_starters");
  return errors;
}

function formation(name: string, lines: number[]): FormationTemplate {
  const positions = [goalkeeper];
  lines.forEach((count, lineIndex) => {
    const y = 0.74 - lineIndex * (0.56 / Math.max(lines.length - 1, 1));
    for (let index = 0; index < count; index += 1) {
      positions.push({
        positionLabel: `${lineIndex + 1}-${index + 1}`,
        x: (index + 1) / (count + 1),
        y,
      });
    }
  });
  return { name, label: name, positions };
}
