// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const fixture = {
 profile: {
  student:{id:'s1',name:'林予安',age:10,school:'青训小学',dominantFoot:'right',level:null,teams:[{id:'team1',name:'U10 精英队',joinedAt:'2026-01-01'}]},
  attendance:{expected:26,present:24,absent:0,leave:2,late:1,unrecorded:0,effectiveLessons:24,earlyLeave:null},
  records:[{eventId:'e1',title:'U10 技术训练',occurredAt:'2026-09-12T08:00:00Z',status:'present',counted:true,source:'automatic',revision:1,history:[{revision:1,counted:true,source:'automatic',reason:'课程已结束，自动记录',changedAt:'2026-09-12T10:00:00Z'}]},
  {eventId:'e2',title:'U10 技术训练',occurredAt:'2026-09-10T08:00:00Z',status:'excused',counted:false,source:'correction',revision:2,history:[{revision:2,counted:false,source:'correction',reason:'已请假，修正本次记录',changedAt:'2026-09-12T10:00:00Z'}]}],
  training:{modules:[{label:'技术',courses:12,configuredMinutes:240},{label:'战术',courses:8,configuredMinutes:160},{label:'体能',courses:6,configuredMinutes:120}],participation:24,formalMatches:2,friendlyMatches:null,completionTargets:null}
 },
 latest:[], overall:null, modelName:'青训能力',confirmedResults:[]
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
  let page=await mp.reLaunch('/pages/coach/student-radar/index?student=s1');await page.waitFor(500);
  assert.equal(await page.data('state'),'ready');assert.equal(await page.data('section'),'summary');
  assert.equal((await page.$$('.profile-summary')).length,3);
  await mp.screenshot({path:out+'/c11-runtime-summary-20261004.png'});
  await (await page.$('[data-section="training"]')).tap();await page.waitFor(1500);page=await mp.currentPage();
  assert.equal(await page.data('section'),'training');assert.equal((await page.$$('.profile-course')).length,2);
  await mp.screenshot({path:out+'/c11-runtime-training-20261004.png'});
  await (await page.$$('.profile-course .profile-link'))[1].tap();await page.waitFor(100);assert.equal(await page.data('historyEventId'),'e2');
  assert.equal((await page.data('history'))[0].reason,'已请假，修正本次记录');
  await mp.navigateBack();page=await mp.currentPage();await page.waitFor(300);assert.equal(await page.data('section'),'summary');
  await (await page.$('[data-section="ability"]')).tap();await page.waitFor(1500);page=await mp.currentPage();assert.equal(await page.data('section'),'ability');
  await mp.screenshot({path:out+'/c11-runtime-ability-20261004.png'});
  await (await page.$('.profile-card .profile-link')).tap();await page.waitFor(1500);page=await mp.currentPage();assert.equal(page.path,'pages/coach/student-results/index');assert.equal(await page.data('state'),'empty');
  console.log(JSON.stringify({appId:account.appId,checks:['three summary drilldowns','same student training records','correction history','native back','confirmed results empty'],screenshots:3,scope:'synthetic local data only'}));
 } finally {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index'); await mp.disconnect();
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
