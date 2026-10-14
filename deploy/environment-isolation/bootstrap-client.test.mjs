import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createPlatformPersistence } from '../../apps/api/dist/persistence/platform-persistence.js';
import { PersistentApiStore } from '../../apps/api/dist/store.js';
import { buildServer } from '../../apps/api/dist/server.js';
const root=resolve(import.meta.dirname,'../..');
const appId='wx4c588cd106e520e0';
const script=join(root,'deploy/environment-isolation/bootstrap-client.mjs');

test('nonproduction registration survives reopen, resolves the real AppID, and never seeds people or overwrites config', async()=>{
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'fcm-bootstrap-')));
 try {
  for (const environment of ['develop','trial']) {
   const config={environment,wechatAppId:appId,databasePath:join(dir,`cq-talent-${environment}`,'api.sqlite')};
   let p=await createPlatformPersistence({runtimeConfig:config,seed:false});p.database.close();
   const env={NODE_ENV:'production',FCM_RUNTIME_ENV:environment,WECHAT_MINIPROGRAM_APP_ID:appId,DATABASE_URL:config.databasePath};
   const run=()=>spawnSync(process.execPath,[script,'--apply'],{cwd:root,env,encoding:'utf8',timeout:10000});
   const first=run();assert.equal(first.status,0,first.stderr);
   p=await createPlatformPersistence({runtimeConfig:config,seed:false});
   const client=p.database.prepare('SELECT id FROM club_app_clients').get();
   p.database.prepare('UPDATE club_app_clients SET name = ? WHERE id = ?').run('retained local configuration',client.id);
   assert.equal(p.database.prepare('SELECT COUNT(*) AS n FROM user_accounts').get().n,0);
   assert.equal(p.database.prepare('SELECT COUNT(*) AS n FROM external_system_connections').get().n,0);
   p.database.close();
   const repeated=run();assert.equal(repeated.status,0,repeated.stderr);assert.equal(JSON.parse(repeated.stdout).status,'already_present');
   p=await createPlatformPersistence({runtimeConfig:config,seed:false});
   assert.equal(p.database.prepare('SELECT name FROM club_app_clients').get().name,'retained local configuration');
   const app=buildServer(new PersistentApiStore(p.repositories),{runtimeConfig:config,logger:false});
   try {
    const result=await app.inject({method:'GET',url:`/app-clients/resolve?appId=${appId}&clientKey=cq-talent-wechat-main`,headers:{'x-miniprogram-env':environment}});
    assert.equal(result.statusCode,200,result.body);assert.equal(result.json().clientId,client.id);
   } finally {await app.close();}
   p.database.prepare('UPDATE club_app_clients SET app_id = ?').run('wx0000000000000000');p.database.close();
   const conflict=run();assert.equal(conflict.status,1);assert.match(conflict.stderr,/Conflicting client/);
  }
  const path=join(dir,'release.sqlite');
  const release=spawnSync(process.execPath,[script,'--apply'],{cwd:root,env:{FCM_RUNTIME_ENV:'release',DATABASE_URL:path},encoding:'utf8'});
  assert.equal(release.status,1);assert.match(release.stderr,/forbidden/);assert.equal(existsSync(path),false);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
