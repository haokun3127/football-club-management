// Synthetic local UI verification only; never sends business API requests.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const { resolveAutomationPort } = require(root + '/scripts/devtools/automation-session.cjs');
const automator = require(root + '/apps/miniprogram-cq-talent/node_modules/miniprogram-automator');
const out = __dirname + '/club-style-light-evidence';
const fixture={player:{id:'s1',name:'标准示例人员',birthDate:'1949-12-31',maskedDocument:'**************002X',status:'active',createdAt:'2026-10-05T00:00:00Z'},roster:{event:{id:'e1',title:'U10 技术训练',type:'training',endsAt:'2099-10-09T01:00:00Z',ended:false,cancelled:false},roster:{eventId:'e1',revision:'a'.repeat(64),participantIds:[],temporary:[]}}};
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
  await mp.mockWxMethod('request', function(opts) {
    const f=getApp().globalData.__recordFixture;
    let data;
    if(opts.url.endsWith('/temporary-roster')) {
     if(opts.method==='POST') {f.roster.roster.participantIds=[f.player.id];f.roster.roster.revision='b'.repeat(64);f.roster.roster.temporary=[{studentId:f.player.id,active:true,revision:1,history:[{action:'add',actorName:'陈教练',changedAt:'2026-10-09T07:00:00Z',note:''}]}];}
     data=f.roster;
    } else if(opts.method==='POST') data={created:false,player:f.player};
    else if(opts.url.endsWith('/s1')) data={player:f.player,participations:[]};
    else data={players:[f.player],total:1,nextOffset:null,canCreate:true};
    return JSON.parse(JSON.stringify({statusCode:200,data}));
  });
  let page=await mp.reLaunch('/pages/coach/scout/index?eventId=e1');await page.waitFor(800);
  assert.equal(await page.data('state'),'ready');assert.equal(await page.data('eventRoster.event.id'),'e1');
  await mp.screenshot({path:out+'/sc01-event-library-runtime-20261009.png'});
  await page.callMethod('openPlayer',{currentTarget:{dataset:{id:'s1'}}});await page.waitFor(400);
  assert.equal(await page.data('mode'),'detail');assert.equal(await page.data('included'),false);
  await mp.screenshot({path:out+'/sc01-event-profile-runtime-20261009.png'});
  await (await page.$('.scout-primary')).tap();await page.waitFor(1800);assert.equal(await page.data('included'),true);
  await mp.screenshot({path:out+'/sc01-event-added-runtime-20261009.png'});
  await (await page.$('.scout-back')).tap();await page.waitFor(400);assert.equal(await page.data('mode'),'list');
  console.log(JSON.stringify({appId:account.appId,checks:['event-scoped list','profile context retained','actual add button','matching roster readback','back to same event list'],screenshots:3,scope:'synthetic local data only'}));
 } finally {
  try {
  if (backed) await mp.evaluate(() => { const store = require('utils/store.js'); const b = getApp().globalData.__recordBackup; store.clearSession(); if (b.session) store.setSession(b.session); if (b.context) store.setAppContext(b.context); for (const item of b.keys) { if (item.present) wx.setStorageSync(item.key, item.value); else wx.removeStorageSync(item.key); } delete getApp().globalData.__recordBackup; delete getApp().globalData.__recordFixture; });
  await mp.restoreWxMethod('request'); await mp.reLaunch('/pages/login/index');
  } finally { await mp.disconnect(); }
 }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
