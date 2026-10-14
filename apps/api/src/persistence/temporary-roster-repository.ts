import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ScoutError } from "../application/scout-identity.js";
import type { CalendarEvent } from "@football-club/domain";
import type { ChangeTemporaryRoster, TemporaryRosterEntry, TemporaryRosterRepository } from "../application/temporary-rosters.js";
import { CalendarRepository } from "./calendar-repositories.js";
import { MatchRepository } from "./match-repository.js";
import { SqliteTrainingRecordRepository } from "./training-record-repository.js";
import { correctTrainingRecord } from "../application/training-records.js";
import { transaction } from "./transaction.js";

export class SqliteTemporaryRosterRepository implements TemporaryRosterRepository {
  constructor(private readonly database: DatabaseSync) {}
  inactiveIds(clubId: string) {
    return this.database.prepare("SELECT p.id FROM event_participants p JOIN temporary_event_participants t USING(club_id,event_id,student_id) WHERE t.club_id=? AND t.active=0").all(clubId).map(r => String(r.id));
  }
  get(clubId: string, eventId: string) {
    const event = new CalendarRepository(this.database).getEventById(eventId);
    if (!event || event.clubId !== clubId) throw new ScoutError(404, "event_not_found", "活动不存在");
    const temporary = this.database.prepare("SELECT * FROM temporary_event_participants WHERE club_id=? AND event_id=? ORDER BY student_id").all(clubId,eventId).map(row => ({
      studentId: String(row.student_id), active: row.active === 1, revision: Number(row.revision), history: JSON.parse(String(row.history_json)) as TemporaryRosterEntry["history"],
    }));
    const participants = this.database.prepare("SELECT id,student_id,status,updated_at FROM event_participants WHERE club_id=? AND event_id=? ORDER BY student_id").all(clubId,eventId);
    const inactive = new Set(temporary.filter(t => !t.active).map(t => t.studentId));
    return { eventId, revision: createHash("sha256").update(JSON.stringify({ event, participants, temporary })).digest("hex"), temporary, participantIds: participants.filter(p => !inactive.has(String(p.student_id))).map(p => String(p.student_id)) };
  }
  async change(input: ChangeTemporaryRoster, authorize: (event: CalendarEvent) => boolean) {
    return transaction(this.database, async () => {
      const calendar = new CalendarRepository(this.database), matches = new MatchRepository(this.database);
      const event = calendar.getEventById(input.eventId);
      if (!event || event.clubId !== input.clubId) throw new ScoutError(404,"event_not_found","活动不存在");
      if (!authorize(event)) throw new ScoutError(403,"forbidden","没有本场名单操作权限");
      if (event.status === "cancelled" || !["training","match"].includes(event.type)) throw new ScoutError(409,"event_unavailable","当前活动不能修改临时名单");
      const roster = this.get(input.clubId,input.eventId);
      if (roster.revision !== input.expectedRevision) throw new ScoutError(409,"roster_conflict","名单已更新，请刷新后操作");
      if (!input.players.length || input.players.length > 20 || new Set(input.players.map(p=>p.studentId)).size !== input.players.length) throw new ScoutError(400,"invalid_roster_players","请选择1至20位不重复球员");
      const now = new Date().toISOString(), ended = Date.parse(event.timeRange.endsAt) <= Date.parse(now);
      const match = event.type === "match" ? matches.listMatches(input.clubId).find(m=>m.eventId===event.id) : null;
      if (event.type === "match" && (!match || !event.primaryTeamId)) throw new ScoutError(409,"match_not_ready","请先完善本场比赛资料");
      for (const selected of input.players) {
        const old = roster.temporary.find(t=>t.studentId===selected.studentId);
        const participant = this.database.prepare("SELECT * FROM event_participants WHERE club_id=? AND event_id=? AND student_id=?").get(input.clubId,input.eventId,selected.studentId);
        if (input.action === "add") {
          if (roster.participantIds.includes(selected.studentId)) continue;
          if (!this.database.prepare("SELECT 1 FROM scout_profiles WHERE club_id=? AND student_id=?").get(input.clubId,selected.studentId)) throw new ScoutError(404,"scout_not_found","未找到可用的球探档案");
          if (ended && typeof selected.participated !== "boolean") throw new ScoutError(400,"participation_required","请确认本次参加或未参加");
          calendar.saveParticipant({ id: participant ? String(participant.id) : `participant-${randomUUID()}`, clubId: input.clubId, eventId: event.id, studentId: selected.studentId, status: ended ? selected.participated ? "present" : "absent" : "invited", createdAt: participant ? String(participant.created_at) : now, updatedAt: now });
          if (match && !matches.listRosters(input.clubId).some(r=>r.matchId===match.id&&r.studentId===selected.studentId)) {
            // Never invent starting status, minutes, or match events from roster membership.
            const existing = this.database.prepare("SELECT id FROM match_rosters WHERE club_id=? AND match_id=? AND student_id=?").get(input.clubId,match.id,selected.studentId);
            if (!existing) matches.saveRoster({ id:`match-roster-${randomUUID()}`,clubId:input.clubId,matchId:match.id,studentId:selected.studentId,teamId:event.primaryTeamId!,started:false,createdAt:now,updatedAt:now });
          }
          if (ended && event.type === "training") {
            const records = new SqliteTrainingRecordRepository(this.database), current = records.get(input.clubId,event.id,selected.studentId);
            correctTrainingRecord(records,{clubId:input.clubId,eventId:event.id,studentId:selected.studentId},{expectedRevision:current?.revision??0,counted:selected.participated!,reason:"课后补加临时球员",actorUserId:input.actorUserId,actorDisplayName:input.actorName,initialOccurredAt:event.timeRange.startsAt},now);
          }
        } else {
          if (!old) throw new ScoutError(400,"not_temporary_player","仅可从此入口移出临时球员");
          if (!old.active) continue;
          if (ended || (participant && !["invited","confirmed"].includes(String(participant.status))) || this.hasFacts(input.clubId,event.id,selected.studentId,match?.id)) throw new ScoutError(409,"participant_has_facts","已有活动记录，请通过记录更正保留历史");
        }
        const revision = (old?.revision??0)+1;
        const history = [...(old?.history??[]), { revision,action:input.action,actorUserId:input.actorUserId,actorName:input.actorName,changedAt:now,...(ended&&input.action==="add"?{participated:selected.participated}:{}),note:input.note?.trim()||"" }];
        this.database.prepare("INSERT INTO temporary_event_participants(club_id,event_id,student_id,active,revision,history_json) VALUES (?,?,?,?,?,?) ON CONFLICT(club_id,event_id,student_id) DO UPDATE SET active=excluded.active,revision=excluded.revision,history_json=excluded.history_json").run(input.clubId,event.id,selected.studentId,input.action==="add"?1:0,revision,JSON.stringify(history));
      }
      return this.get(input.clubId,event.id);
    });
  }
  private hasFacts(clubId:string,eventId:string,studentId:string,matchId?:string) {
    for (const table of ["training_records","training_content_assessments","player_assessments"]) {
      if (this.database.prepare(`SELECT 1 FROM ${table} WHERE club_id=? AND event_id=? AND student_id=? LIMIT 1`).get(clubId,eventId,studentId)) return true;
    }
    if (this.database.prepare("SELECT 1 FROM assessment_raw_results r JOIN player_assessments a ON a.id=r.assessment_id AND a.club_id=r.club_id WHERE r.club_id=? AND r.event_id=? AND a.student_id=? LIMIT 1").get(clubId,eventId,studentId)) return true;
    if (this.database.prepare("SELECT 1 FROM assessment_tasks WHERE club_id=? AND source_event_id=? AND EXISTS(SELECT 1 FROM json_each(COALESCE(student_ids_json,'[]')) WHERE value=?)").get(clubId,eventId,studentId)) return true;
    return Boolean(matchId && (this.database.prepare("SELECT 1 FROM match_events WHERE club_id=? AND match_id=? AND student_id=? LIMIT 1").get(clubId,matchId,studentId) || this.database.prepare("SELECT 1 FROM match_rosters WHERE club_id=? AND match_id=? AND student_id=? AND (started=1 OR minutes_played>0)").get(clubId,matchId,studentId)));
  }
}
