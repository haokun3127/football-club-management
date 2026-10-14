import type { CoachAssignment } from "@football-club/domain";
import type { DatabaseSync } from "node:sqlite";
export class CoachAssignmentRepository {
  constructor(private readonly database:DatabaseSync) {}
  list(clubId:string):CoachAssignment[] {
    return this.database.prepare("SELECT id, club_id AS clubId, coach_id AS coachId, team_id AS teamId, role, created_at AS createdAt, updated_at AS updatedAt FROM coach_assignments WHERE club_id=? AND status='active' ORDER BY team_id,coach_id").all(clubId) as unknown as CoachAssignment[];
  }
  save(value:CoachAssignment) {
    if (!value.teamId || value.eventId) throw new Error("A team-scoped assignment is required");
    this.database.prepare(`INSERT INTO coach_assignments(id,club_id,coach_id,team_id,role,created_at,updated_at)
      SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM teams WHERE id=? AND club_id=?) AND EXISTS(SELECT 1 FROM coach_profiles WHERE id=? AND club_id=?)
      ON CONFLICT(club_id,team_id,coach_id) DO UPDATE SET role=excluded.role,updated_at=excluded.updated_at,status='active'`).run(value.id,value.clubId,value.coachId,value.teamId,value.role,value.createdAt,value.updatedAt,value.teamId,value.clubId,value.coachId,value.clubId);
    const saved=this.list(value.clubId).find(item=>item.teamId===value.teamId&&item.coachId===value.coachId);
    if(!saved)throw new Error("Assignment targets must belong to the same club");
    return saved;
  }
  remove(clubId:string,teamId:string,coachId:string) { this.database.prepare("UPDATE coach_assignments SET status='inactive',updated_at=? WHERE club_id=? AND team_id=? AND coach_id=?").run(new Date().toISOString(),clubId,teamId,coachId); }
}
