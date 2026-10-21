// One-time, explicitly authorized develop-only recovery. Phone enters through stdin.
import { DatabaseSync, backup } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const mode = process.argv[2];
if (!['prepare', 'complete', 'apply', 'verify'].includes(mode)) throw Error('Expected prepare/apply/verify');
const root = '/app/apps/api/dist/';
const load = (p) => import(pathToFileURL(root + p).href);
const { readRuntimeConfig } = await load('runtime/environment.js');
const config = readRuntimeConfig();
if (config.environment !== 'develop' || config.databasePath !== '/var/lib/cq-talent-develop/api.sqlite') throw Error('Only canonical develop database is authorized');
const input = JSON.parse(readFileSync(0, 'utf8'));
if (!/^\d{11}$/.test(input.phone ?? '')) throw Error('Runtime reviewer phone required');
const club = 'club-chongqing-talent';
const identity = { user: 'user-cq-nonprod-reviewer', member: 'membership-cq-nonprod-reviewer', parent: 'parent-cq-nonprod-reviewer', coach: 'coach-cq-nonprod-reviewer' };
const directory = '/tmp/fcm-review-recovery-20261021';
const stagePath = directory + '/staged.sqlite';
const backupPath = '/var/lib/cq-talent-develop/review-before-20261021.sqlite';
const live = new DatabaseSync(config.databasePath, { readOnly: mode !== 'apply' });
function checkIdentity(db) {
  const users = db.prepare('SELECT id,roles_json,status FROM user_accounts WHERE phone=?').all(input.phone);
  if (users.length !== 1 || users[0].id !== identity.user || users[0].status !== 'active') throw Error('Reviewer phone does not match unique existing identity');
  const member = db.prepare('SELECT roles_json FROM club_user_memberships WHERE id=? AND club_id=? AND user_id=? AND status=?').get(identity.member, club, identity.user, 'active');
  if (!member || !['parent','coach','admin'].every(r => JSON.parse(member.roles_json).includes(r))) throw Error('Reviewer roles do not match');
  if (!db.prepare('SELECT id FROM parent_profiles WHERE id=? AND user_id=? AND phone=?').get(identity.parent,identity.user,input.phone)) throw Error('Parent identity mismatch');
  if (!db.prepare('SELECT id FROM coach_profiles WHERE id=? AND user_id=? AND club_id=?').get(identity.coach,identity.user,club)) throw Error('Coach identity mismatch');
}
checkIdentity(live);
const tables = (db) => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
const quote = (s) => '"'+s.replaceAll('"','""')+'"';
const pk = (db,t) => db.prepare(`PRAGMA table_info(${quote(t)})`).all().filter(c=>c.pk).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
const rows = (db,t) => db.prepare(`SELECT * FROM ${quote(t)}`).all();
const fingerprint = (db) => createHash('sha256').update(JSON.stringify(tables(db).map(t=>[t,rows(db,t)]))).digest('hex');
function integrity(db) {
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw Error('Database consistency check failed');
}
function emptyBusiness(db) {
  for (const t of ['student_profiles','teams','calendar_events','assessment_tasks','player_assessments','lesson_credit_ledger']) if(db.prepare(`SELECT count(*) n FROM ${t}`).get().n) throw Error('Existing business data: recovery refuses overwrite/repeat');
}
function summary(db) {
  return {roles:['parent','coach','admin'],users:db.prepare('SELECT count(*) n FROM user_accounts').get().n,students:db.prepare('SELECT count(*) n FROM student_profiles').get().n,children:db.prepare('SELECT count(*) n FROM student_guardian_bindings WHERE parent_id=?').get(identity.parent).n,teams:db.prepare('SELECT count(*) n FROM teams WHERE default_coach_id=?').get(identity.coach).n,events:db.prepare('SELECT count(*) n FROM calendar_events').get().n,tasks:db.prepare('SELECT count(*) n FROM assessment_tasks').get().n,workflowStates:db.prepare('SELECT count(*) n FROM assessment_workflow_students').get().n,metrics:db.prepare('SELECT count(*) n FROM player_metric_records').get().n,eventRange:db.prepare('SELECT min(starts_at) first,max(starts_at) last FROM calendar_events').get()};
}
async function completeStage(stage,now,baseline) {
      const {createPlatformRepositories}=await load('persistence/platform-persistence.js');
      const { PersistentApiStore } = await load('store.js');
      const { assessmentWorkflow } = await load('application/assessment-workflow.js');
      const store=new PersistentApiStore(createPlatformRepositories(stage));
      const workflow=assessmentWorkflow(store);
      const kids=stage.prepare('SELECT student_id FROM student_guardian_bindings WHERE parent_id=? ORDER BY student_id').all(identity.parent).map(r=>r.student_id);
      const courses=stage.prepare("SELECT id,starts_at FROM calendar_events WHERE primary_team_id=? AND type='training' AND status='completed' ORDER BY starts_at").all('team-cq-talent-secure-test-1');
      const date=(n)=>new Date(Date.parse(now)+n*86400000).toISOString().slice(0,10);
      const templateId='assessment-template-cq-talent-elite';
      if(!stage.prepare('SELECT id FROM assessment_templates WHERE id=?').get(templateId))throw Error('Assessment template missing');
      for(let round=0;round<2;round++) {
        const course=courses[Math.max(0,courses.length-2+round)];
        const task={id:'review-confirmed-20261021-'+round,clubId:club,teamId:'team-cq-talent-secure-test-1',termLabel:'2026年秋季审查样本',title:round?'阶段测评 · 已确认':'入队测评 · 已确认',templateId,startsOn:date(-60),dueOn:date(14),studentIds:kids};
        await store.saveAssessmentTask(task);
        const definition=await workflow.definition(task);
        const configData=await store.listAssessmentTestItems(club);
        for(const [i,student] of kids.entries()) {
          const entries=definition.bindings.map((b,j)=>{const item=configData.find(x=>x.id===b.testItemId);return {testItemId:b.testItemId,eventId:course.id,value:{kind:item.valueKind,score:item.valueKind==='rating_1_5'?3+(round?1:0):62+(j%17)+i*2+round*4}}});
          const saved=await workflow.save(task,student,identity.coach,{expectedRevision:0,entries});
          await workflow.publish(task,student,identity.coach,saved.revision);
        }
      }
      const task={id:'review-draft-20261021',clubId:club,teamId:'team-cq-talent-secure-test-1',termLabel:'2026年秋季审查样本',title:'本周能力测评 · 待录入与核对',templateId,startsOn:date(-21),dueOn:date(14),studentIds:stage.prepare('SELECT student_id FROM team_members WHERE team_id=?').all('team-cq-talent-secure-test-1').map(r=>r.student_id)};
      await store.saveAssessmentTask(task);
      const definition=await workflow.definition(task),source=courses.at(-1);
      await workflow.save(task,kids[0],identity.coach,{expectedRevision:0,entries:definition.bindings.slice(0,3).map((b,j)=>({testItemId:b.testItemId,eventId:source.id,value:{kind:'score_0_100',score:70+j}}))});
      createPlatformRepositories(stage).backofficeManagement.replaceGrants(club,identity.user,['sensitive','export','assessment','assessment_entry','service','finance']);
      checkIdentity(stage);integrity(stage);
      const result=summary(stage);
      if(result.users!==1||result.students!==19||result.children!==2||result.teams!==1||result.workflowStates!==5||stage.prepare('SELECT count(*) n FROM player_assessments').get().n<42)throw Error('Single-reviewer sample validation failed');
      writeFileSync(directory+'/manifest.json',JSON.stringify({baseline,backupPath,stagePath,now,summary:result}),{mode:0o600});
      console.log(JSON.stringify({mode,environment:'develop',backupVerified:true,...result}));
}

try {
  if(mode==='verify') { integrity(live); console.log(JSON.stringify({mode,environment:config.environment,...summary(live)})); }
  if(mode==='prepare') {
    emptyBusiness(live); integrity(live);
    if(existsSync(backupPath)||existsSync(stagePath)) throw Error('Existing recovery evidence; inspect before rerunning');
    mkdirSync(directory,{recursive:true,mode:0o700});
    await backup(live,backupPath);chmodSync(backupPath,0o600);
    const backed = new DatabaseSync(backupPath,{readOnly:true});integrity(backed);const baseline=fingerprint(backed);backed.close();
    copyFileSync(backupPath,stagePath);chmodSync(stagePath,0o600);
    const stage = new DatabaseSync(stagePath);stage.exec('PRAGMA foreign_keys=ON');
    try {
      const { createSeedData } = await load('seed.js');
      const { createCqTalentAcceptanceSeed } = await load('seed/cq-talent-acceptance.js');
      const { seedPlatformData, createPlatformRepositories } = await load('persistence/platform-persistence.js');
      const { importSecureCqTalentTestAccounts } = await load('ops/secure-cq-talent-test-accounts.js');
      const { repairSecureDemoData } = await load('ops/repair-secure-demo-data.js');
      const base=createSeedData(),extra=createCqTalentAcceptanceSeed();
      const catalogs=new Set(['featureFlags','policies','customFields','dimensions','objectives','metrics','drills','sessionPlans','metricGraphVersions','metricDependencies','metricViews','metricViewNodes','assessmentTemplates','assessmentTemplateVersions','assessmentMetricBindings','assessmentTestItems','derivedMetricDefinitions','contentArticles','contentFaqs','venues','privacyFieldPolicies','privacyNoticeVersions','privacyRetentionPolicies']);
      const data=Object.fromEntries(Object.entries(base).map(([key,value])=>{const seen=new Set();return[key,catalogs.has(key)?[...value,...(extra[key]??[])].filter(r=>!seen.has(r.id)&&seen.add(r.id)):[]]}));
      await seedPlatformData(createPlatformRepositories(stage),data);
      const now=new Date().toISOString();
      const generated=importSecureCqTalentTestAccounts(stage,{phones:Array.from({length:7},(_,i)=>'1999999900'+i),now});
      repairSecureDemoData(stage,{now,backupAttested:true});
      // Prune only the isolated staging file; no deletes are applied to the service database.
      const snapshots=tables(stage).map(t=>({table:t,keys:pk(stage,t),rows:rows(stage,t)}));
      const unwanted=new Set(),removed=new Set();
      let changed=true;
      while(changed) {
        changed=false;
        for(const s of snapshots) for(const [i,row] of s.rows.entries()) {
          const key=s.table+':'+i;if(removed.has(key))continue;
          if(Object.values(row).some(v=>typeof v==='string'&&(/cq-talent-secure-test-[2-7](?:-|$)/.test(v)||unwanted.has(v)))) {
            removed.add(key);if(typeof row.id==='string')unwanted.add(row.id);changed=true;
          }
        }
      }
      const slot=generated.manifest.accountIds[0];
      const remap=new Map([[slot.userId,identity.user],[slot.membershipId,identity.member],[slot.parentId,identity.parent],[slot.coachId,identity.coach]]);
      stage.exec('BEGIN IMMEDIATE; PRAGMA defer_foreign_keys=ON');
      try {
        const pendingDeletes=[];
        for(const s of snapshots) for(const [i,row] of s.rows.entries()) {
          const owned=remap.has(row.id),deleted=removed.has(s.table+':'+i);
          if(deleted||owned) {
            if(!s.keys.length)throw Error('Missing primary key for removal');
            pendingDeletes.push({s,row});
          } else {
            const updates=Object.entries(row).filter(([k,v])=>remap.has(v));
            if(updates.length)stage.prepare(`UPDATE ${quote(s.table)} SET ${updates.map(([k])=>quote(k)+'=?').join(',')} WHERE ${s.keys.map(k=>quote(k)+'=?').join(' AND ')}`).run(...updates.map(([,v])=>remap.get(v)),...s.keys.map(k=>row[k]));
          }
        }
        for(const {s,row} of pendingDeletes) stage.prepare(`DELETE FROM ${quote(s.table)} WHERE ${s.keys.map(k=>quote(k)+'=?').join(' AND ')}`).run(...s.keys.map(k=>row[k]));
        stage.exec('COMMIT');
      } catch(e){stage.exec('ROLLBACK');throw e;}
      // Contacts remain synthetic test data but should point to the authorized reviewer phone.
      stage.prepare('UPDATE student_contacts SET phone=? WHERE student_id IN (SELECT student_id FROM student_guardian_bindings WHERE parent_id=?)').run(input.phone,identity.parent);
      await completeStage(stage,now,baseline);
    } finally { stage.close(); }
  }
  if(mode==='complete') {
    const original=new DatabaseSync(backupPath,{readOnly:true});
    const baseline=fingerprint(original);integrity(original);original.close();
    const stage=new DatabaseSync(stagePath);stage.exec('PRAGMA foreign_keys=ON');
    try {
      checkIdentity(stage);integrity(stage);
      const s=summary(stage);
      if(s.users!==1||s.students!==19||![0,2].includes(s.children)||s.workflowStates!==0)throw Error('Resume requires verified single-scope staging data before workflow creation');
      const now=new Date().toISOString();
      if(s.children===0) {
        for(let i=1;i<=2;i++)stage.prepare('INSERT INTO student_guardian_bindings (id,club_id,student_id,parent_id,relationship,is_primary_contact,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('guardian-cq-talent-secure-test-1-'+i,club,'student-cq-talent-secure-test-1-'+i,identity.parent,'guardian',1,now,now);
        stage.prepare('UPDATE student_contacts SET phone=? WHERE student_id IN (SELECT student_id FROM student_guardian_bindings WHERE parent_id=?)').run(input.phone,identity.parent);
      }
      // Repair the first staging attempt only; the fixed prepare remaps references before deleting generated profiles.
      if(!stage.prepare('SELECT count(*) n FROM player_assessments').get().n) {
        const {createSecureCqTalentTestAccountManifest}=await load('ops/secure-cq-talent-test-accounts.js');
        const {rebuildDemoAssessmentHistory}=await load('ops/repair-demo-assessments.js');
        const account={...createSecureCqTalentTestAccountManifest().accountIds[0],userId:identity.user,membershipId:identity.member,parentId:identity.parent,coachId:identity.coach};
        const monday=new Date(new Date(Date.parse(now)+8*3600000).toISOString().slice(0,10)+'T00:00:00Z');
        monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
        stage.exec('BEGIN IMMEDIATE');
        try{rebuildDemoAssessmentHistory(stage,account,monday,now);stage.exec('COMMIT');}catch(e){stage.exec('ROLLBACK');throw e;}
      }
      await completeStage(stage,now,baseline);
    } finally {stage.close();}
  }
  if(mode==='apply') {
    emptyBusiness(live);
    const manifest=JSON.parse(readFileSync(directory+'/manifest.json','utf8'));
    const stage=new DatabaseSync(stagePath,{readOnly:true});
    try {
      integrity(stage);checkIdentity(stage);
      const original=new DatabaseSync(backupPath,{readOnly:true});
      try {
        // Compare all pre-existing rows inside the write transaction. New login sessions are preserved.
        live.exec('BEGIN IMMEDIATE; PRAGMA defer_foreign_keys=ON');
        for(const t of tables(live)) {
          const keys=pk(live,t);if(!keys.length)continue;
          const oldRows=rows(original,t),liveRows=rows(live,t),stageRows=rows(stage,t);
          const key=r=>JSON.stringify(keys.map(k=>r[k]));
          const oldByKey=new Map(oldRows.map(r=>[key(r),r]));
          const liveByKey=new Map(liveRows.map(r=>[key(r),r]));
          for(const row of oldRows) {
            const actual=liveByKey.get(key(row));
            if(JSON.stringify(actual)!==JSON.stringify(row)&&!['app_client_sessions','backoffice_sessions','backoffice_login_attempts','wechat_login_attempts','http_idempotency'].includes(t))throw Error('Pre-existing row changed: '+t);
          }
          for(const row of stageRows) {
            if(oldByKey.has(key(row)))continue;
            if(liveByKey.has(key(row)))throw Error('New row conflict: '+t);
            const columns=Object.keys(row);
            live.prepare(`INSERT INTO ${quote(t)} (${columns.map(quote).join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...columns.map(k=>row[k]));
          }
        }
        integrity(live);checkIdentity(live);live.exec('COMMIT');
        console.log(JSON.stringify({mode,environment:'develop',...summary(live)}));
      } catch(e) {if(live.isTransaction)live.exec('ROLLBACK');throw e;} finally {original.close();}
    } finally {stage.close();}
  }
} finally {live.close();}
