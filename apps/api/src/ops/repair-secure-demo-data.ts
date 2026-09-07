import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { createSecureCqTalentTestAccountManifest } from "./secure-cq-talent-test-accounts.js";
import { rebuildDemoAssessmentHistory } from "./repair-demo-assessments.js";

type EventRow = { id: string; type: string; title: string; starts_at: string; ends_at: string; status: string };
const club = "club-chongqing-talent";
const dayMs = 86400000;
const dateCN = (iso: string) => new Date(Date.parse(iso) + 8 * 3600000).toISOString().slice(0, 10);

/** Explicit customer-test reset only. Never call from seed, startup or an API route. */
export function repairSecureDemoData(db: DatabaseSync, input: { now: string; backupAttested: boolean }) {
  if (!input.backupAttested) throw new Error("Verified backup required before demo reset");
  const instant = Date.parse(input.now);
  if (!Number.isFinite(instant)) throw new Error("Invalid repair date");
  const now = new Date(instant).toISOString();
  const manifest = createSecureCqTalentTestAccountManifest();
  const monday = new Date(dateCN(now) + "T00:00:00Z");
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  const days = Array.from({ length: 21 }, (_, i) => new Date(+monday + i * dayMs).toISOString().slice(0, 10));
  const run = (sql: string, ...values: SQLInputValue[]) => db.prepare(sql).run(...values);
  const slots: Array<{ slot: number; coveredDays: number; minimumBalance: number; attendanceMismatches: number }> = [];
  db.exec("BEGIN IMMEDIATE");
  try {
    // Temporary maintenance indexes avoid quadratic FK cascade scans during reset.
    // They are created and dropped in this same transaction, not schema migrations.
    const maintenanceIndexes = [
      ["metric_lineages", "output_record_id"], ["player_metric_records", "assessment_id"],
      ["player_metric_records", "raw_result_id"], ["assessment_scores", "assessment_id"],
      ["assessment_scores", "raw_result_id"], ["assessment_raw_results", "assessment_id"],
    ] as const;
    for (const [table, column] of maintenanceIndexes) db.exec(`CREATE INDEX customer_repair_${table}_${column} ON ${table}(${column})`);
    for (const a of manifest.accountIds) {
      const identity = db.prepare("SELECT id FROM user_accounts WHERE id=? AND status='active' AND roles_json=?").get(a.userId, '["parent","coach"]');
      const members = db.prepare("SELECT student_id FROM team_members WHERE club_id=? AND team_id=? AND status='active'").all(club, a.teamId) as { student_id: string }[];
      if (!identity || members.length !== 19 || members.some(m => !a.studentIds.includes(m.student_id))) throw new Error(`Unexpected identity/roster in slot ${a.slot}`);
      const catalog = db.prepare("SELECT blocks_json FROM session_plans WHERE id='session-plan-cq-talent-elite-training-library-sample'").get() as { blocks_json: string } | undefined;
      if (!catalog) throw new Error("Training source catalog missing");
      const blocks = (JSON.parse(catalog.blocks_json) as { id: string; drillId: string; order: number; plannedMinutes: number }[]).slice(0, 8);
      const planId = `customer-session-plan-${a.slot}`;
      const boardTemplate = db.prepare("SELECT b.players_json FROM tactical_boards b JOIN calendar_events e ON e.id=b.event_id AND e.club_id=b.club_id WHERE e.club_id=? AND e.primary_team_id=? AND json_array_length(b.players_json)=19 LIMIT 1").get(club,a.teamId) as {players_json:string}|undefined;
      if (!boardTemplate) throw new Error(`Nineteen-player tactical source missing in slot ${a.slot}`);
      run(`INSERT INTO session_plans(id,catalog_scope,catalog_club_id,name,objective_ids_json,metric_ids_json,blocks_json,estimated_minutes,created_at,updated_at)
        VALUES(?,'club',?,?,'[]','[]',?,80,?,?) ON CONFLICT(id) DO UPDATE SET blocks_json=excluded.blocks_json,updated_at=excluded.updated_at`, planId, club, "基础技术与配合训练", JSON.stringify(blocks), now, now);
      const events = () => db.prepare("SELECT id,type,title,starts_at,ends_at,status FROM calendar_events WHERE club_id=? AND primary_team_id=? ORDER BY starts_at,id").all(club, a.teamId) as EventRow[];
      // Date-keyed additions are never moved on a subsequent repair.
      for (const [dayIndex, day] of days.entries()) {
        if (events().some(e => e.status !== "cancelled" && dateCN(e.starts_at) === day)) continue;
        const id = `${a.eventId}-customer-${day}`;
        const type = dayIndex % 7 === 5 ? "match" : "training";
        const titles = ["控球与变向训练", "短传接应训练", "协调与灵敏训练", "射门终结训练", "小组攻防训练", "周末交流比赛", "技术巩固训练"];
        const start = `${day}T${String(1 + Math.floor((a.slot - 1) / 3) * 3).padStart(2, "0")}:00:00.000Z`;
        const end = new Date(Date.parse(start) + 90 * 60000).toISOString();
        run(`INSERT INTO calendar_events (id,club_id,type,title,starts_at,ends_at,timezone,location_id,primary_team_id,owner_coach_id,status,notes,created_at,updated_at)
          VALUES (?,?,?,?,?,?,'Asia/Shanghai',?,?,?,'scheduled',?,?,?)`, id, club, type, titles[dayIndex % 7]!, start, end,
          ["venue-cq-talent-jiulongpo", "venue-cq-talent-sport-uni", "venue-cq-talent-nanan"][(a.slot - 1) % 3]!, a.teamId, a.coachId,
          "分组热身、专项练习、对抗应用和放松总结。", now, now);
      }
      const perDay = new Map<string, number>();
      for (const [eventIndex, e] of events().entries()) {
        if (e.status === "cancelled") continue;
        const day = dateCN(e.starts_at);
        const order = perDay.get(day) ?? 0;
        perDay.set(day, order + 1);
        e.starts_at = `${day}T${String(1 + Math.floor((a.slot - 1) / 3) * 3 + order * 2).padStart(2, "0")}:00:00.000Z`;
        e.ends_at = new Date(Date.parse(e.starts_at) + 90 * 60000).toISOString();
        const ended = Date.parse(e.ends_at) <= instant;
        // Calendar storage has scheduled/completed/cancelled; live progress is a UI projection.
        const status = ended ? "completed" : "scheduled";
        run("UPDATE calendar_events SET status=?,starts_at=?,ends_at=?,location_id=?, updated_at=? WHERE club_id=? AND id=?", status, e.starts_at, e.ends_at,
          ["venue-cq-talent-jiulongpo", "venue-cq-talent-sport-uni", "venue-cq-talent-nanan"][(a.slot - 1) % 3]!, now, club, e.id);
        for (const [i, student] of a.studentIds.entries()) {
          const old = db.prepare("SELECT id,status FROM event_participants WHERE club_id=? AND event_id=? AND student_id=?").get(club, e.id, student) as { id: string; status: string } | undefined;
          const finalStatus = !ended ? "confirmed" : old && ["present", "late", "absent", "leave_approved"].includes(old.status) ? old.status === "late" ? "present" : old.status : (i > 1 && (i + eventIndex) % 13 === 0 ? "absent" : "present");
          if (old) run("UPDATE event_participants SET status=?,note=?,updated_at=? WHERE club_id=? AND id=?", finalStatus, ended ? finalStatus === "absent" ? "本次未到场" : "教练已核对出勤" : "等待课程开始后点名", now, club, old.id);
          else run("INSERT INTO event_participants(id,club_id,event_id,student_id,status,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", `customer-participant-${e.id}-${i}`, club, e.id, student, finalStatus, ended ? "教练已核对出勤" : "已安排课程", now, now);
        }
        if (e.type === "training") {
          const sessionId = (db.prepare("SELECT id FROM training_sessions WHERE club_id=? AND event_id=?").get(club, e.id) as { id: string } | undefined)?.id ?? `customer-session-${e.id}`;
          run(`INSERT INTO training_sessions(id,club_id,event_id,kind,session_plan_id,intensity,created_at,updated_at) VALUES(?,?,?,'team',?,'medium',?,?)
            ON CONFLICT(id) DO UPDATE SET session_plan_id=excluded.session_plan_id,updated_at=excluded.updated_at`, sessionId, club, e.id, planId, now, now);
          run("DELETE FROM training_content_assessments WHERE club_id=? AND event_id=?", club, e.id);
          if (ended) for (const [i, student] of a.studentIds.entries()) {
            const p = db.prepare("SELECT status FROM event_participants WHERE club_id=? AND event_id=? AND student_id=?").get(club, e.id, student) as { status: string };
            if (p.status !== "present") continue;
            for (const [j, block] of blocks.entries()) run(`INSERT INTO training_content_assessments(id,club_id,event_id,student_id,training_project_id,score,note,assessed_by_coach_id,assessed_at,created_at,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?)`, `customer-training-score-${e.id}-${i}-${j}`, club, e.id, student, block.drillId,
              65 + (a.slot * 3 + i * 7 + j * 3 + eventIndex) % 26, j % 2 ? "配合意识较好，继续提高动作稳定性" : "基本动作完成良好，继续加强弱侧练习", a.coachId, e.ends_at, e.ends_at, now);
          }
        }
        if (e.type === "match") {
          let match = db.prepare("SELECT id FROM matches WHERE club_id=? AND event_id=?").get(club, e.id) as { id: string } | undefined;
          if (!match) {
            match = { id: `customer-match-${e.id}` };
            run("INSERT INTO matches(id,club_id,event_id,match_type,opponent_name,status,created_at,updated_at) VALUES(?,?,?,'friendly',?,?,?,?)", match.id, club, e.id, ["山城少年队", "两江青训队", "南岸足球队"][a.slot % 3]!, status, now, now);
          }
          // Explicit reset replaces inconsistent goals and their metric projections together.
          run("DELETE FROM player_metric_records WHERE club_id=? AND event_id=? AND source='match_event'", club, e.id);
          run("DELETE FROM match_events WHERE club_id=? AND match_id=?", club, match.id);
          run("UPDATE matches SET status=?,home_score=?,away_score=?,updated_at=? WHERE club_id=? AND id=?", status, ended ? 2 : null, ended ? 1 : null, now, club, match.id);
          for (const [i, student] of a.studentIds.entries()) {
            const rosterId = (db.prepare("SELECT id FROM match_rosters WHERE club_id=? AND match_id=? AND student_id=?").get(club, match.id, student) as { id: string } | undefined)?.id ?? `customer-roster-${match.id}-${i}`;
            run(`INSERT INTO match_rosters(id,club_id,match_id,student_id,team_id,started,minutes_played,position,created_at,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET started=excluded.started,minutes_played=excluded.minutes_played,position=excluded.position,updated_at=excluded.updated_at`,
              rosterId, club, match.id, student, a.teamId, i < 11 ? 1 : 0, ended && i < 11 ? 60 : 0, i === 0 ? "GK" : i < 5 ? "DF" : i < 8 ? "MF" : "FW", now, now);
          }
          if (ended) {
            const details = [["goal", 1, 12, "接应传球后射门得分"], ["assist", 2, 12, "横传助攻队友得分"], ["own_goal", 3, 26, "解围碰入本方球门，对方得分"], ["foul", 4, 32, "回防过程中犯规"], ["goal", 5, 48, "反击中推射得分"], ["assist", 1, 48, "直塞助攻队友得分"]] as const;
            for (const [j, d] of details.entries()) run("INSERT INTO match_events(id,club_id,match_id,type,student_id,minute,note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", `customer-event-${match.id}-${j}`, club, match.id, d[0], a.studentIds[d[1]]!, d[2], d[3], e.ends_at, e.ends_at);
          }
          const boardId = (db.prepare("SELECT id FROM tactical_boards WHERE club_id=? AND event_id=?").get(club,e.id) as {id:string}|undefined)?.id ?? `customer-board-${e.id}`;
          run(`INSERT INTO tactical_boards(id,club_id,event_id,formation_name,pitch_type,players_json,updated_by_coach_id,created_at,updated_at) VALUES(?,?,?,'4-3-3','full',?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET players_json=excluded.players_json,formation_name=excluded.formation_name,updated_at=excluded.updated_at`, boardId,club,e.id,boardTemplate.players_json,a.coachId,now,now);
        }
      }
      // The user explicitly authorized replacing test-only financial histories.
      // No runtime account/session/phone fields are changed here.
      let minimumBalance = Infinity;
      for (const [i, student] of a.studentIds.entries()) {
        const attendance = db.prepare(`SELECT e.id,e.title,e.ends_at FROM event_participants p JOIN calendar_events e ON e.id=p.event_id AND e.club_id=p.club_id
          WHERE p.club_id=? AND p.student_id=? AND e.primary_team_id=? AND e.type='training' AND e.status='completed' AND p.status IN ('present','late') ORDER BY e.ends_at,e.id`).all(club, student, a.teamId) as { id: string; title: string; ends_at: string }[];
        const opening = Math.max(48 + (i % 3) * 12, Math.ceil((attendance.length + 12) / 12) * 12);
        run("DELETE FROM lesson_credit_ledger WHERE club_id=? AND student_id=?", club, student);
        const openedAt = new Date(Math.min(instant - 60 * dayMs, ...attendance.map(e => Date.parse(e.ends_at) - dayMs))).toISOString();
        run(`INSERT INTO lesson_credit_ledger(id,club_id,student_id,team_id,occurred_at,entry_type,lesson_delta,balance_after,source,source_id,actor_user_id,note,created_at,updated_at)
          VALUES(?,?,?,?,?,'credit',?,?,'secure_demo',?,?,?, ?,?)`, `customer-credit-${student}`, club, student, a.teamId, openedAt, opening, opening, `customer-credit-${student}`, a.userId, "学期课时包充值", openedAt, now);
        for (const [j, e] of attendance.entries()) run(`INSERT INTO lesson_credit_ledger(id,club_id,student_id,team_id,event_id,occurred_at,entry_type,lesson_delta,balance_after,source,source_id,actor_user_id,note,created_at,updated_at)
          VALUES(?,?,?,?,?,?,'debit',-1,?,'attendance',?,?,?,?,?)`, `customer-debit-${e.id}-${student}`, club, student, a.teamId, e.id, e.ends_at, opening - j - 1, `${e.id}-${student}`, a.userId, `${e.title}：到场扣除一课时`, e.ends_at, now);
        const balance = opening - attendance.length;
        minimumBalance = Math.min(minimumBalance, balance);
        run("INSERT INTO student_operational_profiles(id,club_id,student_id,student_status,responsible_coach_id,region,notes,created_at,updated_at) VALUES(?,?,?,'active',?,'重庆','训练成长档案',?,?) ON CONFLICT(club_id,student_id) DO NOTHING", `customer-profile-${student}`,club,student,a.coachId,now,now);
        run("UPDATE student_operational_profiles SET total_checkins=?,latest_checkin_at=?,total_recharges=1,lesson_balance=?,updated_at=? WHERE club_id=? AND student_id=?", attendance.length, attendance.at(-1)?.ends_at ?? null, balance, now, club, student);
        run("UPDATE private_lesson_requests SET date=?,note='根据近期训练表现安排专项提升',updated_at=? WHERE club_id=? AND student_id=? AND status='pending' AND date<?", days[7+i%7]!,now,club,student,dateCN(now));
      }
      rebuildDemoAssessmentHistory(db, a, monday, now);
      const coveredDays = days.slice(0, 14).filter(day => events().some(e => e.status !== "cancelled" && dateCN(e.starts_at) === day)).length;
      const mismatches = db.prepare(`SELECT COUNT(*) n FROM event_participants p JOIN calendar_events e ON e.id=p.event_id AND e.club_id=p.club_id
        WHERE p.club_id=? AND e.primary_team_id=? AND e.type='training' AND
        (SELECT COUNT(*) FROM lesson_credit_ledger l WHERE l.club_id=p.club_id AND l.event_id=p.event_id AND l.student_id=p.student_id AND l.lesson_delta=-1)
        <> CASE WHEN e.status='completed' AND p.status IN ('present','late') THEN 1 ELSE 0 END`).get(club,a.teamId) as {n:number};
      if (mismatches.n || coveredDays !== 14 || minimumBalance <= 4) throw new Error(`Consistency check failed in slot ${a.slot}`);
      slots.push({ slot: a.slot, coveredDays, minimumBalance, attendanceMismatches: mismatches.n });
    }
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Foreign key check failed; rolling back repair");
    for (const [table, column] of maintenanceIndexes) db.exec(`DROP INDEX customer_repair_${table}_${column}`);
    db.exec("COMMIT");
    return { repairedAt: now, slots };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
