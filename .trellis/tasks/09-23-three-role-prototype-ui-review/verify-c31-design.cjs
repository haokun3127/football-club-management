// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const fixture = {
 profile: { student: { id: 's1', name: '林予安', teams: [{ id:'team1', name: 'U10 精英队' }] } },
 confirmedResults: [
 ...[['r3',4.28,'2026-09-12'],['r2',4.46,'2026-08-16'],['r1',4.62,'2026-07-18']].map(([id,seconds,date])=>({id,assessmentId:id,taskId:id,testItemId:'run',metricId:'speed',name:'20米跑',value:{kind:'duration_seconds',seconds},unit:'秒',templateVersionId:'v1',eventId:null,occurredAt:date+'T08:00:00Z',recordedAt:date+'T10:00:00Z'})),
 {id:'pass',assessmentId:'r3',taskId:'r3',testItemId:'pass',metricId:'pass',name:'传接球',value:{kind:'count',count:18},unit:'次',templateVersionId:'v1',eventId:null,occurredAt:'2026-09-12T08:00:00Z',recordedAt:'2026-09-12T10:00:00Z'}
 ]
};
(async () => {
 const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:' + resolveAutomationPort() }); let backed = false;
 try {
  const account = await mp.evaluate(() => wx.getAccountInfoSync().miniProgram);
  assert.equal(account.appId, 'wx4c588cd106e520e0'); assert.equal(account.envVersion, 'develop');
  await mp.evaluate((data) => {
   const store = require('utils/store.js'); const cfg = require('utils/config.js'); const keys = [cfg.STORAGE_KEYS.session, cfg.STORAGE_KEYS.context, cfg.STORAGE_KEYS.devRole]; const present = wx.getStorageInfoSync().keys;
   getApp().globalData.__recordBackup = { session: store.getSession(), context: store.getAppContext(), keys: keys.map(key => ({ key, present: present.includes(key), value: wx.getStorageSync(key) })) };
   getApp().globalData.__recordFixture = data;
   store.setSession({ clubId: 'club-chongqing-talent', clientId: 'app-client-cq-talent-wechat-main', role: 'coach', availableRoles: ['coach'], userId: 'visual-fixture', token: 'dev-visual-fixture', displayName: '界面验证', capabilities: {} });
  }, fixture); backed = true;
  await mp.mockWxMethod('request', function(opts) { return JSON.parse(JSON.stringify({statusCode:200,data:getApp().globalData.__recordFixture})); });
  let page=await mp.reLaunch('/pages/coach/student-results/index?student=s1&team=team1');await page.waitFor(500);
  assert.equal(await page.data('state'),'ready');assert.equal((await page.data('selected')).valueLabel,'4.28 秒');
  await mp.screenshot({path:out+'/c31-runtime-20261004.png'});
  await (await page.$('.results-alternative')).tap();await page.waitFor(150);assert.equal((await page.data('selected')).valueLabel,'18 次');
  await mp.screenshot({path:out+'/c31-runtime-alternative-20261004.png'});
  console.log(JSON.stringify({appId:account.appId,checks:['confirmed raw precision','same-version chart','project switch'],screenshots:2,scope:'synthetic local data only'}));
 } finally {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index'); await mp.disconnect();
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
