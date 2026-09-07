import { expect, it } from "vitest";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { importSecureCqTalentTestAccounts } from "../src/ops/secure-cq-talent-test-accounts.js";
import { repairSecureDemoData } from "../src/ops/repair-secure-demo-data.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
import { HeaderMembershipResolver } from "../src/auth/context.js";

it("never generates negative opening credits for a nineteen-player roster", async () => {
  const persistence = await createPlatformPersistence({ databasePath: ":memory:" });
  try {
    importSecureCqTalentTestAccounts(persistence.database, {
      phones: Array.from({ length: 7 }, (_, i) => `1000000000${i + 1}`),
      now: "2026-09-06T12:00:00.000Z",
    });
    expect(persistence.database.prepare("SELECT COUNT(*) n FROM lesson_credit_ledger WHERE entry_type='credit' AND lesson_delta <= 0").get()).toEqual({ n: 0 });
  } finally { persistence.database.close(); }
}, 20000);

it("keeps a Monday-morning import current without completing a future training", async () => {
  const p = await createPlatformPersistence({ databasePath: ":memory:" });
  const input = { phones: Array.from({length:7},(_,i)=>`1000000000${i+1}`), now:"2026-09-07T00:00:00.000Z" };
  try {
    importSecureCqTalentTestAccounts(p.database,input);
    expect(importSecureCqTalentTestAccounts(p.database,{...input,dryRun:true}).status).toBe('already_present');
  } finally { p.database.close(); }
},20000);

it("repairs seven scopes atomically with daily coverage and attendance-backed credits", async () => {
  const p = await createPlatformPersistence({ databasePath: ":memory:" });
  const now = "2026-09-06T12:00:00.000Z";
  try {
    importSecureCqTalentTestAccounts(p.database, { phones: Array.from({length:7},(_,i)=>`1000000000${i+1}`), now });
    expect(() => repairSecureDemoData(p.database, { now, backupAttested: false })).toThrow();
    const before = p.database.prepare("SELECT id,phone FROM user_accounts ORDER BY id").all();
    const report = repairSecureDemoData(p.database, { now, backupAttested: true });
    expect(report.slots).toHaveLength(7);
    expect(report.slots.every(s => s.coveredDays === 14 && s.minimumBalance > 4 && s.attendanceMismatches === 0)).toBe(true);
    expect(p.database.prepare("SELECT COUNT(*) n FROM player_assessments WHERE id LIKE 'customer-assessment-%'").get()).toEqual({n:266});
    expect(p.database.prepare("SELECT COUNT(*) n FROM assessment_tasks WHERE id LIKE 'customer-assessment-task-%'").get()).toEqual({n:21});
    const computedCount = p.database.prepare("SELECT COUNT(*) n FROM player_metric_records WHERE id LIKE 'customer-assessment-%' AND source='algorithm'").get() as {n:number};
    expect(computedCount.n).toBeGreaterThan(266 * 8);
    const rawCount = p.database.prepare("SELECT COUNT(*) n FROM assessment_raw_results WHERE assessment_id='customer-assessment-1-0-0'").get() as {n:number};
    expect(rawCount.n).toBeGreaterThan(8);
    const app = buildServer(new PersistentApiStore(p.repositories), { logger:false,
      membershipResolver:new HeaderMembershipResolver(p.repositories.users,p.repositories.memberships,null,{allowHeaderIdentity:true}) });
    try {
      const response = await app.inject({ method:'GET', url:'/clubs/club-chongqing-talent/app-clients/app-client-cq-talent-wechat-main/coach/assessment-tasks', headers:{'x-user-id':'user-cq-talent-secure-test-1'} });
      expect(response.statusCode).toBe(200);
      expect(response.json().tasks).toHaveLength(3);
      expect(response.json().tasks.every((task:{teamId:string}) => task.teamId==='team-cq-talent-secure-test-1')).toBe(true);
    } finally { await app.close(); }
    expect(p.database.prepare("SELECT id,phone FROM user_accounts ORDER BY id").all()).toEqual(before);
    expect(p.database.prepare(`SELECT COUNT(*) n FROM match_events v JOIN matches m ON m.id=v.match_id AND m.club_id=v.club_id WHERE m.status='scheduled'`).get()).toEqual({n:0});
    expect(p.database.prepare(`SELECT COUNT(*) n FROM lesson_credit_ledger l JOIN event_participants p ON p.club_id=l.club_id AND p.event_id=l.event_id AND p.student_id=l.student_id WHERE l.lesson_delta<0 AND p.status NOT IN ('present','late')`).get()).toEqual({n:0});
    expect(p.database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    expect(() => importSecureCqTalentTestAccounts(p.database, { phones: Array.from({length:7},(_,i)=>`1000000000${i+1}`), now })).toThrow("Customer-test baseline");
    expect(p.database.prepare(`SELECT COUNT(*) n FROM training_content_assessments t JOIN event_participants p ON p.club_id=t.club_id AND p.event_id=t.event_id AND p.student_id=t.student_id WHERE p.status<>'present'`).get()).toEqual({n:0});
    const ledger = p.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all();
    repairSecureDemoData(p.database, { now, backupAttested: true });
    expect(p.database.prepare("SELECT * FROM lesson_credit_ledger ORDER BY id").all()).toEqual(ledger);
  } finally { p.database.close(); }
}, 20000);
