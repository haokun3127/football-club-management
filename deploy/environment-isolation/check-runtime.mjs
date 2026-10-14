#!/usr/bin/env node
// Run inside the nonproduction container. Outputs booleans, never secrets or identities.
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const environment=process.env.FCM_RUNTIME_ENV;
if(!['develop','trial'].includes(environment)) throw new Error('Readiness inspection is limited to nonproduction');
const {readRuntimeConfig}=await import(pathToFileURL(resolve('apps/api/dist/runtime/environment.js')).href);
const config=readRuntimeConfig();
if(config.databasePath!==`/var/lib/cq-talent-${environment}/api.sqlite`) throw new Error('Unexpected nonproduction container database path');
if(!existsSync(config.databasePath)) throw new Error('Database missing');
const db=new DatabaseSync(config.databasePath,{readOnly:true});
try{
 const owned=db.prepare('SELECT environment FROM runtime_environment WHERE id = 1').get()?.environment===environment;
 if(!owned) throw new Error('Database environment mismatch');
 const client=db.prepare('SELECT club_id FROM club_app_clients WHERE client_key = ? AND app_id = ? AND status = ?').get('cq-talent-wechat-main',config.wechatAppId,'active');
 const roles=new Set();
 if(client){
  for(const row of db.prepare('SELECT m.roles_json FROM club_user_memberships m JOIN user_accounts u ON u.id=m.user_id WHERE m.club_id=? AND m.status=? AND u.status=?').all(client.club_id,'active','active')){
   for(const role of JSON.parse(row.roles_json)) roles.add(role);
  }
 }
 const checks={ownedDatabase:owned,debugIdentityDisabled:process.env.NODE_ENV==='production',clientRegistered:Boolean(client),wechatSecretConfigured:Boolean(process.env.WECHAT_MINIPROGRAM_APP_SECRET),parentIdentityConfigured:roles.has('parent'),coachIdentityConfigured:roles.has('coach'),adminIdentityConfigured:roles.has('admin')};
 const blockers=Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>key);
 console.log(JSON.stringify({environment,configurationReady:!blockers.length,realWechatLoginVerified:false,checks,blockers}));
 process.exitCode=blockers.length?1:0;
}finally{db.close();}
